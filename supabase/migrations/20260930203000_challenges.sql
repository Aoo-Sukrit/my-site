-- ============================================================================
--  AOOOKULELE & CO. — คำท้า (ส่วนที่ 2 ของแท็บรางวัล)
-- ----------------------------------------------------------------------------
--  คนหนึ่งท้าอีกคนว่า "ระยะรวมเดือนนี้ต้องถึง X กม." แล้ววางเบียร์ไว้ N ขวด
--  อีกฝ่ายต้องกดรับก่อนถึงจะเริ่ม พอรับแล้วคนอื่นมาลงเพิ่มข้างไหนก็ได้
--  ตอนตัดสินใช้ระยะรวมทั้งเดือนจริงๆ ไม่มีใครต้องกดว่าใครชนะ
--
--  สารบัญ
--    1. ค่าคงที่เรื่องเวลา (เลข 20 กับวันตัดสิน อยู่ที่นี่ที่เดียว)
--    2. ตาราง challenges และ challenge_stakes
--    3. ตัวช่วย: ระยะรวมของคนหนึ่งในรอบ และสถานะที่คำนวณเอง
--    4. trigger บังคับกติกา
--    5. ปิดประตูตาราง
--    6. ฟังก์ชันอ่าน  round_challenges() / round_challenge_stakes() / round_deadlines()
--    7. ฟังก์ชันเขียน ท้า ยกเลิก รับ ปฏิเสธ ลงเพิ่ม ลบ
--
--  หมายเหตุเรื่องชื่อพารามิเตอร์ (บทเรียนจาก 20260930120000_prizes.sql)
--  ฟังก์ชันเขียนทุกตัวตั้งชื่อพารามิเตอร์ขึ้นต้นด้วย p_ โดยตั้งใจ
--  ถ้าตั้งชื่อตรงกับคอลัมน์ คำสั่ง update ... set bottles = bottles จะกลายเป็น
--  กำหนดค่าตัวเองแล้วไม่มีอะไรเปลี่ยน หรือไม่ก็โดนฟ้องว่าอ้างชื่อกำกวม
-- ============================================================================


-- ============================================================================
--  1. ค่าคงที่เรื่องเวลา
-- ----------------------------------------------------------------------------
--  เลขสองตัวนี้คือ "ที่เดียว" ที่เก็บกติกาเวลาของคำท้า
--  ฝั่งเว็บไม่ได้ก๊อปเลขไปเขียนซ้ำ แต่เรียก round_deadlines() มาเอาเวลาจริง
--  ไปแสดงแทน จะได้ไม่มีทางที่สองฝั่งไม่ตรงกัน
-- ============================================================================

-- วันสุดท้ายของเดือนที่ยังท้า รับ หรือลงเพิ่มได้ (นับถึงสิ้นวันนั้น)
create or replace function public.challenge_join_last_day()
returns int
language sql
immutable
set search_path = ''
as $$ select 20; $$;

comment on function public.challenge_join_last_day() is
  'วันที่ 20 คือวันสุดท้ายที่ยังท้า รับ หรือลงเบียร์เพิ่มได้ '
  'เก็บไว้ที่นี่ที่เดียว ฝั่งเว็บอ่านเวลาจริงจาก round_deadlines() ไปใช้';

-- ช่วงผ่อนผันกรอกผลวิ่งย้อนหลัง ต้องตรงกับ BACKDATE_GRACE_DAYS ใน
-- src/lib/run-rules.ts และกับ trigger enforce_run_entry_window ใน
-- 20260925000003_runs.sql ซึ่งเขียนเลข 3 ไว้ตรงๆ ตั้งแต่ตอนนั้น
create or replace function public.backdate_grace_days()
returns int
language sql
immutable
set search_path = ''
as $$ select 3; $$;

-- สิ้นวันที่ 20 ตามเวลาไทย = เที่ยงคืนตอนขึ้นวันที่ 21
-- เดือนเริ่มที่วันที่ 1 จึงบวกไป 20 วันพอดี
create or replace function public.challenge_lock_at(target_month date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((target_month + public.challenge_join_last_day())::timestamp
          at time zone 'Asia/Bangkok');
$$;

-- เวลาตัดสินของทั้งคำท้าและระบบรางวัล
-- ต้นวันที่ (ผ่อนผัน + 1) ของเดือนถัดไปตามเวลาไทย คือจังหวะแรกที่ไม่มีใคร
-- กรอกผลวิ่งย้อนเข้าเดือนนั้นได้อีกแล้ว ตัวเลขบนกระดานจึงนิ่งจริง
-- ไม่ได้เขียนเลข 4 ตายตัว แต่คำนวณจาก backdate_grace_days()
create or replace function public.round_settle_at(target_month date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (((target_month + interval '1 month')::date
           + public.backdate_grace_days())::timestamp
          at time zone 'Asia/Bangkok');
$$;

comment on function public.round_settle_at(date) is
  'เวลาที่ถือว่าผลของเดือนนั้นนิ่งแล้ว = ต้นวันที่ 4 ของเดือนถัดไป (เวลาไทย) '
  'คำนวณจาก backdate_grace_days() ไม่ได้ฝังเลข 4 ไว้';

grant execute on function public.challenge_join_last_day() to authenticated;
grant execute on function public.backdate_grace_days()     to authenticated;
grant execute on function public.challenge_lock_at(date)   to authenticated;
grant execute on function public.round_settle_at(date)     to authenticated;


-- ============================================================================
--  2. ตาราง
-- ----------------------------------------------------------------------------
--  คอลัมน์ state เก็บแค่สิ่งที่ "มีคนกด" คือ รอรับ ปฏิเสธ ยกเลิก รับแล้ว
--  ส่วน ตกไป / กำลังแข่ง / ถึงแล้ว / ไม่ถึง ไม่ได้เก็บ แต่คำนวณสดตอนอ่าน
--  จาก challenge_status() เพราะสามอันนั้นขึ้นกับเวลาและระยะจริงล้วนๆ
--  ถ้าเก็บไว้ในตารางจะต้องมีอะไรสักอย่างคอยวิ่งมาอัปเดต ซึ่งเป็นจุดที่พังได้
--  และหลังวันตัดสินไม่มีใครกรอกผลวิ่งย้อนเข้าเดือนนั้นได้แล้ว ค่าที่คำนวณสด
--  จึงนิ่งเท่ากับเก็บไว้
--
--  baseline_km คือระยะของคนถูกท้า ณ วินาทีที่ถูกท้า เก็บไว้เพื่อให้ย้อนดูได้
--  ว่าตอนนั้นเหลืออีกเท่าไหร่ และเพื่อกันแก้เป้าย้อนหลังให้ต่ำกว่าของจริง
-- ============================================================================

create table if not exists public.challenges (
  id            uuid         primary key default gen_random_uuid(),
  round_id      uuid         not null references public.rounds (id)   on delete cascade,
  challenger_id uuid         not null references public.profiles (id) on delete cascade,
  runner_id     uuid         not null references public.profiles (id) on delete cascade,

  target_km     numeric(6,2) not null check (target_km > 0 and target_km <= 2000),
  baseline_km   numeric(6,2) not null default 0 check (baseline_km >= 0),
  bottles       int          not null check (bottles between 1 and 12),

  state         text         not null default 'pending'
                             check (state in ('pending', 'accepted', 'declined', 'cancelled')),
  decided_at    timestamptz,

  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),

  constraint challenges_not_self
    check (challenger_id <> runner_id),
  constraint challenges_target_above_baseline
    check (target_km > baseline_km)
);

comment on table public.challenges is
  'คำท้าว่าระยะรวมทั้งเดือนของ runner_id จะถึง target_km หรือไม่ '
  'คำท้าไม่ได้ปิดอุบ ทุกคนเห็นทุกใบตลอดเวลา';

create index if not exists challenges_round_idx  on public.challenges (round_id);
create index if not exists challenges_runner_idx on public.challenges (runner_id, state);

drop trigger if exists challenges_touch_updated_at on public.challenges;
create trigger challenges_touch_updated_at
  before update on public.challenges
  for each row execute function public.touch_updated_at();


-- หนึ่งคนลงได้ฝั่งเดียวต่อหนึ่งคำท้า บังคับด้วย unique ไม่ใช่แค่เช็กในฟังก์ชัน
create table if not exists public.challenge_stakes (
  id           uuid        primary key default gen_random_uuid(),
  challenge_id uuid        not null references public.challenges (id) on delete cascade,
  profile_id   uuid        not null references public.profiles (id)   on delete cascade,
  side         text        not null check (side in ('reach', 'miss')),
  bottles      int         not null check (bottles between 1 and 12),
  created_at   timestamptz not null default now(),

  constraint challenge_stakes_one_side_per_person unique (challenge_id, profile_id)
);

comment on table public.challenge_stakes is
  'เบียร์ที่วางไว้ในคำท้าหนึ่งใบ side reach คือเชื่อว่าถึง miss คือเชื่อว่าไม่ถึง '
  'แถวของคนท้ากับคนถูกท้าถูกสร้างอัตโนมัติตอนกดรับ';

create index if not exists challenge_stakes_challenge_idx
  on public.challenge_stakes (challenge_id);


-- ============================================================================
--  3. ตัวช่วย
-- ============================================================================

-- ระยะรวมของคนหนึ่งในรอบหนึ่ง คิดทั้งเดือน ไม่ได้เริ่มนับจากวันที่ท้า
-- ตรงกับตัวเลขบนกระดานระยะรวม เพราะดึงจากตาราง runs ชุดเดียวกัน
create or replace function public.member_round_km(p_profile_id uuid, p_round_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(r.distance_km), 0)::numeric(10,2)
    from public.runs r
   where r.round_id = p_round_id
     and r.profile_id = p_profile_id;
$$;

grant execute on function public.member_round_km(uuid, uuid) to authenticated;

-- สถานะที่เอาไปโชว์ รวมทั้งเจ็ดแบบ
--   pending   รอรับ        ยังไม่มีใครกด และยังไม่หมดเวลา
--   declined  ปฏิเสธแล้ว   คนถูกท้ากดไม่รับ
--   cancelled ยกเลิกแล้ว   คนท้าถอนเอง
--   expired   ตกไป         ไม่มีใครกดอะไรจนเลยวันสุดท้าย
--   running   กำลังแข่ง    รับแล้ว และยังไม่ถึงเวลาตัดสิน
--   reached   ถึงแล้ว      ตัดสินแล้ว ระยะรวมถึงเป้า
--   missed    ไม่ถึง       ตัดสินแล้ว ระยะรวมไม่ถึงเป้า
create or replace function public.challenge_status(
  p_state    text,
  p_month    date,
  p_target_km numeric,
  p_total_km  numeric
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_state = 'declined'  then 'declined'
    when p_state = 'cancelled' then 'cancelled'
    when p_state = 'pending'   then
      case when now() >= public.challenge_lock_at(p_month)
           then 'expired' else 'pending' end
    when now() < public.round_settle_at(p_month) then 'running'
    when p_total_km >= p_target_km then 'reached'
    else 'missed'
  end;
$$;

grant execute on function public.challenge_status(text, date, numeric, numeric)
  to authenticated;


-- ============================================================================
--  4. trigger บังคับกติกา
-- ----------------------------------------------------------------------------
--  ฟังก์ชันในข้อ 7 เช็กครบอยู่แล้ว trigger นี้เป็นด่านสุดท้าย
--  แบบเดียวกับที่ทำกับ targets และ prizes
-- ============================================================================

create or replace function public.guard_challenge_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  rd public.rounds;
begin
  -- ไม่มี auth.uid() แปลว่ารันจาก SQL Editor หรือ service_role ปล่อยผ่าน
  if me is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    select * into rd from public.rounds where id = new.round_id;
    if rd.id is null then
      raise exception 'ไม่เจอรอบเดือนนี้' using errcode = '42501';
    end if;
    if rd.month <> public.current_month_bkk() then
      raise exception 'ท้าได้เฉพาะรอบเดือนปัจจุบันเท่านั้น' using errcode = '42501';
    end if;
    if now() >= public.challenge_lock_at(rd.month) then
      raise exception 'หมดเวลาท้าของเดือนนี้แล้ว' using errcode = '42501';
    end if;
    if new.challenger_id is distinct from me then
      raise exception 'ท้าในนามคนอื่นไม่ได้' using errcode = '42501';
    end if;
    if new.challenger_id = new.runner_id then
      raise exception 'ท้าตัวเองไม่ได้' using errcode = '42501';
    end if;
    if new.state <> 'pending' then
      raise exception 'คำท้าใหม่ต้องเริ่มที่สถานะรอรับ' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- ย้ายคู่ ย้ายรอบ ขยับเป้า หรือเพิ่มเบียร์ของตัวเองย้อนหลังไม่ได้ ไม่ว่าใคร
    new.round_id      := old.round_id;
    new.challenger_id := old.challenger_id;
    new.runner_id     := old.runner_id;
    new.target_km     := old.target_km;
    new.baseline_km   := old.baseline_km;
    new.bottles       := old.bottles;
    new.created_at    := old.created_at;

    if new.state is distinct from old.state then
      if old.state <> 'pending' then
        raise exception 'คำท้าใบนี้ตัดสินใจไปแล้ว เปลี่ยนไม่ได้'
          using errcode = '42501';
      end if;

      select * into rd from public.rounds where id = old.round_id;
      if new.state = 'accepted' then
        if me <> old.runner_id then
          raise exception 'มีแต่คนที่ถูกท้าเท่านั้นที่กดรับได้' using errcode = '42501';
        end if;
        if now() >= public.challenge_lock_at(rd.month) then
          raise exception 'หมดเวลารับคำท้าของเดือนนี้แล้ว' using errcode = '42501';
        end if;
      elsif new.state = 'declined' then
        if me <> old.runner_id then
          raise exception 'มีแต่คนที่ถูกท้าเท่านั้นที่ปฏิเสธได้' using errcode = '42501';
        end if;
      elsif new.state = 'cancelled' then
        if me <> old.challenger_id then
          raise exception 'มีแต่คนท้าเท่านั้นที่ยกเลิกได้' using errcode = '42501';
        end if;
      else
        raise exception 'สถานะไม่ถูกต้อง' using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  -- DELETE — เฉพาะแอดมิน ถอนคำท้าที่รับแล้วไม่ได้แม้แต่คนท้าเอง
  if not public.current_user_is_admin() then
    raise exception 'ลบคำท้าได้เฉพาะแอดมิน ถ้ายังไม่มีใครกดรับให้กดยกเลิกแทน'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists challenges_guard on public.challenges;
create trigger challenges_guard
  before insert or update or delete on public.challenges
  for each row execute function public.guard_challenge_write();


-- เบียร์ที่วางแล้วถอนไม่ได้เลย จึงไม่มีทางแก้และไม่มีทางลบ ยกเว้นแอดมินลบทั้งใบ
create or replace function public.guard_stake_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  ch public.challenges;
  rd public.rounds;
begin
  if me is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'เบียร์ที่วางไปแล้วแก้ไม่ได้' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    -- เกิดได้ทางเดียวคือแอดมินลบคำท้าทั้งใบแล้ว cascade ลงมา
    if not public.current_user_is_admin() then
      raise exception 'ถอนเบียร์ที่วางไปแล้วไม่ได้' using errcode = '42501';
    end if;
    return old;
  end if;

  select * into ch from public.challenges where id = new.challenge_id;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.state <> 'accepted' then
    raise exception 'คำท้าใบนี้ยังไม่ได้เริ่ม ลงเบียร์ไม่ได้' using errcode = '42501';
  end if;

  select * into rd from public.rounds where id = ch.round_id;
  if now() >= public.challenge_lock_at(rd.month) then
    raise exception 'หมดเวลาลงเบียร์ของเดือนนี้แล้ว' using errcode = '42501';
  end if;

  -- ลงในนามตัวเองเท่านั้น ยกเว้นแถวของคนท้าที่ถูกสร้างตอนคนถูกท้ากดรับ
  if new.profile_id <> me
     and not (new.profile_id = ch.challenger_id and ch.runner_id = me) then
    raise exception 'ลงเบียร์ในนามคนอื่นไม่ได้' using errcode = '42501';
  end if;

  -- คู่กรณีสองคนถูกล็อกทั้งฝั่งและจำนวน เพิ่มทีหลังไม่ได้
  if new.profile_id = ch.challenger_id then
    if new.side <> 'miss' or new.bottles <> ch.bottles then
      raise exception 'คนท้าอยู่ฝั่งไม่ถึงด้วยจำนวนเท่าที่ตั้งไว้เท่านั้น'
        using errcode = '42501';
    end if;
  elsif new.profile_id = ch.runner_id then
    if new.side <> 'reach' or new.bottles <> ch.bottles then
      raise exception 'คนถูกท้าอยู่ฝั่งถึงด้วยจำนวนเท่ากับคนท้าเท่านั้น'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists challenge_stakes_guard on public.challenge_stakes;
create trigger challenge_stakes_guard
  before insert or update or delete on public.challenge_stakes
  for each row execute function public.guard_stake_write();


-- ============================================================================
--  5. ปิดประตูตาราง
-- ----------------------------------------------------------------------------
--  คำท้าไม่ได้ปิดอุบ ทุกคนเห็นทุกอย่างตลอด แต่ยังปิดสิทธิ์ตารางอยู่ดี
--  เพราะการ "เห็น" กับการ "เขียน" คนละเรื่องกัน ถ้าเปิด insert/update ตรงได้
--  ใครก็ยิง POST /rest/v1/challenges เองแล้วข้ามกติกาเวลาทั้งหมดได้เลย
--  ทางเข้าออกจึงมีทางเดียวคือฟังก์ชันในข้อ 6 และ 7
-- ============================================================================

revoke all on public.challenges       from anon, authenticated;
revoke all on public.challenge_stakes from anon, authenticated;

alter table public.challenges       enable row level security;
alter table public.challenge_stakes enable row level security;


-- ============================================================================
--  6. ฟังก์ชันอ่าน
-- ============================================================================

-- เวลาสำคัญของรอบเดือนหนึ่ง ฝั่งเว็บเรียกอันนี้แทนการก๊อปเลข 20 กับ 4 ไปเขียนเอง
create or replace function public.round_deadlines(target_month date default null)
returns table (
  month      date,
  lock_at    timestamptz,
  settle_at  timestamptz,
  month_end  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with picked as (
    select coalesce(target_month, public.current_month_bkk()) as m
  )
  select picked.m,
         public.challenge_lock_at(picked.m),
         public.round_settle_at(picked.m),
         public.round_month_end(picked.m)
    from picked;
$$;

grant execute on function public.round_deadlines(date) to authenticated;


drop function if exists public.round_challenges(date);
create function public.round_challenges(target_month date default null)
returns table (
  challenge_id           uuid,
  round_month            date,
  challenger_id          uuid,
  challenger_nickname    text,
  challenger_avatar_url  text,
  runner_id              uuid,
  runner_nickname        text,
  runner_avatar_url      text,
  target_km              numeric,
  baseline_km            numeric,
  bottles                int,
  status                 text,
  runner_total_km        numeric,
  reach_bottles          int,
  miss_bottles           int,
  my_side                text,
  i_am_challenger        boolean,
  i_am_runner            boolean,
  lock_at                timestamptz,
  settle_at              timestamptz,
  created_at             timestamptz,
  decided_at             timestamptz
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
  select c.id,
         rd.month,
         c.challenger_id,
         pc.nickname,
         pc.avatar_url,
         c.runner_id,
         pr.nickname,
         pr.avatar_url,
         c.target_km,
         c.baseline_km,
         c.bottles,
         public.challenge_status(c.state, rd.month, c.target_km, tot.km),
         tot.km,
         coalesce(agg.reach, 0)::int,
         coalesce(agg.miss, 0)::int,
         mine.side,
         c.challenger_id = me.id,
         c.runner_id = me.id,
         public.challenge_lock_at(rd.month),
         public.round_settle_at(rd.month),
         c.created_at,
         c.decided_at
    from public.challenges c
    join public.rounds rd  on rd.id = c.round_id
    join public.profiles pc on pc.id = c.challenger_id
    join public.profiles pr on pr.id = c.runner_id
    cross join me
    cross join picked
    left join lateral (
      select public.member_round_km(c.runner_id, c.round_id) as km
    ) tot on true
    left join lateral (
      select sum(s.bottles) filter (where s.side = 'reach') as reach,
             sum(s.bottles) filter (where s.side = 'miss')  as miss
        from public.challenge_stakes s
       where s.challenge_id = c.id
    ) agg on true
    left join public.challenge_stakes mine
           on mine.challenge_id = c.id
          and mine.profile_id = me.id
   where rd.month = picked.month
   order by
     -- กำลังแข่ง → รอรับ → ตัดสินแล้ว → ที่ไม่ได้เกิดขึ้น
     case public.challenge_status(c.state, rd.month, c.target_km, tot.km)
       when 'running'   then 0
       when 'pending'   then 1
       when 'reached'   then 2
       when 'missed'    then 2
       else 3
     end,
     c.created_at desc;
$$;

grant execute on function public.round_challenges(date) to authenticated;


-- เบียร์ทุกก้อนของทุกใบในเดือนนั้น ฝั่งเว็บจับกลุ่มตาม challenge_id เอง
drop function if exists public.round_challenge_stakes(date);
create function public.round_challenge_stakes(target_month date default null)
returns table (
  challenge_id uuid,
  profile_id   uuid,
  nickname     text,
  avatar_url   text,
  side         text,
  bottles      int,
  is_me        boolean,
  created_at   timestamptz
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
  select s.challenge_id,
         s.profile_id,
         p.nickname,
         p.avatar_url,
         s.side,
         s.bottles,
         s.profile_id = me.id,
         s.created_at
    from public.challenge_stakes s
    join public.challenges c on c.id = s.challenge_id
    join public.rounds rd    on rd.id = c.round_id
    join public.profiles p   on p.id = s.profile_id
    cross join me
    cross join picked
   where rd.month = picked.month
   order by s.created_at;
$$;

grant execute on function public.round_challenge_stakes(date) to authenticated;


-- คนที่ท้าได้ พร้อมระยะรวมตอนนี้ ใช้ในหน้า /club/challenges/new
drop function if exists public.challengeable_members();
create function public.challengeable_members()
returns table (
  member_id  uuid,
  nickname   text,
  caption    text,
  avatar_url text,
  total_km   numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  rd as (select id, month from public.rounds where month = public.current_month_bkk())
  select p.id,
         p.nickname,
         p.caption,
         p.avatar_url,
         coalesce(public.member_round_km(p.id, rd.id), 0)
    from public.profiles p
    cross join me
    left join rd on true
   where p.status = 'approved'
     and p.id <> me.id
   order by p.nickname;
$$;

grant execute on function public.challengeable_members() to authenticated;


-- ============================================================================
--  7. ฟังก์ชันเขียน
-- ============================================================================

create or replace function public.create_challenge(
  p_runner_id uuid,
  p_target_km numeric,
  p_bottles   int
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me       uuid := public.require_approved_member();
  rd       public.rounds := public.current_round();
  runner   public.profiles;
  v_total  numeric;
  new_id   uuid;
begin
  if now() >= public.challenge_lock_at(rd.month) then
    raise exception 'หมดเวลาท้าของเดือนนี้แล้ว ท้าได้ถึงสิ้นวันที่ % ของเดือน',
      public.challenge_join_last_day()
      using errcode = '42501';
  end if;

  if p_runner_id = me then
    raise exception 'ท้าตัวเองไม่ได้' using errcode = '42501';
  end if;

  select * into runner from public.profiles where id = p_runner_id;
  if runner.id is null or runner.status <> 'approved' then
    raise exception 'ท้าได้เฉพาะสมาชิกที่อนุมัติแล้วเท่านั้น' using errcode = '42501';
  end if;

  if p_bottles is null or p_bottles < 1 or p_bottles > 12 then
    raise exception 'วางเบียร์ได้ตั้งแต่ 1 ถึง 12 ขวด' using errcode = '42501';
  end if;

  if p_target_km is null or p_target_km <= 0 or p_target_km > 2000 then
    raise exception 'ระยะเป้าต้องอยู่ระหว่าง 0.01 ถึง 2000 กม.' using errcode = '42501';
  end if;

  v_total := public.member_round_km(p_runner_id, rd.id);

  if p_target_km <= v_total then
    raise exception 'ตอนนี้ % วิ่งไปแล้ว % กม. ตั้งเป้าให้มากกว่านี้',
      runner.nickname, to_char(v_total, 'FM999990.00')
      using errcode = '42501';
  end if;

  insert into public.challenges (
    round_id, challenger_id, runner_id, target_km, baseline_km, bottles
  )
  values (rd.id, me, p_runner_id, p_target_km, v_total, p_bottles)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_challenge(uuid, numeric, int) to authenticated;


create or replace function public.cancel_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  ch public.challenges;
begin
  select * into ch from public.challenges where id = p_challenge_id;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.challenger_id <> me then
    raise exception 'มีแต่คนท้าเท่านั้นที่ยกเลิกได้' using errcode = '42501';
  end if;
  if ch.state <> 'pending' then
    raise exception 'คำท้าใบนี้ไม่ได้อยู่ในสถานะรอรับแล้ว ยกเลิกไม่ได้'
      using errcode = '42501';
  end if;

  update public.challenges
     set state = 'cancelled', decided_at = now()
   where id = p_challenge_id;
end;
$$;

grant execute on function public.cancel_challenge(uuid) to authenticated;


create or replace function public.decline_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  ch public.challenges;
begin
  select * into ch from public.challenges where id = p_challenge_id;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.runner_id <> me then
    raise exception 'มีแต่คนที่ถูกท้าเท่านั้นที่ปฏิเสธได้' using errcode = '42501';
  end if;
  if ch.state <> 'pending' then
    raise exception 'คำท้าใบนี้ไม่ได้อยู่ในสถานะรอรับแล้ว' using errcode = '42501';
  end if;

  update public.challenges
     set state = 'declined', decided_at = now()
   where id = p_challenge_id;
end;
$$;

grant execute on function public.decline_challenge(uuid) to authenticated;


-- กดรับแล้วเกมเริ่มทันที และวางเบียร์ให้คู่กรณีทั้งสองฝั่งเองเลย
-- คนท้าอยู่ฝั่งไม่ถึง คนถูกท้าอยู่ฝั่งถึง จำนวนเท่ากันตามที่ตั้งไว้
create or replace function public.accept_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  ch public.challenges;
  rd public.rounds;
begin
  select * into ch from public.challenges where id = p_challenge_id;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.runner_id <> me then
    raise exception 'มีแต่คนที่ถูกท้าเท่านั้นที่กดรับได้' using errcode = '42501';
  end if;
  if ch.state <> 'pending' then
    raise exception 'คำท้าใบนี้ไม่ได้อยู่ในสถานะรอรับแล้ว' using errcode = '42501';
  end if;

  select * into rd from public.rounds where id = ch.round_id;
  if now() >= public.challenge_lock_at(rd.month) then
    raise exception 'หมดเวลารับคำท้าของเดือนนี้แล้ว คำท้าใบนี้ตกไป'
      using errcode = '42501';
  end if;

  update public.challenges
     set state = 'accepted', decided_at = now()
   where id = p_challenge_id;

  insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
  values (ch.id, ch.runner_id,     'reach', ch.bottles),
         (ch.id, ch.challenger_id, 'miss',  ch.bottles)
  on conflict (challenge_id, profile_id) do nothing;
end;
$$;

grant execute on function public.accept_challenge(uuid) to authenticated;


create or replace function public.join_challenge(
  p_challenge_id uuid,
  p_side         text,
  p_bottles      int
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  ch public.challenges;
  rd public.rounds;
begin
  select * into ch from public.challenges where id = p_challenge_id;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.state <> 'accepted' then
    raise exception 'คำท้าใบนี้ยังไม่ได้เริ่ม ลงเบียร์ไม่ได้' using errcode = '42501';
  end if;

  select * into rd from public.rounds where id = ch.round_id;
  if now() >= public.challenge_lock_at(rd.month) then
    raise exception 'หมดเวลาลงเบียร์ของเดือนนี้แล้ว ลงได้ถึงสิ้นวันที่ % ของเดือน',
      public.challenge_join_last_day()
      using errcode = '42501';
  end if;

  if me = ch.challenger_id or me = ch.runner_id then
    raise exception 'คนท้ากับคนถูกท้าวางเบียร์ไว้ตั้งแต่ต้นแล้ว ลงเพิ่มไม่ได้'
      using errcode = '42501';
  end if;

  if p_side not in ('reach', 'miss') then
    raise exception 'เลือกข้างก่อนว่าถึงแน่หรือไม่ถึงแน่' using errcode = '42501';
  end if;

  if p_bottles is null or p_bottles < 1 or p_bottles > 12 then
    raise exception 'วางเบียร์ได้ตั้งแต่ 1 ถึง 12 ขวด' using errcode = '42501';
  end if;

  if exists (select 1 from public.challenge_stakes
              where challenge_id = p_challenge_id and profile_id = me) then
    raise exception 'ลงไปแล้วหนึ่งข้าง ลงซ้ำหรือย้ายข้างไม่ได้'
      using errcode = '42501';
  end if;

  insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
  values (p_challenge_id, me, p_side, p_bottles);
end;
$$;

grant execute on function public.join_challenge(uuid, text, int) to authenticated;


-- แอดมินลบได้ตลอด เผื่อมีคำท้าที่ไม่เหมาะสม เบียร์ที่วางไว้ cascade หายตาม
create or replace function public.admin_delete_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.require_approved_member();

  if not public.current_user_is_admin() then
    raise exception 'เฉพาะแอดมินเท่านั้น' using errcode = '42501';
  end if;

  delete from public.challenges where id = p_challenge_id;
end;
$$;

grant execute on function public.admin_delete_challenge(uuid) to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ตารางถูกปิดสิทธิ์จริงไหม ควรได้ 0 แถว
-- select grantee, privilege_type from information_schema.table_privileges
--  where table_schema = 'public'
--    and table_name in ('challenges', 'challenge_stakes')
--    and grantee in ('anon', 'authenticated');

-- เดือนนี้ปิดรับตอนไหน และตัดสินตอนไหน (ควรได้วันที่ 21 00:00 กับวันที่ 4 00:00)
-- select month,
--        lock_at   at time zone 'Asia/Bangkok' as ปิดรับ,
--        settle_at at time zone 'Asia/Bangkok' as ตัดสิน,
--        month_end at time zone 'Asia/Bangkok' as สิ้นเดือน
--   from public.round_deadlines();

-- คำท้าเดือนนี้มีอะไรบ้าง (รันจาก SQL Editor เห็นดิบทุกอย่าง)
-- select pc.nickname as คนท้า, pr.nickname as คนถูกท้า,
--        c.target_km, c.baseline_km, c.bottles, c.state,
--        public.member_round_km(c.runner_id, c.round_id) as ระยะตอนนี้,
--        public.challenge_status(c.state, rd.month, c.target_km,
--          public.member_round_km(c.runner_id, c.round_id)) as สถานะ
--   from public.challenges c
--   join public.rounds rd    on rd.id = c.round_id
--   join public.profiles pc  on pc.id = c.challenger_id
--   join public.profiles pr  on pr.id = c.runner_id
--  where rd.month = public.current_month_bkk()
--  order by c.created_at desc;
