-- ============================================================================
--  AOOOKULELE & CO. — ระบบรางวัล (สปอนเซอร์)
-- ----------------------------------------------------------------------------
--  สมาชิกตั้งรางวัลผูกกับ "กระดาน + อันดับ" ใครครองอันดับนั้นตอนจบเดือนได้ไป
--  ตั้งได้กี่ชิ้นก็ได้ เฉพาะรอบเดือนปัจจุบัน
--
--  สารบัญ
--    1. ตาราง prizes
--    2. ตัวช่วยเรื่องเวลาและการมองเห็น
--    3. trigger บังคับกติกา
--    4. ปิดประตูตาราง
--    5. ฟังก์ชันอ่าน  round_prizes()
--    6. ฟังก์ชันเขียน สร้าง แก้ ลบ เปิดเผย
--    7. Storage: บัคเก็ต prizes
--
--  หมายเหตุเรื่องชื่อพารามิเตอร์
--  ฟังก์ชันเขียนทุกตัวตั้งชื่อพารามิเตอร์ขึ้นต้นด้วย p_ โดยตั้งใจ
--  ถ้าตั้งชื่อตรงกับคอลัมน์ คำสั่ง update ... set board = board จะกลายเป็น
--  กำหนดค่าตัวเองแล้วไม่มีอะไรเปลี่ยน หรือไม่ก็โดนฟ้องว่าอ้างชื่อกำกวม
-- ============================================================================


-- ============================================================================
--  1. ตาราง prizes
-- ----------------------------------------------------------------------------
--  อันดับเก็บเป็นสองคอลัมน์ rank_no กับ is_last แทนที่จะยัดลงคอลัมน์เดียว
--  เพราะ "อันดับสุดท้าย" ไม่ใช่ตัวเลข ถ้าใช้เลขพิเศษอย่าง 0 หรือ 99 แทน
--  จะเรียงผิดและอ่านโค้ดยาก constraint prizes_rank_shape บังคับว่าต้องเป็น
--  อย่างใดอย่างหนึ่งเท่านั้น เป็นทั้งคู่หรือไม่เป็นเลยไม่ได้
-- ============================================================================

create table if not exists public.prizes (
  id          uuid        primary key default gen_random_uuid(),
  round_id    uuid        not null references public.rounds (id)   on delete cascade,
  sponsor_id  uuid        not null references public.profiles (id) on delete cascade,

  board       text        not null check (board in ('distance', 'percent')),
  rank_no     int,
  is_last     boolean     not null default false,

  title       text        not null
                          check (char_length(title) between 1 and 60),
  detail      text        check (detail is null or char_length(detail) <= 200),
  image_path  text,

  is_hidden   boolean     not null default false,
  revealed_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint prizes_rank_shape check (
    (is_last = true  and rank_no is null)
    or
    (is_last = false and rank_no between 1 and 10)
  )
);

comment on table public.prizes is
  'รางวัลที่สมาชิกตั้งให้กับกระดาน+อันดับ ของที่ติ๊กปิดอุบจะไม่เปิดเผย '
  'ชื่อ รายละเอียด และรูป จนกว่าคนให้จะกดเปิด หรือจนหมดเดือน';

create index if not exists prizes_round_idx   on public.prizes (round_id);
create index if not exists prizes_sponsor_idx on public.prizes (sponsor_id);
create index if not exists prizes_image_idx   on public.prizes (image_path);

drop trigger if exists prizes_touch_updated_at on public.prizes;
create trigger prizes_touch_updated_at
  before update on public.prizes
  for each row execute function public.touch_updated_at();


-- ============================================================================
--  2. ตัวช่วยเรื่องเวลาและการมองเห็น
-- ----------------------------------------------------------------------------
--  "สิ้นเดือน" คือเที่ยงคืนของวันที่ 1 เดือนถัดไปตามเวลาไทย
--  ไม่ใช่เที่ยงคืน UTC ซึ่งมาถึงก่อน 7 ชั่วโมง
-- ============================================================================

create or replace function public.round_month_end(target_month date)
returns timestamptz
language sql
-- stable ไม่ใช่ immutable เพราะการแปลงโซนเวลาอ้างฐานข้อมูลเขตเวลา
-- ซึ่งเปลี่ยนได้ (ไทยไม่เคยเปลี่ยน แต่ประกาศให้ตรงความจริงไว้ดีกว่า)
stable
set search_path = ''
as $$
  select ((target_month + interval '1 month')::date::timestamp
          at time zone 'Asia/Bangkok');
$$;

grant execute on function public.round_month_end(date) to authenticated;

-- ยังปิดอุบอยู่ไหม ณ ตอนนี้
-- ปิดอยู่ก็ต่อเมื่อ ติ๊กปิดอุบไว้ และยังไม่กดเปิด และยังไม่หมดเดือน
-- พอหมดเดือนระบบถือว่าเปิดเอง โดยไม่ต้องไปไล่แก้แถวในตาราง
create or replace function public.prize_is_secret(
  p_is_hidden   boolean,
  p_revealed_at timestamptz,
  p_month       date
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_is_hidden
     and p_revealed_at is null
     and now() < public.round_month_end(p_month);
$$;

grant execute on function public.prize_is_secret(boolean, timestamptz, date)
  to authenticated;

-- รูปของรางวัลนี้ เปิดให้คนที่กำลังเรียกดูได้หรือยัง
-- ใช้ใน policy ของ storage เพื่อให้การปิดอุบบังคับถึงระดับไฟล์รูปด้วย
-- ไม่ใช่แค่ซ่อนชื่อในหน้าเว็บ ใครยิง API ขอ signed URL ตรงก็ต้องไม่ได้
-- security definer เพราะต้องอ่านตาราง prizes ซึ่งถูกปิดสิทธิ์ไว้หมด
create or replace function public.prize_image_visible(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_profile_status() = 'approved'
     and exists (
       select 1
         from public.prizes p
         join public.rounds rd on rd.id = p.round_id
        where p.image_path = object_name
          and (
            p.sponsor_id = (select auth.uid())
            or not public.prize_is_secret(p.is_hidden, p.revealed_at, rd.month)
          )
     );
$$;

grant execute on function public.prize_image_visible(text) to authenticated;


-- ============================================================================
--  3. trigger บังคับกติกา
-- ----------------------------------------------------------------------------
--  ฟังก์ชันในข้อ 6 เช็กครบอยู่แล้ว แต่ trigger เป็นด่านสุดท้าย
--  แบบเดียวกับที่ทำกับ targets และ target_votes
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
        new.board, new.rank_no, new.is_last)
       is distinct from
       (old.title, old.detail, old.image_path,
        old.board, old.rank_no, old.is_last)
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
--  4. ปิดประตูตาราง
-- ----------------------------------------------------------------------------
--  ถ้าปล่อยให้ query ตรงได้ ของที่ปิดอุบจะรั่วทันทีที่มีคนเปิด devtools
--  ทางเข้าออกมีทางเดียวคือฟังก์ชันในข้อ 5 และ 6 ซึ่งคัดแล้วว่าคืนอะไรได้บ้าง
-- ============================================================================

revoke all on public.prizes from anon, authenticated;
alter table public.prizes enable row level security;


-- ============================================================================
--  5. round_prizes() — อ่านรายการรางวัล
-- ----------------------------------------------------------------------------
--  ของที่ยังปิดอุบอยู่ คืน title / detail / image_path เป็น null
--  ยกเว้นคนเรียกเป็นคนให้เอง
--
--  แอดมินไม่ได้รับการยกเว้น เพราะแอดมินก็เล่นเกมนี้ด้วย
--  ถ้าให้แอดมินเห็นหมด การปิดอุบก็ไม่มีความหมาย
-- ============================================================================

create or replace function public.round_prizes(target_month date default null)
returns table (
  prize_id           uuid,
  board              text,
  rank_no            int,
  is_last            boolean,
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
         p.is_last,
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
     p.is_last,
     p.rank_no nulls last,
     p.created_at;
$$;

grant execute on function public.round_prizes(date) to authenticated;


-- ============================================================================
--  6. ฟังก์ชันเขียน
-- ============================================================================

create or replace function public.create_prize(
  p_board      text,
  p_rank_no    int,
  p_is_last    boolean,
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

  if coalesce(p_is_last, false) then
    v_rank := null;
  elsif v_rank is null or v_rank < 1 or v_rank > 10 then
    raise exception 'เลือกอันดับ 1 ถึง 10 หรืออันดับสุดท้าย'
      using errcode = '42501';
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
    round_id, sponsor_id, board, rank_no, is_last,
    title, detail, image_path, is_hidden
  )
  values (
    rd.id, me, p_board, v_rank, coalesce(p_is_last, false),
    btrim(p_title),
    nullif(btrim(coalesce(p_detail, '')), ''),
    p_image_path,
    coalesce(p_is_hidden, false)
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_prize(
  text, int, boolean, text, text, text, boolean
) to authenticated;


create or replace function public.update_prize(
  p_prize_id   uuid,
  p_board      text,
  p_rank_no    int,
  p_is_last    boolean,
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
  if coalesce(p_is_last, false) then
    v_rank := null;
  elsif v_rank is null or v_rank < 1 or v_rank > 10 then
    raise exception 'เลือกอันดับ 1 ถึง 10 หรืออันดับสุดท้าย'
      using errcode = '42501';
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
         is_last    = coalesce(p_is_last, false),
         title      = btrim(p_title),
         detail     = nullif(btrim(coalesce(p_detail, '')), ''),
         image_path = coalesce(p_image_path, pz.image_path)
   where id = p_prize_id;
end;
$$;

grant execute on function public.update_prize(
  uuid, text, int, boolean, text, text, text
) to authenticated;


create or replace function public.delete_prize(p_prize_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  pz public.prizes;
begin
  select * into pz from public.prizes where id = p_prize_id;
  if pz.id is null then
    raise exception 'ไม่เจอรางวัลชิ้นนี้' using errcode = '42501';
  end if;

  -- แอดมินลบได้ตลอด เผื่อมีของไม่เหมาะสม
  if not public.current_user_is_admin() then
    if pz.sponsor_id <> me then
      raise exception 'ลบรางวัลของคนอื่นไม่ได้' using errcode = '42501';
    end if;
    if pz.created_at < now() - interval '24 hours' then
      raise exception 'เกิน 24 ชั่วโมงหลังตั้งรางวัลแล้ว ถอนไม่ได้'
        using errcode = '42501';
    end if;
  end if;

  delete from public.prizes where id = p_prize_id;
end;
$$;

grant execute on function public.delete_prize(uuid) to authenticated;


-- กดเปิดให้ทุกคนเห็น ทำได้ตลอดแม้เลย 24 ชั่วโมงแล้ว
-- กดแล้วปิดกลับไม่ได้ trigger ข้อ 3 กันไว้อีกชั้น
create or replace function public.reveal_prize(p_prize_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  pz public.prizes;
begin
  select * into pz from public.prizes where id = p_prize_id;
  if pz.id is null then
    raise exception 'ไม่เจอรางวัลชิ้นนี้' using errcode = '42501';
  end if;
  if pz.sponsor_id <> me then
    raise exception 'เปิดของคนอื่นไม่ได้' using errcode = '42501';
  end if;

  update public.prizes
     set is_hidden   = false,
         revealed_at = coalesce(pz.revealed_at, now())
   where id = p_prize_id;
end;
$$;

grant execute on function public.reveal_prize(uuid) to authenticated;


-- ============================================================================
--  7. Storage: บัคเก็ต prizes
-- ----------------------------------------------------------------------------
--  private เหมือนบัคเก็ต proofs และเข้มกว่าตรงที่ policy อ่านไม่ได้ดูแค่ว่า
--  เป็นสมาชิกหรือเปล่า แต่ไปถาม prize_image_visible() ว่ารางวัลที่ใช้รูปนั้น
--  เปิดให้คนนี้เห็นแล้วหรือยัง คนที่ยิง API ขอ signed URL ของรูปลับจึงไม่ได้
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prizes',
  'prizes',
  false,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists prizes_select_visible on storage.objects;
create policy prizes_select_visible on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prizes'
    and public.prize_image_visible(name)
  );

drop policy if exists prizes_insert_own on storage.objects;
create policy prizes_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prizes'
    and public.current_profile_status() = 'approved'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists prizes_update_own on storage.objects;
create policy prizes_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'prizes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists prizes_delete_own on storage.objects;
create policy prizes_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'prizes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ตารางถูกปิดสิทธิ์จริงไหม ควรได้ 0 แถว
-- select grantee, privilege_type from information_schema.table_privileges
--  where table_schema = 'public' and table_name = 'prizes'
--    and grantee in ('anon', 'authenticated');

-- รางวัลเดือนนี้มีอะไรบ้าง (รันจาก SQL Editor เห็นดิบทุกอย่าง)
-- select p.title, p.board, p.rank_no, p.is_last, p.is_hidden, p.revealed_at,
--        s.nickname as สปอนเซอร์
--   from public.prizes p
--   join public.profiles s on s.id = p.sponsor_id
--   join public.rounds rd on rd.id = p.round_id
--  where rd.month = public.current_month_bkk()
--  order by p.created_at;

-- สิ้นเดือนนี้ตรงกับเวลาไหนตามเวลาไทย
-- select public.round_month_end(public.current_month_bkk()) at time zone 'Asia/Bangkok';
