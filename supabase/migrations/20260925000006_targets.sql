-- ============================================================================
--  AOOOKULELE & CO. — เกมที่ 1: ตั้งเป้ารายเดือน + เพื่อนโหวตปรับ + กระดาน %
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql, 002_removed.sql, 003_runs.sql,
--  004_profile_fields.sql และ 005_distance_range.sql ที่รันไปแล้ว
--  ไม่ต้องกลับไปรันไฟล์เดิมซ้ำ
--
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง
--
--  สารบัญ
--    1. ช่วงเวลาของรอบ เก็บเป็นข้อมูลในตาราง rounds
--    2. ตาราง targets (เป้าที่ตั้งไว้)
--    3. ตาราง target_votes (โหวตปรับเป้า)
--    4. trigger บังคับกติกา
--    5. ปิดประตูตารางทั้งสอง  << หัวใจของการปิดตา
--    6. ฟังก์ชันสำหรับสมาชิก
--    7. ฟังก์ชันกระดาน
--    8. ฟังก์ชันสำหรับแอดมิน
-- ============================================================================


-- ============================================================================
--  1. ช่วงเวลาของรอบ
-- ----------------------------------------------------------------------------
--  ห้ามฝังวันที่ 1 ถึง 7 ลงในโค้ด เพราะจะเทสวันนี้ไม่ได้ และเวลาใช้จริง
--  ถ้าเพื่อนโหวตไม่ครบก็ต้องเลื่อนปิดได้โดยไม่ต้อง deploy ใหม่
--  ช่วงเวลาจึงเป็นข้อมูลในตาราง rounds ที่หน้าแอดมินแก้ได้
--
--  สถานะของรอบไม่เก็บเป็นคอลัมน์ คำนวณจากสองค่านี้เทียบกับ now() เอา
--    now < opens          ยังไม่เปิด
--    opens <= now < locks เปิดอยู่ ปิดตา
--    now >= locks         เปิดผลแล้ว
--
--  timestamptz เทียบกันแบบเวลาสัมบูรณ์ จึงไม่ต้องกังวลเรื่องโซนตอนเปรียบเทียบ
--  ที่ต้องระวังคือตอน "ตั้งค่าเริ่มต้น" ซึ่งต้องเป็นเที่ยงคืนตามเวลาไทย
--  ไม่ใช่เที่ยงคืน UTC ที่เร็วไป 7 ชั่วโมง
-- ============================================================================

alter table public.rounds add column if not exists target_opens_at timestamptz;
alter table public.rounds add column if not exists target_locks_at timestamptz;

-- เติมค่าให้รอบที่มีอยู่แล้ว วันที่ 1 เวลา 00:00 ถึงวันที่ 8 เวลา 00:00 เวลาไทย
-- (คือหมดเขตปลายวันที่ 7)
update public.rounds
   set target_opens_at = coalesce(
         target_opens_at,
         (month::timestamp at time zone 'Asia/Bangkok')
       ),
       target_locks_at = coalesce(
         target_locks_at,
         ((month + 7)::timestamp at time zone 'Asia/Bangkok')
       )
 where target_opens_at is null
    or target_locks_at is null;

alter table public.rounds alter column target_opens_at set not null;
alter table public.rounds alter column target_locks_at set not null;

alter table public.rounds drop constraint if exists rounds_target_window;
alter table public.rounds
  add constraint rounds_target_window
  check (target_locks_at > target_opens_at);

comment on column public.rounds.target_opens_at is
  'เริ่มให้ตั้งเป้าและโหวตได้ แก้ได้จากหน้าแอดมิน';
comment on column public.rounds.target_locks_at is
  'ปิดรับเป้าและโหวต หลังเวลานี้ผลถึงจะเปิดให้ทุกคนเห็น';

-- rounds ให้สิทธิ์แบบทั้งตารางไว้ตั้งแต่ 003 (grant select, update) คอลัมน์ใหม่
-- จึงได้สิทธิ์ติดมาเอง ไม่เหมือน profiles ที่ให้สิทธิ์รายคอลัมน์
-- และ policy rounds_update_admin เดิมก็เปิดให้แอดมินแก้อยู่แล้ว
-- หน้าแอดมินจึงแก้สองคอลัมน์นี้ได้ตรงๆ ไม่ต้องมีฟังก์ชันเพิ่ม


-- ----------------------------------------------------------------------------
--  round_for_date() ตั้งค่าเริ่มต้นของช่วงเวลาให้รอบที่สร้างใหม่
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
  insert into public.rounds (month, target_opens_at, target_locks_at)
  values (
    target_month,
    (target_month::timestamp at time zone 'Asia/Bangkok'),
    ((target_month + 7)::timestamp at time zone 'Asia/Bangkok')
  )
  on conflict (month) do nothing;

  select * into result
    from public.rounds
   where month = target_month;

  return result;
end;
$$;

grant execute on function public.round_for_date(date) to authenticated;


-- ============================================================================
--  2. ตาราง targets — เป้าที่ตั้งไว้
-- ----------------------------------------------------------------------------
--  คีย์หลักเป็น (round_id, profile_id) ซึ่งทำหน้าที่ unique ไปในตัว
--  หนึ่งคนตั้งเป้าได้รอบละครั้งเดียว
-- ============================================================================

create table if not exists public.targets (
  round_id   uuid         not null references public.rounds (id)   on delete cascade,
  profile_id uuid         not null references public.profiles (id) on delete cascade,
  base_km    numeric(6,2) not null check (base_km >= 5.00 and base_km <= 500.00),
  set_at     timestamptz  not null default now(),
  primary key (round_id, profile_id)
);

comment on table public.targets is
  'เป้าระยะที่สมาชิกตั้งไว้เองในแต่ละรอบ ตั้งแล้วแก้เองไม่ได้ ต้องให้แอดมินรีเซ็ต';


-- ============================================================================
--  3. ตาราง target_votes — โหวตปรับเป้าเพื่อน
-- ----------------------------------------------------------------------------
--  delta เป็นจำนวนเต็ม -5 ถึง +5 และห้ามเป็น 0 เพราะไม่โหวตก็เท่ากับ
--  บอกว่าเป้านั้นเหมาะสมแล้ว การกด 0 จึงไม่มีความหมาย
-- ============================================================================

create table if not exists public.target_votes (
  round_id   uuid        not null references public.rounds (id)   on delete cascade,
  subject_id uuid        not null references public.profiles (id) on delete cascade,
  voter_id   uuid        not null references public.profiles (id) on delete cascade,
  delta      int         not null check (delta between -5 and 5 and delta <> 0),
  created_at timestamptz not null default now(),
  primary key (round_id, subject_id, voter_id),
  constraint target_votes_no_self check (voter_id <> subject_id)
);

create index if not exists target_votes_voter_idx
  on public.target_votes (round_id, voter_id);

comment on table public.target_votes is
  'โหวตปรับเป้าของเพื่อน คนละหนึ่งครั้งต่อหนึ่งเป้า กดแล้วแก้ไม่ได้ลบไม่ได้';


-- ============================================================================
--  4. trigger บังคับกติกา
-- ----------------------------------------------------------------------------
--  ฟังก์ชันในข้อ 6 เช็กเงื่อนไขครบอยู่แล้ว แต่ trigger เป็นด่านสุดท้าย
--  เผื่อวันหนึ่งมีใครเขียนฟังก์ชันใหม่แล้วลืมเช็ก กติกาจะยังอยู่
--
--  auth.uid() เป็น null แปลว่ารันจาก SQL Editor ปล่อยผ่านเป็นทางออกฉุกเฉิน
-- ============================================================================

create or replace function public.guard_target_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rounds;
begin
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    if not public.current_user_is_admin() then
      raise exception 'ตั้งเป้าแล้วแก้เองไม่ได้ ถ้าพิมพ์ผิดจริงๆ ให้แอดมินรีเซ็ตให้'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not public.current_user_is_admin() then
      raise exception 'ลบเป้าเองไม่ได้ ต้องให้แอดมินรีเซ็ตให้'
        using errcode = '42501';
    end if;
    return old;
  end if;

  -- INSERT ต้องอยู่ในช่วงที่รอบเปิด
  select * into r from public.rounds where id = new.round_id;
  if r.id is null then
    raise exception 'ไม่เจอรอบเดือนนี้' using errcode = '42501';
  end if;
  if now() < r.target_opens_at or now() >= r.target_locks_at then
    raise exception 'ตอนนี้ไม่ใช่ช่วงตั้งเป้าของรอบเดือน%',
      public.thai_month_label(r.month)
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists targets_guard on public.targets;
create trigger targets_guard
  before insert or update or delete on public.targets
  for each row execute function public.guard_target_write();


create or replace function public.guard_vote_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rounds;
begin
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- โหวตแล้วแก้ไม่ได้เลย ไม่ว่าใคร เหมือนคำท้า ลงไปแล้วลงเลย
  if tg_op = 'UPDATE' then
    raise exception 'โหวตไปแล้วแก้ไม่ได้'
      using errcode = '42501';
  end if;

  -- ลบได้เฉพาะแอดมิน ไว้ใช้ตอนรีเซ็ตเป้าให้ใครสักคน
  if tg_op = 'DELETE' then
    if not public.current_user_is_admin() then
      raise exception 'โหวตไปแล้วลบไม่ได้'
        using errcode = '42501';
    end if;
    return old;
  end if;

  select * into r from public.rounds where id = new.round_id;
  if r.id is null then
    raise exception 'ไม่เจอรอบเดือนนี้' using errcode = '42501';
  end if;
  if now() < r.target_opens_at or now() >= r.target_locks_at then
    raise exception 'หมดเวลาโหวตของรอบเดือน%แล้ว',
      public.thai_month_label(r.month)
      using errcode = '42501';
  end if;

  -- โหวตได้เฉพาะเป้าที่ตั้งไว้แล้วเท่านั้น
  if not exists (
    select 1 from public.targets t
     where t.round_id = new.round_id and t.profile_id = new.subject_id
  ) then
    raise exception 'คนนี้ยังไม่ได้ตั้งเป้า โหวตไม่ได้'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists target_votes_guard on public.target_votes;
create trigger target_votes_guard
  before insert or update or delete on public.target_votes
  for each row execute function public.guard_vote_write();


-- ============================================================================
--  5. ปิดประตูตารางทั้งสอง   << หัวใจของการปิดตา
-- ----------------------------------------------------------------------------
--  ถ้าแค่ไม่แสดงผลในหน้าเว็บ คนที่เปิด devtools หรือยิง API ตรงจะเห็นเป้า
--  และโหวตของเพื่อนหมด แล้วเกมพังทั้งเกม การซ่อนจึงต้องอยู่ที่ฐานข้อมูล
--
--  วิธีที่แน่นอนที่สุดคือไม่ให้สิทธิ์อะไรเลยกับ anon และ authenticated
--  PostgREST จึง query สองตารางนี้ตรงๆ ไม่ได้เลยไม่ว่าจะพยายามแค่ไหน
--  ทางเข้าออกมีทางเดียวคือฟังก์ชัน security definer ในข้อ 6 ถึง 8
--  ซึ่งคัดแล้วว่าคืนอะไรได้บ้างในแต่ละช่วงเวลา
--
--  เปิด RLS ไว้ด้วยโดยไม่มี policy เป็นชั้นที่สอง เผื่อวันหนึ่งมีใคร
--  เผลอ grant สิทธิ์กลับเข้าไป ตารางก็ยังปิดอยู่
-- ============================================================================

revoke all on public.targets      from anon, authenticated;
revoke all on public.target_votes from anon, authenticated;

alter table public.targets      enable row level security;
alter table public.target_votes enable row level security;


-- ============================================================================
--  6. ฟังก์ชันสำหรับสมาชิก
-- ----------------------------------------------------------------------------
--  ทุกตัวเช็ก current_profile_status() = 'approved' ก่อนเสมอ
--  และอ่านช่วงเวลาจากตาราง rounds ทุกครั้ง ไม่เชื่อค่าที่ส่งมาจากหน้าเว็บ
-- ============================================================================

-- ตัวช่วยกลาง ใช้ซ้ำในทุกฟังก์ชันข้างล่าง
create or replace function public.require_approved_member()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน' using errcode = '42501';
  end if;
  if public.current_profile_status() is distinct from 'approved' then
    raise exception 'เฉพาะสมาชิกที่อนุมัติแล้วเท่านั้น' using errcode = '42501';
  end if;
  return me;
end;
$$;

grant execute on function public.require_approved_member() to authenticated;


-- ---- ตั้งเป้า ---------------------------------------------------------------

create or replace function public.set_my_target(km numeric)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  r  public.rounds := public.current_round();
begin
  if now() < r.target_opens_at then
    raise exception 'ยังไม่ถึงเวลาตั้งเป้าของรอบเดือน%',
      public.thai_month_label(r.month) using errcode = '42501';
  end if;
  if now() >= r.target_locks_at then
    raise exception 'หมดเวลาตั้งเป้าของรอบเดือน%แล้ว',
      public.thai_month_label(r.month) using errcode = '42501';
  end if;

  if km is null or km < 5.00 or km > 500.00 then
    raise exception 'เป้าต้องอยู่ระหว่าง 5 ถึง 500 กม.' using errcode = '42501';
  end if;

  insert into public.targets (round_id, profile_id, base_km)
  values (r.id, me, round(km, 2));

exception
  when unique_violation then
    raise exception 'ตั้งเป้าของเดือนนี้ไปแล้ว แก้เองไม่ได้ ถ้าพิมพ์ผิดจริงๆ ให้แอดมินรีเซ็ตให้'
      using errcode = '42501';
end;
$$;

grant execute on function public.set_my_target(numeric) to authenticated;


-- ---- โหวตปรับเป้าเพื่อน ------------------------------------------------------

create or replace function public.vote_on_target(subject uuid, delta int)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  r  public.rounds := public.current_round();
begin
  if now() < r.target_opens_at or now() >= r.target_locks_at then
    raise exception 'ตอนนี้ไม่ใช่ช่วงโหวตของรอบเดือน%',
      public.thai_month_label(r.month) using errcode = '42501';
  end if;

  if subject is null or subject = me then
    raise exception 'โหวตเป้าตัวเองไม่ได้' using errcode = '42501';
  end if;
  if delta is null or delta = 0 or delta < -5 or delta > 5 then
    raise exception 'ปรับได้ตั้งแต่ -5 ถึง +5 และต้องไม่เป็น 0'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = subject and p.status = 'approved'
  ) then
    raise exception 'ไม่เจอสมาชิกคนนี้' using errcode = '42501';
  end if;

  insert into public.target_votes (round_id, subject_id, voter_id, delta)
  values (r.id, subject, me, delta);

exception
  when unique_violation then
    raise exception 'โหวตเป้าของคนนี้ไปแล้ว กดซ้ำไม่ได้' using errcode = '42501';
end;
$$;

grant execute on function public.vote_on_target(uuid, int) to authenticated;


-- ---- สถานะเป้าของตัวเอง ------------------------------------------------------
--  คืนแค่ "มีกี่คนโหวตแล้ว" ห้ามคืน delta หรือบอกว่าบวกหรือลบ
--  ก่อนถึงเวลาเปิดผล ไม่งั้นเดาออกว่าใครกดอะไรตอนมีคนโหวตคนเดียว

create or replace function public.my_target_state()
returns table (
  has_target boolean,
  base_km    numeric,
  vote_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  r as (
    select rd.id from public.rounds rd
     where rd.month = public.current_month_bkk()
  ),
  mine as (
    select t.base_km
      from public.targets t, me, r
     where t.round_id = r.id and t.profile_id = me.id
  )
  select (select count(*) from mine) > 0,
         (select m.base_km from mine m),
         (select count(*) from public.target_votes v, me, r
           where v.round_id = r.id and v.subject_id = me.id);
$$;

grant execute on function public.my_target_state() to authenticated;


-- ---- เพื่อนที่ยังโหวตได้ -----------------------------------------------------
--  ห้ามคืน base_km ของเขาเด็ดขาด คืนแค่ว่าเป็นใคร

create or replace function public.votable_members()
returns table (
  member_id  uuid,
  nickname   text,
  caption    text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  r as (
    select rd.id, rd.target_opens_at, rd.target_locks_at
      from public.rounds rd
     where rd.month = public.current_month_bkk()
  )
  select p.id, p.nickname, p.caption, p.avatar_url
    from public.targets t
    join public.profiles p on p.id = t.profile_id
    cross join me
    cross join r
   where t.round_id = r.id
     and p.status = 'approved'
     and p.id <> me.id
     and now() >= r.target_opens_at
     and now() <  r.target_locks_at
     and not exists (
       select 1 from public.target_votes v
        where v.round_id = r.id
          and v.subject_id = p.id
          and v.voter_id = me.id
     )
   order by p.nickname;
$$;

grant execute on function public.votable_members() to authenticated;


-- ---- โหวตที่เราเคยกด ---------------------------------------------------------
--  เห็นได้ตลอดเวลา เพราะเป็นข้อมูลของตัวเอง ไม่ได้ทำให้เกมเสีย

create or replace function public.my_votes()
returns table (
  subject_id uuid,
  nickname   text,
  caption    text,
  avatar_url text,
  delta      int,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  r as (
    select rd.id from public.rounds rd
     where rd.month = public.current_month_bkk()
  )
  select p.id, p.nickname, p.caption, p.avatar_url, v.delta, v.created_at
    from public.target_votes v
    join public.profiles p on p.id = v.subject_id
    cross join me
    cross join r
   where v.round_id = r.id
     and v.voter_id = me.id
   order by v.created_at desc;
$$;

grant execute on function public.my_votes() to authenticated;


-- ---- สรุปเป้าทั้งรอบ ---------------------------------------------------------
--  ก่อนถึง locks คืน 0 แถว ไม่ว่าใครเรียก นี่คือด่านปิดตาด่านสุดท้าย

create or replace function public.round_targets(target_month date default null)
returns table (
  member_id   uuid,
  nickname    text,
  caption     text,
  avatar_url  text,
  base_km     numeric,
  total_delta int,
  final_km    numeric,
  vote_count  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  r as (
    select rd.id, rd.target_locks_at
      from public.rounds rd
     where rd.month = coalesce(target_month, public.current_month_bkk())
  )
  select p.id,
         p.nickname,
         p.caption,
         p.avatar_url,
         t.base_km,
         coalesce(sum(v.delta), 0)::int as total_delta,
         greatest(t.base_km + coalesce(sum(v.delta), 0), 5.00)::numeric as final_km,
         count(v.voter_id) as vote_count
    from public.targets t
    join public.profiles p on p.id = t.profile_id
    cross join r
    cross join me
    left join public.target_votes v
      on v.round_id = t.round_id and v.subject_id = t.profile_id
   where t.round_id = r.id
     and now() >= r.target_locks_at
   group by p.id, p.nickname, p.caption, p.avatar_url, t.base_km
   order by greatest(t.base_km + coalesce(sum(v.delta), 0), 5.00) desc, p.nickname;
$$;

grant execute on function public.round_targets(date) to authenticated;


-- ============================================================================
--  7. กระดาน % ของเป้า
-- ----------------------------------------------------------------------------
--  ก่อนถึง locks คืน 0 แถว เพราะ final_km คำนวณจากโหวตซึ่งยังปิดตาอยู่
--  ถ้าคืนเปอร์เซ็นต์ตอนนี้ก็เท่ากับบอกเป้าของทุกคนไปกลายๆ
--
--  คนที่ตั้งเป้าแล้วแต่ยังไม่มีระยะ ได้ 0% อยู่ล่างสุดตามธรรมชาติ
--  ส่วนคนที่ยังไม่ได้ตั้งเป้าเลย final_km เป็น null และไปอยู่ท้ายสุดด้วย
--  nulls last เพราะยังอยากให้เห็นว่ามีใครบ้างที่พลาดรอบนี้ไป
-- ============================================================================

create or replace function public.month_percent_board(target_month date default null)
returns table (
  member_id   uuid,
  nickname    text,
  caption     text,
  avatar_url  text,
  is_admin    boolean,
  base_km     numeric,
  final_km    numeric,
  total_km    numeric,
  percent     numeric,
  rank_no     bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id),
  picked as (
    select coalesce(target_month, public.current_month_bkk()) as month
  ),
  r as (
    select rd.id, rd.target_locks_at
      from public.rounds rd, picked
     where rd.month = picked.month
  ),
  goals as (
    select t.profile_id,
           t.base_km,
           greatest(t.base_km + coalesce(sum(v.delta), 0), 5.00)::numeric as final_km
      from public.targets t
      cross join r
      left join public.target_votes v
        on v.round_id = t.round_id and v.subject_id = t.profile_id
     where t.round_id = r.id
     group by t.profile_id, t.base_km
  ),
  distances as (
    select p.id            as member_id,
           p.nickname      as nickname,
           p.caption       as caption,
           p.avatar_url    as avatar_url,
           p.is_admin      as is_admin,
           coalesce(sum(run.distance_km), 0)::numeric as total_km
      from public.profiles p
      cross join r
      left join public.runs run
        on run.profile_id = p.id and run.round_id = r.id
     where p.status = 'approved'
     group by p.id, p.nickname, p.caption, p.avatar_url, p.is_admin
  ),
  joined as (
    select d.member_id,
           d.nickname,
           d.caption,
           d.avatar_url,
           d.is_admin,
           g.base_km,
           g.final_km,
           d.total_km,
           case when g.final_km is null or g.final_km = 0 then null
                else round(d.total_km / g.final_km * 100, 1)
           end as percent
      from distances d
      left join goals g on g.profile_id = d.member_id
  )
  select j.member_id,
         j.nickname,
         j.caption,
         j.avatar_url,
         j.is_admin,
         j.base_km,
         j.final_km,
         j.total_km,
         j.percent,
         rank() over (order by j.percent desc nulls last) as rank_no
    from joined j, r
   where now() >= r.target_locks_at
   order by j.percent desc nulls last, j.nickname;
$$;

grant execute on function public.month_percent_board(date) to authenticated;


-- ============================================================================
--  8. ฟังก์ชันสำหรับแอดมิน
-- ----------------------------------------------------------------------------
--  การแก้ target_opens_at กับ target_locks_at ไม่ต้องมีฟังก์ชัน
--  เพราะ policy rounds_update_admin จาก 003 เปิดให้แอดมินแก้ตาราง rounds
--  ได้อยู่แล้ว หน้าแอดมินจึง update ตรงได้เลย
-- ============================================================================

create or replace function public.admin_reset_target(subject uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.rounds := public.current_round();
begin
  if not public.current_user_is_admin() then
    raise exception 'เฉพาะแอดมินเท่านั้น' using errcode = '42501';
  end if;
  if subject is null then
    raise exception 'ไม่รู้ว่าจะรีเซ็ตของใคร' using errcode = '42501';
  end if;

  delete from public.target_votes
   where round_id = r.id and subject_id = subject;

  delete from public.targets
   where round_id = r.id and profile_id = subject;
end;
$$;

grant execute on function public.admin_reset_target(uuid) to authenticated;


create or replace function public.admin_clear_round_targets()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.rounds := public.current_round();
begin
  if not public.current_user_is_admin() then
    raise exception 'เฉพาะแอดมินเท่านั้น' using errcode = '42501';
  end if;

  -- ล้างเฉพาะเป้ากับโหวต ไม่แตะตาราง runs เด็ดขาด
  delete from public.target_votes where round_id = r.id;
  delete from public.targets      where round_id = r.id;
end;
$$;

grant execute on function public.admin_clear_round_targets() to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run ทีละอัน)
-- ============================================================================

-- ช่วงเวลาของรอบเดือนนี้ แสดงเป็นเวลาไทยให้อ่านง่าย
-- select month,
--        target_opens_at at time zone 'Asia/Bangkok' as เปิดตั้งเป้า,
--        target_locks_at at time zone 'Asia/Bangkok' as ปิดรับ,
--        case when now() <  target_opens_at then 'ยังไม่เปิด'
--             when now() <  target_locks_at then 'เปิดอยู่ ปิดตา'
--             else 'เปิดผลแล้ว' end as สถานะ
--   from public.rounds order by month desc;

-- เลื่อนให้เปิดเดี๋ยวนี้ และปิดอีก 3 วัน ไว้เทสวันนี้
-- (ปกติควรตั้งจากหน้าแอดมิน อันนี้เผื่อฉุกเฉิน)
-- update public.rounds
--    set target_opens_at = now() - interval '1 minute',
--        target_locks_at = now() + interval '3 days'
--  where month = public.current_month_bkk();

-- ยืนยันว่าตารางถูกปิดจริง ควรได้ 0 แถวทั้งคู่
-- select grantee, privilege_type from information_schema.table_privileges
--  where table_schema = 'public' and table_name in ('targets', 'target_votes')
--    and grantee in ('anon', 'authenticated');
