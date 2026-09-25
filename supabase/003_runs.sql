-- ============================================================================
--  AOOOKULELE & CO. — ผลวิ่งรายครั้ง + กระดานระยะรวม
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql และ 002_removed.sql ที่รันไปแล้ว
--  ไม่ต้องกลับไปรันสองไฟล์นั้นซ้ำ
--
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง
--
--  สารบัญ
--    1. ตาราง rounds (รอบเดือน) + เวลาไทย
--    2. ตาราง runs (ผลวิ่งรายครั้ง)
--    3. ตาราง run_edits (ประวัติการแก้)
--    4. กติกาการกรอกย้อนเดือน และการแก้ 24 ชั่วโมง (trigger)
--    5. เขียนประวัติการแก้อัตโนมัติ (trigger)
--    6. RLS
--    7. กระดานระยะรวม (ฟังก์ชัน)
--    8. Storage: บัคเก็ต proofs
-- ============================================================================


-- ============================================================================
--  1. ตาราง rounds — รอบเดือน
-- ----------------------------------------------------------------------------
--  เรื่องเวลาสำคัญมาก ฐานข้อมูลเดินด้วย UTC ถ้าถามว่า "ตอนนี้เดือนอะไร"
--  ด้วย now() เฉยๆ ช่วงเที่ยงคืนถึงตีเจ็ดตามเวลาไทย จะได้คำตอบเป็นเดือนก่อนหน้า
--  เพราะ UTC ตามหลังไทยอยู่ 7 ชั่วโมง คนที่วิ่งตอนตีห้าแล้วกรอกผลทันที
--  จะถูกนับเข้ารอบเดือนที่แล้ว ซึ่งผิด
--
--  ทุกที่ในไฟล์นี้จึงคิดเดือนผ่าน current_month_bkk() ตัวเดียว
-- ============================================================================

create table if not exists public.rounds (
  id          uuid        primary key default gen_random_uuid(),
  month       date        not null unique,
  status      text        not null default 'open'
                          check (status in ('open', 'closed')),
  created_at  timestamptz not null default now()
);

comment on table public.rounds is
  'รอบการแข่งรายเดือน หนึ่งเดือนหนึ่งแถว month เก็บวันที่ 1 ของเดือนนั้น';

-- วันที่ 1 ของเดือนปัจจุบัน ตามเวลาไทย
create or replace function public.current_month_bkk()
returns date
language sql
stable
as $$
  select date_trunc('month', (now() at time zone 'Asia/Bangkok'))::date;
$$;

comment on function public.current_month_bkk() is
  'วันที่ 1 ของเดือนปัจจุบันตามเวลาไทย ใช้เป็นแหล่งความจริงเดียวเรื่องเดือน';

-- วันนี้ตามเวลาไทย ใช้ตรวจว่ากรอกวันที่อนาคตหรือเปล่า
create or replace function public.today_bkk()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Bangkok')::date;
$$;

grant execute on function public.current_month_bkk() to authenticated;
grant execute on function public.today_bkk() to authenticated;

-- ชื่อเดือนภาษาไทยพร้อมปี พ.ศ. ใช้ในข้อความ error ให้คนอ่านรู้เรื่อง
create or replace function public.thai_month_label(target date)
returns text
language sql
immutable
as $$
  select (array[
           'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
           'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
           'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
         ])[extract(month from target)::int]
         || ' ' || (extract(year from target)::int + 543)::text;
$$;

grant execute on function public.thai_month_label(date) to authenticated;

-- ----------------------------------------------------------------------------
--  round_for_date() — รอบของเดือนที่วันนั้นอยู่ ถ้ายังไม่มีให้สร้างให้เลย
-- ----------------------------------------------------------------------------
--  volatile เพราะมันเขียนข้อมูล ไม่ใช่ stable
--  security definer เพราะ RLS ของ rounds ไม่เปิดให้ใคร insert
--  on conflict do nothing กันสองคนกรอกผลพร้อมกันตอนต้นเดือนแล้วชนกัน
--
--  ถ้าคนกรอกไม่มีสิทธิ์กรอกย้อนเข้าเดือนนั้น trigger ข้อ 4 จะโยน exception
--  ทำให้ทั้งธุรกรรมถูกยกเลิก รอบที่เพิ่งสร้างก็หายไปด้วย ไม่มีรอบขยะค้าง
-- ----------------------------------------------------------------------------

create or replace function public.round_for_date(target date)
returns public.rounds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_month date := date_trunc('month', target)::date;
  result       public.rounds;
begin
  insert into public.rounds (month)
  values (target_month)
  on conflict (month) do nothing;

  select * into result
    from public.rounds
   where month = target_month;

  return result;
end;
$$;

-- รอบของเดือนปัจจุบัน เป็นแค่ทางลัดของ round_for_date()
create or replace function public.current_round()
returns public.rounds
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public.round_for_date(public.current_month_bkk());
end;
$$;

grant execute on function public.round_for_date(date) to authenticated;
grant execute on function public.current_round() to authenticated;


-- ============================================================================
--  2. ตาราง runs — ผลวิ่งรายครั้ง
-- ============================================================================

create table if not exists public.runs (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references public.profiles (id) on delete cascade,
  round_id     uuid        not null references public.rounds (id) on delete restrict,
  ran_on       date        not null,
  distance_km  numeric(6,2) not null check (distance_km > 0),
  source       text        not null,
  proof_url    text        not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.runs.proof_url is
  'ที่อยู่ไฟล์ในบัคเก็ต proofs เช่น <user id>/1700000000.jpg ไม่ใช่ URL เต็ม '
  'เพราะบัคเก็ตเป็นแบบส่วนตัว ต้องขอ signed url ตอนจะแสดงผลทุกครั้ง';

create index if not exists runs_round_profile_idx
  on public.runs (round_id, profile_id);

create index if not exists runs_profile_ran_on_idx
  on public.runs (profile_id, ran_on desc);

drop trigger if exists runs_touch_updated_at on public.runs;
create trigger runs_touch_updated_at
  before update on public.runs
  for each row execute function public.touch_updated_at();


-- ============================================================================
--  3. ตาราง run_edits — ประวัติการแก้
-- ----------------------------------------------------------------------------
--  run_id ไม่ได้ทำเป็น foreign key โดยตั้งใจ เพราะประวัติต้องอยู่ต่อได้
--  หลังผลวิ่งถูกลบไปแล้ว ถ้าผูก fk ไว้ประวัติการลบจะโดนลบตามไปด้วย
--  ซึ่งขัดกับเหตุผลที่มีตารางนี้
--
--  profile_id เป็นคอลัมน์ที่เพิ่มเข้ามาเองนอกเหนือจากที่ระบุไว้ เพราะหน้า
--  /club/member/[id] ต้องดึงประวัติของคนคนเดียว ถ้าไม่มีคอลัมน์นี้ต้องไปงม
--  เอาจาก old_value ซึ่งช้าและทำ index ไม่ได้
-- ============================================================================

create table if not exists public.run_edits (
  id          uuid        primary key default gen_random_uuid(),
  run_id      uuid        not null,
  profile_id  uuid        references public.profiles (id) on delete set null,
  edited_by   uuid        references public.profiles (id) on delete set null,
  action      text        not null check (action in ('update', 'delete')),
  old_value   jsonb,
  new_value   jsonb,
  edited_at   timestamptz not null default now()
);

create index if not exists run_edits_profile_idx
  on public.run_edits (profile_id, edited_at desc);

create index if not exists run_edits_run_idx
  on public.run_edits (run_id);


-- ============================================================================
--  4. กติกาการกรอกย้อนเดือน และการแก้ 24 ชั่วโมง
-- ----------------------------------------------------------------------------
--  อยู่ใน trigger ไม่ใช่ในโค้ดฝั่งเว็บ เพราะ Server Action ถูกยิงตรงด้วย POST
--  ได้โดยไม่ผ่านหน้าเว็บ ถ้าเช็กแค่ฝั่งเว็บก็เท่ากับไม่ได้เช็ก
-- ============================================================================


-- ----------------------------------------------------------------------------
--  4.1 กรอกใหม่: ผลวิ่งไปเข้ารอบของเดือนที่วิ่งจริง
-- ----------------------------------------------------------------------------
--  คนวิ่งเย็นวันสิ้นเดือนแล้วมากรอกเช้าวันที่ 1 เป็นเรื่องปกติมาก
--  ถ้าบังคับว่า ran_on ต้องอยู่ในเดือนปัจจุบันเท่านั้น คนกลุ่มนี้จะกรอกไม่ได้เลย
--
--  กติกาที่ใช้
--    - ผลวิ่งไปเข้ารอบของเดือนที่ ran_on อยู่ ไม่ใช่รอบของเดือนปัจจุบัน
--      trigger เป็นคนกำหนด round_id เอง ไม่เชื่อค่าที่ส่งมาจากฝั่งเว็บ
--    - เดือนปัจจุบัน กรอกได้ตลอด
--    - เดือนก่อนหน้า กรอกได้ภายในวันที่ 1 ถึง 3 ของเดือนใหม่
--    - พ้นวันที่ 3 หรือย้อนไกลกว่าเดือนก่อนหน้า ต้องให้แอดมินใส่ให้
--    - รอบที่ status = 'closed' ห้ามกรอกเข้าไปเลย ไม่ว่าใคร รวมถึงแอดมิน
--      ถ้าจำเป็นจริงๆ ต้องเปิดรอบก่อน ดูคำสั่งท้ายไฟล์
-- ----------------------------------------------------------------------------

create or replace function public.enforce_run_entry_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today         date := public.today_bkk();
  target_month  date := date_trunc('month', new.ran_on)::date;
  this_month    date := public.current_month_bkk();
  prev_month    date := (date_trunc('month', public.current_month_bkk()) - interval '1 month')::date;
  is_privileged boolean;
  target_round  public.rounds;
begin
  if new.ran_on > today then
    raise exception 'กรอกวันที่ในอนาคตไม่ได้ วันนี้คือ %', today
      using errcode = '22007';
  end if;

  -- รันจาก SQL Editor หรือ service_role ถือว่าเป็นทางออกฉุกเฉิน ข้ามกติกาเวลาได้
  -- แต่ยังข้ามเรื่องรอบที่ปิดแล้วไม่ได้ (เช็กทีหลัง)
  is_privileged := (select auth.uid()) is null or public.current_user_is_admin();

  if not is_privileged then
    if target_month = this_month then
      null;  -- เดือนปัจจุบัน กรอกได้ตลอด

    elsif target_month = prev_month and extract(day from today) <= 3 then
      null;  -- ช่วงผ่อนผัน 3 วันแรกของเดือนใหม่

    elsif target_month = prev_month then
      raise exception
        'ผลวิ่งของเดือน% กรอกเองได้ถึงวันที่ 3 ของเดือนถัดไปเท่านั้น ตอนนี้เลยกำหนดแล้ว ให้แอดมินช่วยใส่ให้',
        public.thai_month_label(target_month)
        using errcode = '42501';

    else
      raise exception
        'กรอกย้อนหลังเองได้แค่เดือนก่อนหน้า และต้องภายในวันที่ 3 ของเดือนใหม่ ผลวิ่งของเดือน% ต้องให้แอดมินใส่ให้',
        public.thai_month_label(target_month)
        using errcode = '42501';
    end if;
  end if;

  -- หารอบของเดือนที่วิ่งจริง แล้วบังคับใช้ค่านี้เสมอ
  target_round := public.round_for_date(new.ran_on);
  new.round_id := target_round.id;

  -- รอบปิดแล้วห้ามทุกคน รวมแอดมินและ SQL Editor
  if target_round.status <> 'open' then
    raise exception
      'รอบเดือน% ปิดไปแล้ว กรอกย้อนเข้าไปไม่ได้ ถ้าจำเป็นต้องเปิดรอบนั้นก่อน',
      public.thai_month_label(target_month)
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists runs_enforce_entry_window on public.runs;
create trigger runs_enforce_entry_window
  before insert on public.runs
  for each row execute function public.enforce_run_entry_window();


-- ----------------------------------------------------------------------------
--  4.2 แก้หรือลบ: ภายใน 24 ชั่วโมงหลังกรอก
-- ----------------------------------------------------------------------------
--  นับ 24 ชั่วโมงจาก created_at คือตอนกรอก ไม่ใช่ ran_on คือวันที่วิ่ง
--  เพราะกติกาคือ "ภายใน 24 ชม. หลังกรอก"
-- ----------------------------------------------------------------------------

create or replace function public.enforce_run_edit_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- ไม่มี auth.uid() แปลว่ารันจาก SQL Editor หรือ service_role ปล่อยผ่าน
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    -- ข้อห้ามชุดนี้ใช้กับทุกคนรวมแอดมิน เพราะเป็นเรื่องความถูกต้องของข้อมูล
    -- ไม่ใช่เรื่องสิทธิ์ ย้ายผลวิ่งไปเป็นของคนอื่นหรือย้ายข้ามรอบไม่ได้
    -- และห้ามปลอม created_at เพื่อยืดเวลา 24 ชั่วโมงของตัวเอง
    new.profile_id := old.profile_id;
    new.round_id   := old.round_id;
    new.created_at := old.created_at;

    -- ถ้าปล่อยให้แก้วันที่ข้ามเดือนได้ ผลวิ่งจะค้างอยู่ในรอบเดิมทั้งที่วันที่
    -- บอกอีกเดือน กลายเป็นตัวเลขบนกระดานไม่ตรงกับรายการข้างใน
    if date_trunc('month', new.ran_on)
       is distinct from date_trunc('month', old.ran_on) then
      raise exception 'แก้วันที่ข้ามเดือนไม่ได้ ถ้ากรอกเดือนผิดให้ลบรายการนี้แล้วกรอกใหม่'
        using errcode = '42501';
    end if;
  end if;

  -- แอดมินแก้ได้ตลอด แต่ยังขึ้นประวัติเหมือนกัน (trigger ข้อ 5 ทำงานแยก)
  if public.current_user_is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if old.profile_id is distinct from (select auth.uid()) then
    raise exception 'แก้ผลวิ่งของคนอื่นไม่ได้'
      using errcode = '42501';
  end if;

  if old.created_at < now() - interval '24 hours' then
    raise exception 'เกิน 24 ชั่วโมงหลังกรอกแล้ว แก้เองไม่ได้ ต้องให้แอดมินช่วยแก้'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists runs_enforce_edit_window on public.runs;
create trigger runs_enforce_edit_window
  before update or delete on public.runs
  for each row execute function public.enforce_run_edit_window();


-- ============================================================================
--  5. เขียนประวัติการแก้อัตโนมัติ
-- ----------------------------------------------------------------------------
--  เป็น AFTER trigger เพื่อให้บันทึกเฉพาะตอนที่แก้ผ่านด่านข้อ 4 มาได้จริง
--  โค้ดฝั่งเว็บไม่ต้องเรียกอะไรเลย
--
--  บันทึกเฉพาะ update กับ delete ตามที่ตกลงไว้ ไม่บันทึกตอนสร้างใหม่
--  เพราะจะกลายเป็นว่าผลวิ่งทุกรายการมีประวัติหนึ่งบรรทัดโดยไม่มีประโยชน์
-- ============================================================================

create or replace function public.log_run_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.run_edits (
    run_id, profile_id, edited_by, action, old_value, new_value
  )
  values (
    old.id,
    old.profile_id,
    (select auth.uid()),
    lower(tg_op),
    to_jsonb(old),
    case when tg_op = 'UPDATE' then to_jsonb(new) else null end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists runs_log_edit on public.runs;
create trigger runs_log_edit
  after update or delete on public.runs
  for each row execute function public.log_run_edit();


-- ============================================================================
--  6. RLS
-- ----------------------------------------------------------------------------
--  ใช้ current_profile_status() กับ current_user_is_admin() จาก schema.sql
--  ซึ่งเป็น security definer จึงข้าม RLS ของ profiles ไปเลย
--  policy พวกนี้อยู่บนตาราง runs ไม่ใช่ profiles และไม่ได้ select runs ซ้ำ
--  จึงไม่เกิด infinite recursion
--
--  คนที่ pending / blocked / removed ตกเงื่อนไข status = 'approved' ทุกข้อ
--  เลยทำอะไรกับตารางพวกนี้ไม่ได้เลย ทั้งอ่านและเขียน
-- ============================================================================

alter table public.rounds    enable row level security;
alter table public.runs      enable row level security;
alter table public.run_edits enable row level security;

-- ระบุสิทธิ์ระดับตารางให้ชัด ไม่พึ่ง default privileges ของ Supabase
-- anon คือคนที่ยังไม่ล็อกอิน ไม่ควรแตะอะไรตรงนี้เลย
-- ส่วน authenticated ได้สิทธิ์ระดับตาราง แล้วค่อยให้ RLS ข้างล่างเป็นตัวกรองจริง
revoke all on public.rounds    from anon;
revoke all on public.runs      from anon;
revoke all on public.run_edits from anon;

grant select, update                  on public.rounds    to authenticated;
grant select, insert, update, delete  on public.runs      to authenticated;
grant select                          on public.run_edits to authenticated;

-- ---- rounds ----------------------------------------------------------------
-- อ่านอย่างเดียว การสร้างรอบใหม่ทำผ่าน current_round() ที่เป็น security definer

drop policy if exists rounds_select_approved on public.rounds;
create policy rounds_select_approved on public.rounds
  for select to authenticated
  using (public.current_profile_status() = 'approved');

drop policy if exists rounds_update_admin on public.rounds;
create policy rounds_update_admin on public.rounds
  for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ---- runs ------------------------------------------------------------------

-- สมาชิกที่อนุมัติแล้วอ่านผลวิ่งของทุกคนได้
drop policy if exists runs_select_approved on public.runs;
create policy runs_select_approved on public.runs
  for select to authenticated
  using (public.current_profile_status() = 'approved');

-- กรอกได้เฉพาะของตัวเอง
drop policy if exists runs_insert_own on public.runs;
create policy runs_insert_own on public.runs
  for insert to authenticated
  with check (
    public.current_profile_status() = 'approved'
    and profile_id = (select auth.uid())
  );

-- แก้ของตัวเอง ส่วนกติกา 24 ชั่วโมงอยู่ที่ trigger ข้อ 4
drop policy if exists runs_update_own on public.runs;
create policy runs_update_own on public.runs
  for update to authenticated
  using (
    public.current_profile_status() = 'approved'
    and profile_id = (select auth.uid())
  )
  with check (profile_id = (select auth.uid()));

drop policy if exists runs_update_admin on public.runs;
create policy runs_update_admin on public.runs
  for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists runs_delete_own on public.runs;
create policy runs_delete_own on public.runs
  for delete to authenticated
  using (
    public.current_profile_status() = 'approved'
    and profile_id = (select auth.uid())
  );

drop policy if exists runs_delete_admin on public.runs;
create policy runs_delete_admin on public.runs
  for delete to authenticated
  using (public.current_user_is_admin());

-- ---- run_edits -------------------------------------------------------------
-- อ่านได้ทุกคนที่อนุมัติแล้ว เขียนไม่ได้เลย มีแต่ trigger ข้อ 5 ที่เขียนได้

drop policy if exists run_edits_select_approved on public.run_edits;
create policy run_edits_select_approved on public.run_edits
  for select to authenticated
  using (public.current_profile_status() = 'approved');


-- ============================================================================
--  7. กระดานระยะรวม
-- ----------------------------------------------------------------------------
--  PostgREST ทำ group by ตรงๆ ไม่ได้ เลยรวมยอดให้เสร็จในฟังก์ชันนี้เลย
--  left join ทำให้คนที่ยังไม่ได้วิ่งเลยเดือนนี้ยังอยู่บนกระดาน ได้ 0 กม.
--  rank() ทำให้คนที่ระยะเท่ากันได้อันดับเท่ากัน
--
--  เช็ก current_profile_status() ซ้ำในฟังก์ชันด้วย เพราะ security definer
--  ข้าม RLS ไปแล้ว ถ้าไม่เช็กเอง คนที่ยังไม่อนุมัติจะเห็นกระดานได้
--
--  หมายเหตุ: ในตัวฟังก์ชันอ้างชื่อคอลัมน์แบบเติมชื่อตารางนำหน้าทุกจุด
--  (p.nickname ไม่ใช่ nickname เฉยๆ) เพราะชื่อคอลัมน์ผลลัพธ์ของ returns table
--  ถือเป็นพารามิเตอร์ออก ถ้าเขียนลอยๆ แล้วบังเอิญชื่อชนกับคอลัมน์จริง
--  Postgres จะฟ้อง column reference is ambiguous
-- ============================================================================

create or replace function public.month_leaderboard(target_month date default null)
returns table (
  member_id   uuid,
  nickname    text,
  avatar_url  text,
  is_admin    boolean,
  total_km    numeric,
  run_count   bigint,
  rank_no     bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with picked as (
    select coalesce(target_month, public.current_month_bkk()) as month
  ),
  totals as (
    select p.id            as member_id,
           p.nickname      as nickname,
           p.avatar_url    as avatar_url,
           p.is_admin      as is_admin,
           coalesce(sum(r.distance_km), 0)::numeric as total_km,
           count(r.id)     as run_count
      from public.profiles p
      left join public.runs r
        on r.profile_id = p.id
       and r.round_id in (
             select rd.id from public.rounds rd, picked
              where rd.month = picked.month
           )
     where p.status = 'approved'
     group by p.id, p.nickname, p.avatar_url, p.is_admin
  )
  select t.member_id,
         t.nickname,
         t.avatar_url,
         t.is_admin,
         t.total_km,
         t.run_count,
         rank() over (order by t.total_km desc) as rank_no
    from totals t
   where public.current_profile_status() = 'approved'
   order by t.total_km desc, t.nickname;
$$;

grant execute on function public.month_leaderboard(date) to authenticated;


-- ============================================================================
--  8. Storage: บัคเก็ต proofs
-- ----------------------------------------------------------------------------
--  public = false ต่างจากบัคเก็ต avatars เพราะรูปหลักฐานควรเห็นได้เฉพาะ
--  สมาชิกที่อนุมัติแล้ว ถ้าตั้งเป็น public ใครได้ลิงก์ไปก็เปิดดูได้หมด
--  เว็บจึงต้องขอ signed url ตอนจะแสดงผลทุกครั้ง
--
--  file_size_limit 512000 ไบต์ = 500KB เป็นด่านสุดท้าย ฝั่งเว็บย่อมาก่อนแล้ว
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  false,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- สมาชิกที่อนุมัติแล้วดูได้ทุกรูป
drop policy if exists proofs_select_approved on storage.objects;
create policy proofs_select_approved on storage.objects
  for select to authenticated
  using (
    bucket_id = 'proofs'
    and public.current_profile_status() = 'approved'
  );

-- อัปได้เฉพาะในโฟลเดอร์ที่ชื่อตรงกับ user id ของตัวเอง
drop policy if exists proofs_insert_own on storage.objects;
create policy proofs_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and public.current_profile_status() = 'approved'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists proofs_update_own on storage.objects;
create policy proofs_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists proofs_delete_own on storage.objects;
create policy proofs_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run ทีละอัน)
-- ============================================================================

-- เดือนปัจจุบันตามเวลาไทย เทียบกับที่ฐานข้อมูลคิดเอง
-- ควรต่างกันได้ช่วงเที่ยงคืนถึงตีเจ็ดของวันที่ 1 เท่านั้น
-- select public.current_month_bkk() as เดือนไทย,
--        date_trunc('month', now())::date as เดือน_utc,
--        public.today_bkk() as วันนี้ไทย;

-- สร้างรอบของเดือนนี้ (ถ้ายังไม่มี) แล้วดูผล
-- select * from public.current_round();

-- ดูกระดาน ต้องรันตอนล็อกอินผ่านเว็บถึงจะมีข้อมูล
-- ถ้ารันใน SQL Editor จะได้ 0 แถว เพราะ auth.uid() เป็น null
-- select * from public.month_leaderboard();

-- ดูรอบทั้งหมด
-- select month, status, created_at from public.rounds order by month desc;

-- ปิดรอบเดือนที่แล้ว หลังจากเก็บผลครบแล้ว (ปิดแล้วห้ามกรอกเข้าไปอีก ไม่ว่าใคร)
-- update public.rounds set status = 'closed'
--  where month = (public.current_month_bkk() - interval '1 month')::date;

-- เปิดรอบกลับ กรณีต้องแก้ข้อมูลย้อนหลังจริงๆ
-- update public.rounds set status = 'open' where month = '2026-09-01';
