-- ============================================================================
--  AOOOKULELE & CO. — เปลี่ยน "อันดับสุดท้าย" เป็น "บูบี้"
-- ----------------------------------------------------------------------------
--  เจ้าของเว็บตัดสินแล้วว่ารางวัลท้ายกระดานให้คนที่ได้ที่รองสุดท้าย ไม่ใช่ที่โหล่
--  เพราะที่โหล่มักเป็นคนที่ไม่ได้เล่นจริง ส่วนรองสุดท้ายคือคนที่สู้แล้วแต่ยังไม่พอ
--
--  บูบี้คิดจาก "ค่าที่ต่างกัน" ไม่ใช่จากจำนวนคน
--    ระยะ 50, 20, 5, 5  ->  ที่โหล่คือสองคนที่ได้ 5  ->  บูบี้คือคนที่ได้ 20
--  ถ้าค่าที่ต่างกันมีไม่ถึงสองค่า แปลว่ายังไม่มีบูบี้
--
--  สารบัญ
--    1. เปลี่ยนชื่อคอลัมน์ is_last เป็น is_booby
--    2. เปลี่ยน check constraint ให้รับ 1–10 กับบูบี้
--    3. trigger guard_prize_write()
--    4. round_prizes() คืนคอลัมน์ชื่อใหม่
--    5. create_prize() / update_prize()
--    6. ปิดสิทธิ์ตามกฎในโปรเจกต์
--
--  หมายเหตุ ตัวเลือก "อันดับสุดท้าย" หายไปจากหน้าเว็บด้วย ตั้งใหม่ไม่ได้แล้ว
--  ของเดิมที่ตั้งไว้เป็นอันดับสุดท้ายจะกลายเป็นบูบี้ทั้งหมด ไม่มีแถวไหนถูกลบ
-- ============================================================================


-- ============================================================================
--  1. เปลี่ยนชื่อคอลัมน์
-- ----------------------------------------------------------------------------
--  เปลี่ยนชื่อ ไม่ได้เพิ่มคอลัมน์ใหม่ เพราะความหมายเปลี่ยนไปทั้งดุ้น
--  ถ้าปล่อยชื่อ is_last ไว้ คนอ่านโค้ดปีหน้าจะเข้าใจผิดทันที
--
--  ค่าของทุกแถวติดไปกับชื่อใหม่เอง แถวที่เคย is_last = true จึงกลายเป็น
--  is_booby = true โดยไม่ต้องสั่ง update อะไรเลย และไม่มีข้อมูลหาย
--
--  ห่อไว้ใน do block เพราะ alter ... rename column ไม่มี if exists ในตัว
--  ถ้ารันซ้ำจะฟ้อง ทั้งที่งานทำไปแล้ว
-- ============================================================================

do $$
begin
  if exists (
       select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'prizes'
          and column_name = 'is_last'
     )
     and not exists (
       select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'prizes'
          and column_name = 'is_booby'
     )
  then
    alter table public.prizes rename column is_last to is_booby;
  end if;
end;
$$;

comment on column public.prizes.is_booby is
  'true = รางวัลบูบี้ ให้คนที่มีค่าน้อยเป็นอันดับสองในบรรดาคนที่อยู่ในเกม '
  'คู่กับ rank_no ที่ต้องเป็น null เมื่อเป็นบูบี้';

-- บอกไว้ใน log ของการ deploy ว่าแปลงไปกี่แถว
do $$
declare
  moved int;
begin
  select count(*) into moved from public.prizes where is_booby;
  raise notice 'รางวัลที่เคยเป็นอันดับสุดท้าย และกลายเป็นบูบี้: % แถว', moved;
end;
$$;


-- ============================================================================
--  2. check constraint
-- ----------------------------------------------------------------------------
--  รูปร่างเหมือนเดิมทุกอย่าง เปลี่ยนแค่ชื่อคอลัมน์ ของเดิมจึงผ่านการตรวจหมด
--  ไม่ต้องใช้ not valid เพราะไม่มีแถวไหนผิดกติกาใหม่อยู่แล้ว
-- ============================================================================

alter table public.prizes drop constraint if exists prizes_rank_shape;
alter table public.prizes drop constraint if exists prizes_slot_shape;

alter table public.prizes add constraint prizes_slot_shape check (
  (is_booby = true  and rank_no is null)
  or
  (is_booby = false and rank_no between 1 and 10)
);


-- ============================================================================
--  3. trigger บังคับกติกา
-- ----------------------------------------------------------------------------
--  เหมือนเดิมทั้งก้อน เปลี่ยนแค่ is_last เป็น is_booby ในชุดคอลัมน์ที่ห้ามแก้
--  หลังพ้น 24 ชั่วโมง
-- ============================================================================

create or replace function public.guard_prize_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rd public.rounds;
begin
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    select * into rd from public.rounds where id = new.round_id;
    if rd.id is null then
      raise exception 'ไม่เจอรอบเดือนนี้' using errcode = '42501';
    end if;
    if rd.month <> public.current_month_bkk() then
      raise exception 'ตั้งรางวัลได้เฉพาะรอบเดือนปัจจุบันเท่านั้น'
        using errcode = '42501';
    end if;
    if new.sponsor_id is distinct from (select auth.uid()) then
      raise exception 'ตั้งรางวัลในนามคนอื่นไม่ได้' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- ย้ายเจ้าของหรือย้ายรอบไม่ได้ ไม่ว่าใคร
    new.sponsor_id := old.sponsor_id;
    new.round_id   := old.round_id;
    new.created_at := old.created_at;

    -- เปิดแล้วปิดกลับไม่ได้
    if old.is_hidden = false and new.is_hidden = true then
      raise exception 'เปิดให้คนอื่นเห็นแล้ว ปิดกลับไม่ได้'
        using errcode = '42501';
    end if;
    if old.revealed_at is not null and new.revealed_at is null then
      raise exception 'เปิดให้คนอื่นเห็นแล้ว ปิดกลับไม่ได้'
        using errcode = '42501';
    end if;

    if old.sponsor_id is distinct from (select auth.uid()) then
      raise exception 'แก้รางวัลของคนอื่นไม่ได้' using errcode = '42501';
    end if;

    -- กดเปิดเผยทำได้ตลอด ส่วนการแก้เนื้อหาทำได้แค่ภายใน 24 ชั่วโมง
    if (new.title, new.detail, new.image_path,
        new.board, new.rank_no, new.is_booby)
       is distinct from
       (old.title, old.detail, old.image_path,
        old.board, old.rank_no, old.is_booby)
    then
      if old.created_at < now() - interval '24 hours' then
        raise exception 'เกิน 24 ชั่วโมงหลังตั้งรางวัลแล้ว แก้ไม่ได้'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  -- DELETE
  if public.current_user_is_admin() then
    return old;
  end if;
  if old.sponsor_id is distinct from (select auth.uid()) then
    raise exception 'ลบรางวัลของคนอื่นไม่ได้' using errcode = '42501';
  end if;
  if old.created_at < now() - interval '24 hours' then
    raise exception 'เกิน 24 ชั่วโมงหลังตั้งรางวัลแล้ว ถอนไม่ได้'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists prizes_guard on public.prizes;
create trigger prizes_guard
  before insert or update or delete on public.prizes
  for each row execute function public.guard_prize_write();


-- ============================================================================
--  4. round_prizes() — คืนคอลัมน์ is_booby แทน is_last
-- ----------------------------------------------------------------------------
--  ชื่อคอลัมน์ที่คืนเปลี่ยน แปลว่า return type เปลี่ยน ต้อง drop ก่อน create
--  create or replace ทำไม่ได้
--
--  การเรียงยังเหมือนเดิม กระดานระยะรวมก่อน แล้วเรียงอันดับ 1 ถึง 10
--  บูบี้อยู่ท้ายสุดของแต่ละกระดาน เพราะ false เรียงมาก่อน true
-- ============================================================================

drop function if exists public.round_prizes(date);

create function public.round_prizes(target_month date default null)
returns table (
  prize_id           uuid,
  board              text,
  rank_no            int,
  is_booby           boolean,
  title              text,
  detail             text,
  image_path         text,
  is_secret          boolean,
  is_mine            boolean,
  revealed_at        timestamptz,
  created_at         timestamptz,
  sponsor_id         uuid,
  sponsor_nickname   text,
  sponsor_avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  picked as (
    select coalesce(target_month, public.current_month_bkk()) as month
  )
  select p.id,
         p.board,
         p.rank_no,
         p.is_booby,
         case when public.prize_is_secret(p.is_hidden, p.revealed_at, rd.month)
                   and p.sponsor_id <> me.id
              then null else p.title end,
         case when public.prize_is_secret(p.is_hidden, p.revealed_at, rd.month)
                   and p.sponsor_id <> me.id
              then null else p.detail end,
         case when public.prize_is_secret(p.is_hidden, p.revealed_at, rd.month)
                   and p.sponsor_id <> me.id
              then null else p.image_path end,
         public.prize_is_secret(p.is_hidden, p.revealed_at, rd.month),
         p.sponsor_id = me.id,
         p.revealed_at,
         p.created_at,
         p.sponsor_id,
         s.nickname,
         s.avatar_url
    from public.prizes p
    join public.rounds rd   on rd.id = p.round_id
    join public.profiles s  on s.id = p.sponsor_id
    cross join me
    cross join picked
   where rd.month = picked.month
   order by
     case p.board when 'distance' then 0 else 1 end,
     p.is_booby,
     p.rank_no nulls last,
     p.created_at;
$$;


-- ============================================================================
--  5. ฟังก์ชันเขียน
-- ----------------------------------------------------------------------------
--  ชื่อพารามิเตอร์เปลี่ยนจาก p_is_last เป็น p_is_booby
--  Postgres ไม่ยอมให้ create or replace เปลี่ยนชื่อพารามิเตอร์ ต้อง drop ก่อน
--  ฝั่งเว็บเรียกด้วยชื่อพารามิเตอร์ผ่าน PostgREST จึงต้องแก้ให้ตรงกันด้วย
-- ============================================================================

drop function if exists public.create_prize(
  text, int, boolean, text, text, text, boolean
);

create function public.create_prize(
  p_board      text,
  p_rank_no    int,
  p_is_booby   boolean,
  p_title      text,
  p_detail     text default null,
  p_image_path text default null,
  p_is_hidden  boolean default false
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me     uuid := public.require_approved_member();
  rd     public.rounds := public.current_round();
  v_rank int := p_rank_no;
  new_id uuid;
begin
  if p_board not in ('distance', 'percent') then
    raise exception 'เลือกกระดานก่อน' using errcode = '42501';
  end if;

  if coalesce(p_is_booby, false) then
    v_rank := null;
  elsif v_rank is null or v_rank < 1 or v_rank > 10 then
    raise exception 'เลือกอันดับ 1 ถึง 10 หรือบูบี้' using errcode = '42501';
  end if;

  if p_title is null or char_length(btrim(p_title)) = 0 then
    raise exception 'ใส่ชื่อของรางวัลด้วย' using errcode = '42501';
  end if;
  if char_length(btrim(p_title)) > 60 then
    raise exception 'ชื่อของรางวัลยาวเกิน 60 ตัวอักษร' using errcode = '42501';
  end if;
  if p_detail is not null and char_length(btrim(p_detail)) > 200 then
    raise exception 'รายละเอียดยาวเกิน 200 ตัวอักษร' using errcode = '42501';
  end if;

  -- รูปต้องอยู่ในโฟลเดอร์ของคนตั้งเอง ไม่งั้นอ้างรูปของคนอื่นมาเป็นของตัวได้
  if p_image_path is not null
     and p_image_path not like ((me::text) || '/%') then
    raise exception 'ที่อยู่ของรูปไม่ถูกต้อง' using errcode = '42501';
  end if;

  insert into public.prizes (
    round_id, sponsor_id, board, rank_no, is_booby,
    title, detail, image_path, is_hidden
  )
  values (
    rd.id, me, p_board, v_rank, coalesce(p_is_booby, false),
    btrim(p_title),
    nullif(btrim(coalesce(p_detail, '')), ''),
    p_image_path,
    coalesce(p_is_hidden, false)
  )
  returning id into new_id;

  return new_id;
end;
$$;


drop function if exists public.update_prize(
  uuid, text, int, boolean, text, text, text
);

create function public.update_prize(
  p_prize_id   uuid,
  p_board      text,
  p_rank_no    int,
  p_is_booby   boolean,
  p_title      text,
  p_detail     text default null,
  p_image_path text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me     uuid := public.require_approved_member();
  pz     public.prizes;
  v_rank int := p_rank_no;
begin
  select * into pz from public.prizes where id = p_prize_id;
  if pz.id is null then
    raise exception 'ไม่เจอรางวัลชิ้นนี้' using errcode = '42501';
  end if;
  if pz.sponsor_id <> me then
    raise exception 'แก้รางวัลของคนอื่นไม่ได้' using errcode = '42501';
  end if;
  if pz.created_at < now() - interval '24 hours' then
    raise exception 'เกิน 24 ชั่วโมงหลังตั้งรางวัลแล้ว แก้ไม่ได้'
      using errcode = '42501';
  end if;

  if p_board not in ('distance', 'percent') then
    raise exception 'เลือกกระดานก่อน' using errcode = '42501';
  end if;
  if coalesce(p_is_booby, false) then
    v_rank := null;
  elsif v_rank is null or v_rank < 1 or v_rank > 10 then
    raise exception 'เลือกอันดับ 1 ถึง 10 หรือบูบี้' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) = 0 then
    raise exception 'ใส่ชื่อของรางวัลด้วย' using errcode = '42501';
  end if;
  if char_length(btrim(p_title)) > 60 then
    raise exception 'ชื่อของรางวัลยาวเกิน 60 ตัวอักษร' using errcode = '42501';
  end if;
  if p_detail is not null and char_length(btrim(p_detail)) > 200 then
    raise exception 'รายละเอียดยาวเกิน 200 ตัวอักษร' using errcode = '42501';
  end if;
  if p_image_path is not null
     and p_image_path not like ((me::text) || '/%') then
    raise exception 'ที่อยู่ของรูปไม่ถูกต้อง' using errcode = '42501';
  end if;

  -- ส่ง p_image_path เป็น null แปลว่าไม่ได้เปลี่ยนรูป ใช้ของเดิมต่อ
  update public.prizes
     set board      = p_board,
         rank_no    = v_rank,
         is_booby   = coalesce(p_is_booby, false),
         title      = btrim(p_title),
         detail     = nullif(btrim(coalesce(p_detail, '')), ''),
         image_path = coalesce(p_image_path, pz.image_path)
   where id = p_prize_id;
end;
$$;


-- ============================================================================
--  6. ปิดสิทธิ์ตามกฎในโปรเจกต์
-- ----------------------------------------------------------------------------
--  Postgres ให้ execute กับ PUBLIC เป็นค่าเริ่มต้นสำหรับฟังก์ชันที่สร้างใหม่
--  ทุกตัวที่แตะในไฟล์นี้จึงต้องถอนแล้วให้เฉพาะ authenticated เหมือนของเดิม
--  (guard_prize_write เป็นฟังก์ชันของ trigger ไม่ต้องมีสิทธิ์ execute ให้ใคร)
-- ============================================================================

revoke all on function public.guard_prize_write() from public, anon, authenticated;

revoke all on function public.round_prizes(date) from public, anon;
grant execute on function public.round_prizes(date) to authenticated;

revoke all on function public.create_prize(
  text, int, boolean, text, text, text, boolean
) from public, anon;
grant execute on function public.create_prize(
  text, int, boolean, text, text, text, boolean
) to authenticated;

revoke all on function public.update_prize(
  uuid, text, int, boolean, text, text, text
) from public, anon;
grant execute on function public.update_prize(
  uuid, text, int, boolean, text, text, text
) to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- แปลงไปกี่แถว และเป็นของใครบ้าง
-- select s.nickname as สปอนเซอร์, p.board, p.title
--   from public.prizes p
--   join public.profiles s on s.id = p.sponsor_id
--  where p.is_booby;

-- คอลัมน์เปลี่ยนชื่อแล้วจริงไหม ควรเห็น is_booby ไม่เห็น is_last
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'prizes'
--  order by ordinal_position;

-- anon เรียกอะไรไม่ได้แล้วจริงไหม ควรได้ false ทั้งสามแถว
-- select p.proname,
--        has_function_privilege('anon', p.oid, 'execute') as anon_เรียกได้
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('round_prizes', 'create_prize', 'update_prize');
