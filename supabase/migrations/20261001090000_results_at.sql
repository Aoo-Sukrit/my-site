-- ============================================================================
--  AOOOKULELE & CO. — เวลาตัดสินผลที่แอดมินตั้งได้ (rounds.results_at)
-- ----------------------------------------------------------------------------
--  เดิมกติกาเวลาของแต่ละรอบกระจายอยู่สามที่และเป็นเลขตายตัวทั้งหมด
--    - กรอกผลย้อนหลังได้ถึงวันที่ 3 ของเดือนถัดไป (เลข 3 ใน trigger ของ runs)
--    - ตัดสินรางวัลกับคำท้าวันที่ 4 (backdate_grace_days() + 1)
--  ปัญหาคือเลื่อนไม่ได้ ถ้าเดือนไหนคนกรอกไม่ทันต้อง deploy ใหม่อย่างเดียว
--
--  รอบนี้ยุบให้เหลือค่าเดียวคือ rounds.results_at ซึ่งแอดมินแก้ได้จากหน้าเว็บ
--  ค่าเริ่มต้นคือเที่ยงวันที่ 1 ของเดือนถัดไป เวลาไทย
--
--  results_at คุมสี่อย่างพร้อมกัน
--    1. กรอกผลวิ่งของเดือนนั้นย้อนหลังได้ถึงเวลานี้
--    2. แก้หรือลบผลวิ่งของเดือนนั้นเองได้ไม่เกินเวลานี้ แม้ยังไม่ครบ 24 ชั่วโมง
--    3. รางวัลเปลี่ยนเป็น "ได้ไปแล้ว" ตอนนี้
--    4. คำท้าตัดสินตอนนี้
--  ของขวัญที่ปิดอุบยังเปิดเองตอนสิ้นเดือนเหมือนเดิม ไม่ได้ผูกกับค่านี้
--  วันปิดรับคำท้า (วันที่ 20) ก็ไม่เปลี่ยน
--
--  สารบัญ
--    1. คอลัมน์ results_at และค่าเริ่มต้น
--    2. trigger ตรวจค่า results_at
--    3. round_for_date() ตั้งค่าให้รอบที่เพิ่งสร้าง
--    4. round_settle_at() อ่านจากตารางแทนการคำนวณจากเลข 3
--    5. trigger ของ runs ทั้งกรอกใหม่และแก้
--    6. ฟังก์ชันสำหรับดูเดือนย้อนหลัง
--    7. สิทธิ์
-- ============================================================================


-- ============================================================================
--  1. คอลัมน์ results_at
-- ----------------------------------------------------------------------------
--  เติมค่าให้รอบเดิมทุกรอบก่อน แล้วค่อยบังคับ not null
--  รอบที่ผ่านไปแล้วจะได้เวลาตัดสินย้อนหลัง ซึ่งผ่านมานานแล้ว = ตัดสินไปแล้ว
--  ตรงกับความเป็นจริง ไม่ได้ทำให้เดือนเก่ากลับมาแก้ได้
-- ============================================================================

/** ค่าเริ่มต้นของเวลาตัดสิน เที่ยงวันที่ 1 ของเดือนถัดไป เวลาไทย */
create or replace function public.default_results_at(target_month date)
returns timestamptz
language sql
-- stable ไม่ใช่ immutable เพราะการแปลงโซนเวลาอ้างฐานข้อมูลเขตเวลา
stable
set search_path = ''
as $$
  select (((target_month + interval '1 month')::date + time '12:00')
          at time zone 'Asia/Bangkok');
$$;

alter table public.rounds add column if not exists results_at timestamptz;

update public.rounds
   set results_at = public.default_results_at(month)
 where results_at is null;

alter table public.rounds alter column results_at set not null;

comment on column public.rounds.results_at is
  'เวลาตัดสินผลของรอบนี้ แอดมินเลื่อนได้ คุมทั้งการกรอกย้อนหลัง การแก้ผลวิ่ง '
  'การพลิกรางวัลเป็นได้ไปแล้ว และการตัดสินคำท้า ต้องอยู่หลังสิ้นเดือนของรอบ';


-- ============================================================================
--  2. trigger ตรวจค่า
-- ----------------------------------------------------------------------------
--  เช็กเป็น trigger ไม่ใช่ check constraint เพราะการเทียบกับสิ้นเดือนต้องแปลง
--  โซนเวลา ซึ่ง Postgres ถือว่าไม่ immutable จึงใส่ใน check constraint ไม่ได้
-- ============================================================================

create or replace function public.guard_round_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- เดือนของรอบย้ายไม่ได้ ไม่ว่าใคร ย้ายแล้วผลวิ่งทั้งเดือนจะไปผิดที่
  if tg_op = 'UPDATE' then
    new.month := old.month;
  end if;

  if new.results_at <= public.round_month_end(new.month) then
    raise exception 'เวลาตัดสินผลต้องอยู่หลังสิ้นเดือนของรอบนั้น'
      using errcode = '22007';
  end if;

  return new;
end;
$$;

drop trigger if exists rounds_guard on public.rounds;
create trigger rounds_guard
  before insert or update on public.rounds
  for each row execute function public.guard_round_write();


-- ============================================================================
--  3. round_for_date() ตั้งค่าเริ่มต้นให้รอบใหม่
-- ============================================================================

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
  insert into public.rounds (month, results_at)
  values (target_month, public.default_results_at(target_month))
  on conflict (month) do nothing;

  select * into result
    from public.rounds
   where month = target_month;

  return result;
end;
$$;


-- ============================================================================
--  4. round_settle_at() อ่านจากตาราง
-- ----------------------------------------------------------------------------
--  ชื่อเดิม ลายเซ็นเดิม เปลี่ยนแค่ไส้ใน ทุกที่ที่เรียกอยู่แล้วจึงได้ค่าใหม่เอง
--  ทั้ง round_deadlines() ที่หน้าเว็บใช้ และ challenge_status() ที่ตัดสินคำท้า
--
--  ต้องเป็น security definer เพราะตอนนี้ไปอ่านตาราง rounds ซึ่งมี RLS
--  และตัวมันเองถูกเรียกจากในฟังก์ชัน definer ตัวอื่นอยู่แล้ว
-- ============================================================================

create or replace function public.round_settle_at(target_month date)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.results_at from public.rounds r where r.month = target_month),
    public.default_results_at(target_month)
  );
$$;

comment on function public.round_settle_at(date) is
  'เวลาตัดสินผลของรอบนั้น อ่านจาก rounds.results_at ที่แอดมินตั้งได้ '
  'ถ้ายังไม่มีรอบก็คืนค่าเริ่มต้น เที่ยงวันที่ 1 ของเดือนถัดไป';

comment on function public.backdate_grace_days() is
  'เลิกใช้แล้ว กติกาย้อนหลังย้ายไปอยู่ที่ rounds.results_at ตั้งแต่ '
  '20261001090000_results_at.sql เก็บไว้เพราะไฟล์เก่าอ้างถึง';


-- ============================================================================
--  5. trigger ของ runs
-- ============================================================================

-- ----------------------------------------------------------------------------
--  5.1 กรอกใหม่
-- ----------------------------------------------------------------------------
--  กติกาเหลือข้อเดียว กรอกผลของรอบไหนก็ได้ที่ยังไม่ถึงเวลาตัดสินของรอบนั้น
--  เดือนปัจจุบันผ่านเงื่อนไขนี้อยู่แล้วเพราะเวลาตัดสินอยู่เดือนหน้า
--  เดือนก่อนหน้าผ่านจนถึงเที่ยงวันที่ 1 (หรือเวลาที่แอดมินเลื่อนไป)
--  เดือนที่เก่ากว่านั้นเลยเวลาตัดสินไปนานแล้ว จึงกรอกไม่ได้เอง
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
  is_privileged boolean;
  target_round  public.rounds;
begin
  if new.ran_on > today then
    raise exception 'กรอกวันที่ในอนาคตไม่ได้ วันนี้คือ %', today
      using errcode = '22007';
  end if;

  -- หารอบของเดือนที่วิ่งจริง แล้วบังคับใช้ค่านี้เสมอ ไม่เชื่อค่าจากฝั่งเว็บ
  target_round := public.round_for_date(new.ran_on);
  new.round_id := target_round.id;

  -- รันจาก SQL Editor หรือ service_role ถือว่าเป็นทางออกฉุกเฉิน ข้ามกติกาเวลาได้
  -- แต่ยังข้ามเรื่องรอบที่ปิดแล้วไม่ได้ (เช็กทีหลัง)
  is_privileged := (select auth.uid()) is null or public.current_user_is_admin();

  if not is_privileged and now() >= target_round.results_at then
    raise exception
      'ผลวิ่งของเดือน% ตัดสินไปแล้วเมื่อ % กรอกเองไม่ได้ ให้แอดมินช่วยใส่ให้',
      public.thai_month_label(target_month),
      to_char(target_round.results_at at time zone 'Asia/Bangkok',
              'DD/MM/YYYY HH24:MI')
      using errcode = '42501';
  end if;

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
--  5.2 แก้หรือลบ
-- ----------------------------------------------------------------------------
--  เดิมใช้ 24 ชั่วโมงหลังกรอกอย่างเดียว ซึ่งมีช่องโหว่ คนกรอกสามทุ่มวันที่ 31
--  ยังแก้ได้ถึงสามทุ่มวันที่ 1 คือหลังเวลาตัดสินไปแล้วเก้าชั่วโมง
--  ตอนนี้ใช้เวลาที่มาถึงก่อน ระหว่าง 24 ชั่วโมงหลังกรอก กับเวลาตัดสินของรอบนั้น
--  แอดมินยังแก้ได้ตลอดเหมือนเดิม
-- ----------------------------------------------------------------------------

create or replace function public.enforce_run_edit_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rd public.rounds;
begin
  -- ไม่มี auth.uid() แปลว่ารันจาก SQL Editor หรือ service_role ปล่อยผ่าน
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    -- ข้อห้ามชุดนี้ใช้กับทุกคนรวมแอดมิน เพราะเป็นเรื่องความถูกต้องของข้อมูล
    new.profile_id := old.profile_id;
    new.round_id   := old.round_id;
    new.created_at := old.created_at;

    if date_trunc('month', new.ran_on)
       is distinct from date_trunc('month', old.ran_on) then
      raise exception 'แก้วันที่ข้ามเดือนไม่ได้ ถ้ากรอกเดือนผิดให้ลบรายการนี้แล้วกรอกใหม่'
        using errcode = '42501';
    end if;
  end if;

  -- แอดมินแก้ได้ตลอด แต่ยังขึ้นประวัติเหมือนกัน
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

  select * into rd from public.rounds where id = old.round_id;
  if rd.id is not null and now() >= rd.results_at then
    raise exception
      'รอบเดือน% ตัดสินผลไปแล้วเมื่อ % แก้เองไม่ได้ ต้องให้แอดมินช่วยแก้',
      public.thai_month_label(rd.month),
      to_char(rd.results_at at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI')
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
--  6. ฟังก์ชันสำหรับดูเดือนย้อนหลัง
-- ============================================================================

-- เดือนที่มีรอบอยู่จริง ใหม่ไปเก่า และไม่เลยเดือนปัจจุบัน
drop function if exists public.round_months();
create function public.round_months()
returns table (month date, results_at timestamptz, is_current boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.month,
         r.results_at,
         r.month = public.current_month_bkk()
    from public.rounds r
   cross join (select public.require_approved_member() as id) me
   where me.id is not null
     and r.month <= public.current_month_bkk()
   order by r.month desc;
$$;

-- รอบของเดือนที่ระบุ แบบอ่านอย่างเดียว ไม่สร้างรอบใหม่ให้เหมือน round_for_date()
-- เพราะหน้าเลือกเดือนไม่ควรไปสร้างรอบของเดือนที่ไม่เคยมีใครวิ่ง
drop function if exists public.round_by_month(date);
create function public.round_by_month(target_month date)
returns public.rounds
language sql
stable
security definer
set search_path = ''
as $$
  select r.*
    from public.rounds r
   cross join (select public.require_approved_member() as id) me
   where me.id is not null
     and r.month = target_month;
$$;


-- ============================================================================
--  7. สิทธิ์
-- ----------------------------------------------------------------------------
--  Postgres ให้ execute กับ PUBLIC เป็นค่าเริ่มต้นสำหรับฟังก์ชันที่สร้างใหม่
--  ทุกตัวที่แตะในไฟล์นี้จึงต้องถอนแล้วให้เฉพาะเท่าที่จำเป็น
--  ฟังก์ชันของ trigger ไม่ต้องให้ใคร execute
-- ============================================================================

revoke all on function public.guard_round_write()          from public, anon, authenticated;
revoke all on function public.enforce_run_entry_window()   from public, anon, authenticated;
revoke all on function public.enforce_run_edit_window()    from public, anon, authenticated;
revoke all on function public.default_results_at(date)     from public, anon, authenticated;

-- round_settle_at ถูกเรียกจากในฟังก์ชัน definer เท่านั้น ไม่ต้องเปิดให้ใคร
revoke all on function public.round_settle_at(date)        from public, anon, authenticated;

revoke all on function public.round_for_date(date)  from public, anon;
grant execute on function public.round_for_date(date)  to authenticated;

revoke all on function public.round_months()        from public, anon;
grant execute on function public.round_months()        to authenticated;

revoke all on function public.round_by_month(date)  from public, anon;
grant execute on function public.round_by_month(date)  to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- เวลาตัดสินของทุกรอบ ควรเป็นเที่ยงวันที่ 1 ของเดือนถัดไป
-- select month,
--        results_at at time zone 'Asia/Bangkok' as ตัดสิน,
--        status
--   from public.rounds order by month desc;

-- เลื่อนเวลาตัดสินของเดือนกันยายนไปเป็นเที่ยงวันที่ 3 ตุลาคม
-- update public.rounds
--    set results_at = timestamp '2026-10-03 12:00' at time zone 'Asia/Bangkok'
--  where month = date '2026-09-01';

-- ตั้งค่าผิด (ก่อนสิ้นเดือน) ต้องโดนปฏิเสธ
-- update public.rounds
--    set results_at = timestamp '2026-09-15 12:00' at time zone 'Asia/Bangkok'
--  where month = date '2026-09-01';
