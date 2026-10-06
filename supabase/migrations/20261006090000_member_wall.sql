-- ============================================================================
--  AOOOKULELE & CO. — กระดานแซว + สถิติเดือนที่ดีที่สุด
-- ----------------------------------------------------------------------------
--  กระดานแซวคือช่องให้เพื่อนในกลุ่มเขียนทิ้งไว้บนหน้าโปรไฟล์ของกันและกัน
--  ข้อความล้วน ไม่มีรูป ไม่มีการแก้ อยากแก้ให้ลบแล้วเขียนใหม่
--
--  ไม่มีระบบแจ้งเตือนใดๆ ทั้งสิ้น ไม่มีตารางเก็บว่าใครอ่านแล้วหรือยัง
--  คนจะเห็นก็ต่อเมื่อเปิดหน้าโปรไฟล์นั้นเอง
--
--  สารบัญ
--    1. ตาราง member_wall
--    2. ฟังก์ชันอ่าน
--    3. ฟังก์ชันเขียน ลบ ซ่อน
--    4. เดือนที่ดีที่สุดของสมาชิกคนหนึ่ง
--    5. สิทธิ์
-- ============================================================================


-- ============================================================================
--  1. member_wall
-- ----------------------------------------------------------------------------
--  owner_id   เจ้าของกระดาน คือคนที่ข้อความนี้ไปโผล่บนหน้าโปรไฟล์
--  author_id  คนเขียน
--  hidden     เจ้าของกระดานกดซ่อนไว้ ข้อความยังอยู่แต่คนอื่นไม่เห็น
--
--  เขียนบนกระดานตัวเองได้ (owner_id = author_id) จึงไม่มี check ห้ามไว้
--
--  ไม่มีคอลัมน์ updated_at เพราะแก้ข้อความไม่ได้โดยตั้งใจ
--  ถ้ามีคอลัมน์นั้นไว้เฉยๆ คนอ่านโค้ดทีหลังจะนึกว่าแก้ได้
-- ============================================================================

create table if not exists public.member_wall (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references public.profiles (id) on delete cascade,
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null
                         check (char_length(btrim(body)) between 1 and 300),
  hidden     boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table public.member_wall is
  'กระดานแซวบนหน้าโปรไฟล์สมาชิก อ่านและเขียนได้เฉพาะสมาชิกที่อนุมัติแล้ว '
  'แก้ข้อความไม่ได้ ลบได้อย่างเดียว';

-- ดึงทีละกระดาน เรียงใหม่สุดก่อน เป็นรูปแบบเดียวที่หน้าเว็บใช้
create index if not exists member_wall_owner_idx
  on public.member_wall (owner_id, created_at desc);

-- ใช้ตอนนับโควตารายวันของคนเขียน
create index if not exists member_wall_author_idx
  on public.member_wall (author_id, created_at desc);

revoke all on public.member_wall from anon, authenticated;
alter table public.member_wall enable row level security;


-- ============================================================================
--  2. ฟังก์ชันอ่าน
-- ----------------------------------------------------------------------------
--  require_approved_member() เป็นด่านแรกเสมอ คนที่ยังไม่ล็อกอินหรือยังไม่ถูก
--  อนุมัติจะโดน exception ตั้งแต่บรรทัดแรก ไม่ได้แม้แต่จำนวนข้อความ
--
--  ข้อความที่ซ่อนอยู่ คืนให้เฉพาะเจ้าของกระดานกับแอดมิน
--    เจ้าของ  ต้องเห็นเพื่อกดเลิกซ่อนได้
--    แอดมิน   ต้องเห็นเพื่อลบของที่ไม่เหมาะสมได้
--  คนอื่นไม่เห็นเลย รวมถึงคนเขียนเองด้วย จะได้ไม่รู้ว่าโดนซ่อน
-- ============================================================================

--  เขียนเป็น plpgsql แล้วเรียกด่านตรวจสิทธิ์เป็นบรรทัดแรกโดยตั้งใจ
--  ถ้าเอาไปแปะไว้ใน where ของฟังก์ชัน sql ธรรมดา ตัววางแผนคำสั่งอาจข้ามไม่
--  ประเมินเลยเมื่อไม่มีแถวตรงเงื่อนไขอื่น กลายเป็นด่านที่บางทีก็ไม่ทำงาน

drop function if exists public.member_wall_list(uuid, int);
create function public.member_wall_list(p_owner uuid, p_limit int default 50)
returns table (
  id            uuid,
  author_id     uuid,
  author_name   text,
  author_avatar text,
  body          text,
  hidden        boolean,
  can_delete    boolean,
  created_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me       uuid    := public.require_approved_member();
  is_admin boolean := public.current_user_is_admin();
begin
  return query
  select w.id,
         w.author_id,
         p.nickname,
         p.avatar_url,
         w.body,
         w.hidden,
         -- คนที่กำลังดูอยู่ลบข้อความนี้ได้ไหม (คนเขียนเอง หรือแอดมิน)
         (w.author_id = me or is_admin),
         w.created_at
    from public.member_wall w
    join public.profiles p on p.id = w.author_id
   where w.owner_id = p_owner
     and (not w.hidden or w.owner_id = me or is_admin)
   order by w.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;


-- จำนวนข้อความที่คนดูคนนี้มองเห็นบนกระดานนั้น ใช้โชว์ "5 ข้อความ"
drop function if exists public.member_wall_count(uuid);
create function public.member_wall_count(p_owner uuid)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me       uuid    := public.require_approved_member();
  is_admin boolean := public.current_user_is_admin();
  total    int;
begin
  select count(*)::int into total
    from public.member_wall w
   where w.owner_id = p_owner
     and (not w.hidden or w.owner_id = me or is_admin);

  return total;
end;
$$;


-- ============================================================================
--  3. ฟังก์ชันเขียน ลบ ซ่อน
-- ----------------------------------------------------------------------------
--  ตารางถูกถอนสิทธิ์ไปหมดแล้ว ทางเดียวที่เขียนได้คือผ่านสามฟังก์ชันนี้
--  ซึ่งทุกตัวตรวจสิทธิ์เองก่อนแตะข้อมูล
-- ============================================================================

/** คนหนึ่งเขียนได้ไม่เกินเท่านี้ต่อวัน กันคนรัวข้อความจนกระดานล่ม */
create or replace function public.wall_daily_limit()
returns int
language sql
immutable
as $$ select 30; $$;

create or replace function public.member_wall_add(p_owner uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me    uuid := public.require_approved_member();
  clean text := btrim(coalesce(p_body, ''));
  used  int;
  new_id uuid;
begin
  -- เจ้าของกระดานต้องเป็นสมาชิกที่อนุมัติแล้วจริงๆ ไม่ใช่ id มั่วๆ
  if not exists (
    select 1 from public.profiles
     where id = p_owner and status = 'approved'
  ) then
    raise exception 'ไม่พบสมาชิกคนนี้' using errcode = '22023';
  end if;

  if clean = '' then
    raise exception 'พิมพ์ข้อความก่อนนะ' using errcode = '23514';
  end if;

  if char_length(clean) > 300 then
    raise exception 'ข้อความยาวเกิน 300 ตัวอักษร' using errcode = '23514';
  end if;

  -- นับตามวันแบบเวลาไทย ไม่ใช่ 24 ชั่วโมงย้อนหลัง จะได้อธิบายกับคนใช้ง่ายว่า
  -- "วันนี้เขียนครบแล้ว พรุ่งนี้เขียนได้ใหม่"
  select count(*) into used
    from public.member_wall
   where author_id = me
     and (created_at at time zone 'Asia/Bangkok')::date = public.today_bkk();

  if used >= public.wall_daily_limit() then
    raise exception 'วันนี้เขียนครบ % ข้อความแล้ว พรุ่งนี้ค่อยมาแซวต่อ',
      public.wall_daily_limit() using errcode = '54000';
  end if;

  -- author_id มาจาก auth.uid() เสมอ ไม่ได้รับจากฝั่งเรียก จึงปลอมเป็นคนอื่นไม่ได้
  insert into public.member_wall (owner_id, author_id, body)
  values (p_owner, me, clean)
  returning id into new_id;

  return new_id;
end;
$$;


create or replace function public.member_wall_delete(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me  uuid := public.require_approved_member();
  wall_row public.member_wall;
begin
  select * into wall_row from public.member_wall where id = p_id;
  if not found then
    raise exception 'ไม่พบข้อความนี้' using errcode = '22023';
  end if;

  -- คนเขียนลบของตัวเองได้ แอดมินลบได้ทุกอัน
  -- เจ้าของกระดานลบของคนอื่นไม่ได้ ให้กดซ่อนแทน ข้อความจะได้ไม่หายไปเงียบๆ
  if wall_row.author_id <> me and not public.current_user_is_admin() then
    raise exception 'ลบได้เฉพาะข้อความที่ตัวเองเขียน' using errcode = '42501';
  end if;

  delete from public.member_wall where id = p_id;
end;
$$;


create or replace function public.member_wall_set_hidden(
  p_id     uuid,
  p_hidden boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me  uuid := public.require_approved_member();
  wall_row public.member_wall;
begin
  select * into wall_row from public.member_wall where id = p_id;
  if not found then
    raise exception 'ไม่พบข้อความนี้' using errcode = '22023';
  end if;

  if wall_row.owner_id <> me and not public.current_user_is_admin() then
    raise exception 'ซ่อนได้เฉพาะข้อความบนกระดานของตัวเอง'
      using errcode = '42501';
  end if;

  update public.member_wall
     set hidden = coalesce(p_hidden, false)
   where id = p_id;
end;
$$;


-- ============================================================================
--  4. เดือนที่ดีที่สุดของสมาชิกคนหนึ่ง
-- ----------------------------------------------------------------------------
--  ใช้กับช่องที่สามของแถบตัวเลขบนหน้าโปรไฟล์
--  นับจากตาราง runs ตรงๆ ไม่ได้ผูกกับรอบ เพราะอยากได้ทุกเดือนที่เคยวิ่ง
--  เดือนที่ยังไม่จบก็นับด้วย ถ้าเดือนนี้ทำได้ดีที่สุดก็ควรขึ้นว่าเดือนนี้
--
--  คืน 0 แถวเมื่อคนนั้นยังไม่เคยมีผลวิ่งเลย ฝั่งเว็บจะได้ซ่อนช่องนั้น
-- ============================================================================

drop function if exists public.member_best_month(uuid);
create function public.member_best_month(p_profile uuid)
returns table (
  best_month date,
  best_km    numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_approved_member();

  -- ชื่อคอลัมน์ที่คืนออกไปตั้งใจไม่ใช้คำว่า month กับ km เฉยๆ
  -- เพราะใน plpgsql ชื่อที่ประกาศใน returns table กลายเป็นตัวแปร
  -- พอไปโผล่ใน order by จะกำกวมกับคอลัมน์ในตารางจนคำสั่งไม่ผ่าน
  return query
  select m.mth, m.km
    from (
      select date_trunc('month', r.ran_on)::date as mth,
             sum(r.distance_km)::numeric(10,2)   as km
        from public.runs r
       where r.profile_id = p_profile
       group by date_trunc('month', r.ran_on)
    ) m
   order by m.km desc, m.mth desc
   limit 1;
end;
$$;


-- ============================================================================
--  5. สิทธิ์
-- ----------------------------------------------------------------------------
--  ทุกตัวให้เฉพาะ authenticated ไม่มีตัวไหนเปิดให้ anon เลย
--  กระดานแซวเป็นของในกลุ่ม คนนอกไม่ควรเห็นแม้แต่ว่ามีกี่ข้อความ
--
--  ถึงจะ grant ให้ authenticated แต่ข้างในยังเรียก require_approved_member()
--  อีกชั้น คนที่ล็อกอินแล้วแต่ยังรออนุมัติจึงยังอ่านไม่ได้
-- ============================================================================

revoke all on function public.wall_daily_limit() from public, anon, authenticated;
grant execute on function public.wall_daily_limit() to authenticated;

revoke all on function public.member_wall_list(uuid, int)
  from public, anon, authenticated;
grant execute on function public.member_wall_list(uuid, int) to authenticated;

revoke all on function public.member_wall_count(uuid)
  from public, anon, authenticated;
grant execute on function public.member_wall_count(uuid) to authenticated;

revoke all on function public.member_wall_add(uuid, text)
  from public, anon, authenticated;
grant execute on function public.member_wall_add(uuid, text) to authenticated;

revoke all on function public.member_wall_delete(uuid)
  from public, anon, authenticated;
grant execute on function public.member_wall_delete(uuid) to authenticated;

revoke all on function public.member_wall_set_hidden(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.member_wall_set_hidden(uuid, boolean)
  to authenticated;

revoke all on function public.member_best_month(uuid)
  from public, anon, authenticated;
grant execute on function public.member_best_month(uuid) to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ข้อความบนกระดานของตัวเอง
-- select * from public.member_wall_list((select auth.uid()));

-- เดือนที่ดีที่สุดของตัวเอง
-- select * from public.member_best_month((select auth.uid()));

-- โควตาที่ใช้ไปวันนี้
-- select count(*) from public.member_wall
--  where author_id = (select auth.uid())
--    and (created_at at time zone 'Asia/Bangkok')::date = public.today_bkk();
