-- ============================================================================
--  AOOOKULELE & CO. — คำท้าแบบกองกลาง หารเท่ากัน
-- ----------------------------------------------------------------------------
--  กติกาเดิม (20260930203000_challenges.sql)
--    คนท้ากับคนถูกท้าวางข้างละ N ขวด เพื่อนลงเพิ่มข้างไหนก็ได้ 1–12 ขวด
--    ฝั่งชนะแบ่งเบียร์ของฝั่งแพ้ตามสัดส่วนที่ตัวเองวาง
--    ผลคือได้กับเสียไม่เท่ากันระหว่างสองกรณี จนเพื่อนในกลุ่มงง
--
--  กติกาใหม่ (ตกลงกันวันที่ 7 ตุลาคม 2569)
--    - มีกองเดียว เริ่มจากที่คนท้าวาง 1–12 ขวด
--    - คนท้าอยู่ฝั่งไม่ถึง คนถูกท้าอยู่ฝั่งถึง ทั้งคู่เติมกองเพิ่มเองไม่ได้
--      คนถูกท้าแค่กดรับ ไม่ต้องวางอะไร
--    - เพื่อนเข้าร่วมฝั่งไหนก็ได้ เติมกอง +0 ถึง +3 ขวด
--      +0 คือร่วมหุ้นเฉยๆ ไม่ทำให้กองโต แต่ช่วยหาร
--    - เข้าร่วมได้ตั้งแต่ตอนรอรับจนสิ้นวันที่ 20 (challenge_lock_at เดิม)
--      ถ้าคนถูกท้าไม่รับหรือปล่อยให้ตกไป ทุกคนที่ลงไว้ถือว่าโมฆะ
--    - ตัดสินแล้ว ฝั่งแพ้จ่ายทั้งกองหารเท่ากัน ฝั่งชนะรับทั้งกองหารเท่ากัน
--      ไม่ปัดเศษ (ฝั่งเว็บคิดเอง ดู src/lib/beer-split.ts)
--    - เพดาน: ไม่มีใครจ่ายหรือรับเกิน 24 ขวดต่อคน
--      คือ กอง ÷ จำนวนคนของฝั่งที่คนน้อยสุด ต้องไม่เกิน 24
--
--  เก็บข้อมูลยังไง
--    ใช้ตาราง challenge_stakes เดิม ช่อง bottles เปลี่ยนความหมายเป็น
--    "ใส่กองไปเท่าไหร่" กองจึงเท่ากับผลรวมทั้งใบ และจำนวนคนในฝั่ง
--    คือจำนวนแถวของฝั่งนั้น ไม่ต้องเพิ่มตารางใหม่
--      คนท้า     ฝั่ง miss   ใส่ = challenges.bottles (1–12)
--      คนถูกท้า  ฝั่ง reach  ใส่ 0
--      เพื่อน     ฝั่งไหนก็ได้ ใส่ 0–3
--    ทั้งสองแถวของคู่ท้าสร้างทันทีตอนท้า (ของเดิมสร้างตอนกดรับ)
--    เพื่อนจะได้เห็นว่าฝั่งไหนมีใครแล้วตั้งแต่ตอนรอรับ
--
--  ผลกับข้อมูลจริงตอน deploy (ข้อ 5)
--    - ไม่ลบแถวไหนเลย
--    - คำท้าที่รอรับหรือรับแล้ว ได้แถวของคู่ท้าเพิ่มถ้ายังไม่มี
--    - แถวของคนถูกท้าที่มีอยู่แล้ว (จากการกดรับแบบเดิม) ตั้งเป็น 0
--    - แถวของเพื่อนที่เคยลงเกิน 3 ขวด ปรับลงเป็น 3
--    ณ วันที่เขียน มีคำท้าใบเดียว ยังรอรับ ไม่มีเพื่อนลงเพิ่ม
--    คำท้าเริ่มมีตั้งแต่ 30 ก.ย. ซึ่งเลยวันที่ 20 ของเดือนกันยายนไปแล้ว
--    จึงไม่มีคำท้าเดือนเก่าที่ตัดสินด้วยกติกาเดิมให้ประวัติเพี้ยน
-- ============================================================================


-- ============================================================================
--  1. ช่อง bottles ใส่ 0 ได้
-- ----------------------------------------------------------------------------
--  เดิมเป็น check แบบไม่ได้ตั้งชื่อ Postgres ตั้งให้ว่า
--  challenge_stakes_bottles_check ลบแล้วสร้างใหม่แบบมีชื่อ รันซ้ำได้
-- ============================================================================

alter table public.challenge_stakes
  drop constraint if exists challenge_stakes_bottles_check;
alter table public.challenge_stakes
  drop constraint if exists challenge_stakes_bottles_range;
alter table public.challenge_stakes
  add constraint challenge_stakes_bottles_range check (bottles between 0 and 12);

comment on column public.challenge_stakes.bottles is
  'ใส่กองไปกี่ขวด คนท้า = challenges.bottles คนถูกท้า = 0 เพื่อน = 0 ถึง 3 '
  'กองของคำท้า = ผลรวมช่องนี้ทั้งใบ (ตั้งแต่ 20261007120000_challenge_shared_pot.sql)';


-- ============================================================================
--  2. ค่าคงที่ของกติกา เก็บไว้ที่เดียว ต้องตรงกับ src/lib/challenge-rules.ts
-- ============================================================================

create or replace function public.challenge_add_max()
returns int
language sql
immutable
set search_path = ''
as $$ select 3; $$;

comment on function public.challenge_add_max() is
  'เพื่อนเติมกองได้สูงสุดกี่ขวดต่อคน ตรงกับ JOIN_ADD_MAX ใน challenge-rules.ts';

create or replace function public.challenge_share_cap()
returns int
language sql
immutable
set search_path = ''
as $$ select 24; $$;

comment on function public.challenge_share_cap() is
  'ไม่มีใครจ่ายหรือรับเกินกี่ขวดต่อคน ตรงกับ SHARE_CAP ใน challenge-rules.ts';

-- ถ้าเพิ่มคนหนึ่งเข้าฝั่ง p_side พร้อมเติม p_add ขวด ยังไม่เกินเพดานใช่ไหม
-- ฝั่งที่ยังไม่มีใครเลย (เกิดได้แค่ระหว่างสร้างคำท้า) ยังไม่มีใครต้องหาร ถือว่าผ่าน
create or replace function public.challenge_share_ok(
  p_challenge_id uuid,
  p_side         text,
  p_add          int
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select side, bottles
      from public.challenge_stakes
     where challenge_id = p_challenge_id
    union all
    select p_side, p_add
  ),
  t as (
    select sum(bottles) as pot,
           least(count(*) filter (where side = 'reach'),
                 count(*) filter (where side = 'miss')) as fewest
      from s
  )
  select case
           when t.fewest = 0 then true
           else t.pot::numeric / t.fewest <= public.challenge_share_cap()
         end
    from t;
$$;

revoke all on function public.challenge_add_max()                     from public, anon;
revoke all on function public.challenge_share_cap()                   from public, anon;
revoke all on function public.challenge_share_ok(uuid, text, int)     from public, anon, authenticated;
grant execute on function public.challenge_add_max()                  to authenticated;
grant execute on function public.challenge_share_cap()                to authenticated;


-- ============================================================================
--  3. trigger ของ challenge_stakes เขียนใหม่ตามกติกาใหม่
--  ฟังก์ชันในข้อ 4 เช็กครบอยู่แล้ว ตัวนี้เป็นด่านสุดท้ายเหมือนเดิม
-- ============================================================================

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
  -- ไม่มี auth.uid() แปลว่ารันจาก SQL Editor หรือ migration ปล่อยผ่าน
  if me is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'เบียร์ที่ลงไปแล้วแก้ไม่ได้' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    -- เกิดได้ทางเดียวคือแอดมินลบคำท้าทั้งใบแล้ว cascade ลงมา
    if not public.current_user_is_admin() then
      raise exception 'ถอนเบียร์ที่ลงไปแล้วไม่ได้' using errcode = '42501';
    end if;
    return old;
  end if;

  select * into ch from public.challenges where id = new.challenge_id;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.state not in ('pending', 'accepted') then
    raise exception 'คำท้าใบนี้ปิดไปแล้ว ลงไม่ได้' using errcode = '42501';
  end if;

  select * into rd from public.rounds where id = ch.round_id;
  if now() >= public.challenge_lock_at(rd.month) then
    raise exception 'หมดเวลาลงของเดือนนี้แล้ว' using errcode = '42501';
  end if;

  if new.profile_id = ch.challenger_id then
    -- แถวคนท้าเกิดตอนท้าเท่านั้น ด้วยจำนวนที่ตั้งไว้ อยู่ฝั่งไม่ถึง
    if me <> ch.challenger_id or new.side <> 'miss' or new.bottles <> ch.bottles then
      raise exception 'คนท้าใส่กองได้ครั้งเดียวตอนท้า ฝั่งไม่ถึง ด้วยจำนวนที่ตั้งไว้'
        using errcode = '42501';
    end if;
  elsif new.profile_id = ch.runner_id then
    -- แถวคนถูกท้าเกิดตอนท้า (คนท้าเป็นคนสร้าง) หรือตอนกดรับ ใส่ 0 เสมอ
    if me not in (ch.challenger_id, ch.runner_id)
       or new.side <> 'reach' or new.bottles <> 0 then
      raise exception 'คนถูกท้าอยู่ฝั่งถึง และเติมกองเองไม่ได้'
        using errcode = '42501';
    end if;
  else
    if new.profile_id <> me then
      raise exception 'ลงในนามคนอื่นไม่ได้' using errcode = '42501';
    end if;
    if new.bottles < 0 or new.bottles > public.challenge_add_max() then
      raise exception 'เติมกองได้ตั้งแต่ 0 ถึง % ขวด', public.challenge_add_max()
        using errcode = '42501';
    end if;
  end if;

  if not public.challenge_share_ok(new.challenge_id, new.side, new.bottles) then
    raise exception 'เกินเพดาน % ขวดต่อคน', public.challenge_share_cap()
      using errcode = '42501';
  end if;

  return new;
end;
$$;


-- ============================================================================
--  4. ฟังก์ชันเขียน เปลี่ยนสามตัว ชื่อและพารามิเตอร์เดิมทุกตัว สิทธิ์เดิมจึงยังอยู่
-- ============================================================================

-- ท้า: สร้างแถวของคู่ท้าทันที
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

  -- ฝั่งถึงก่อน ฝั่งไม่ถึงทีหลัง ตอนใส่แถวที่สองเพดานจะได้มีคนให้หารครบสองฝั่ง
  insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
  values (new_id, p_runner_id, 'reach', 0);
  insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
  values (new_id, me, 'miss', p_bottles);

  return new_id;
end;
$$;


-- รับ: เปลี่ยนแค่สถานะ แถวของคู่ท้ามีอยู่แล้วตั้งแต่ตอนท้า
-- ใส่ on conflict เผื่อคำท้าที่ข้อ 5 ยังไม่ได้เติมแถวให้ (ไม่ควรเกิด)
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
  select * into ch from public.challenges where id = p_challenge_id for update;
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
  values (ch.id, ch.runner_id, 'reach', 0)
  on conflict (challenge_id, profile_id) do nothing;
end;
$$;


-- เข้าร่วม: เพื่อนเท่านั้น +0 ถึง +3 ได้ทั้งตอนรอรับและหลังรับ
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
  me      uuid := public.require_approved_member();
  ch      public.challenges;
  rd      public.rounds;
  v_room  int;
begin
  -- for update: ล็อกคำท้าใบนี้ไว้ ถ้าสองคนกดเข้าร่วมพร้อมกัน คนที่สองจะรอ
  -- ให้คนแรกเสร็จก่อนแล้วค่อยเช็กเพดาน กองจะได้ไม่ทะลุ 24 ต่อคน
  select * into ch from public.challenges where id = p_challenge_id for update;
  if ch.id is null then
    raise exception 'ไม่เจอคำท้าใบนี้' using errcode = '42501';
  end if;
  if ch.state not in ('pending', 'accepted') then
    raise exception 'คำท้าใบนี้ปิดไปแล้ว ลงไม่ได้' using errcode = '42501';
  end if;

  select * into rd from public.rounds where id = ch.round_id;
  if now() >= public.challenge_lock_at(rd.month) then
    raise exception 'หมดเวลาลงของเดือนนี้แล้ว ลงได้ถึงสิ้นวันที่ % ของเดือน',
      public.challenge_join_last_day()
      using errcode = '42501';
  end if;

  if me = ch.challenger_id or me = ch.runner_id then
    raise exception 'คู่ท้าเติมกองเองไม่ได้ ให้เพื่อนมาร่วมแทน'
      using errcode = '42501';
  end if;

  if p_side is null or p_side not in ('reach', 'miss') then
    raise exception 'เลือกฝั่งก่อนว่าถึงแน่หรือไม่ถึงแน่' using errcode = '42501';
  end if;

  if p_bottles is null or p_bottles < 0 or p_bottles > public.challenge_add_max() then
    raise exception 'เติมกองได้ตั้งแต่ 0 ถึง % ขวด', public.challenge_add_max()
      using errcode = '42501';
  end if;

  if exists (select 1 from public.challenge_stakes
              where challenge_id = p_challenge_id and profile_id = me) then
    raise exception 'ลงไปแล้วหนึ่งฝั่ง ลงซ้ำหรือย้ายฝั่งไม่ได้'
      using errcode = '42501';
  end if;

  if not public.challenge_share_ok(p_challenge_id, p_side, p_bottles) then
    -- บอกให้ชัดว่ายังเติมได้อีกเท่าไหร่ ไม่ใช่แค่ว่าเต็ม
    select max(a) into v_room
      from generate_series(0, public.challenge_add_max()) as a
     where public.challenge_share_ok(p_challenge_id, p_side, a);
    raise exception 'เกินเพดาน % ขวดต่อคน ฝั่งนี้เติมได้อีกสูงสุด % ขวด',
      public.challenge_share_cap(), coalesce(v_room, 0)
      using errcode = '42501';
  end if;

  insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
  values (p_challenge_id, me, p_side, p_bottles);
end;
$$;


-- ============================================================================
--  5. แปลงข้อมูลที่มีอยู่ให้เป็นแบบใหม่
--  migration ไม่มี auth.uid() trigger ในข้อ 3 จึงปล่อยผ่าน
--  ทุกคำสั่งรันซ้ำได้ รอบสองจะไม่มีแถวไหนเปลี่ยนอีก
-- ============================================================================

-- คนถูกท้าที่เคยกดรับแบบเดิมมีแถวที่วางเท่าคนท้า ตอนนี้คนถูกท้าใส่ 0
update public.challenge_stakes s
   set bottles = 0
  from public.challenges c
 where c.id = s.challenge_id
   and s.profile_id = c.runner_id
   and s.bottles <> 0;

-- คนท้าต้องใส่เท่าที่ตั้งไว้ในคำท้าเสมอ (แบบเดิมก็เท่ากันอยู่แล้ว กันไว้เฉยๆ)
update public.challenge_stakes s
   set bottles = c.bottles
  from public.challenges c
 where c.id = s.challenge_id
   and s.profile_id = c.challenger_id
   and s.bottles <> c.bottles;

-- เพื่อนที่เคยลงเกิน 3 ขวดตามกติกาเดิม นับเป็น 3
update public.challenge_stakes s
   set bottles = public.challenge_add_max()
  from public.challenges c
 where c.id = s.challenge_id
   and s.profile_id not in (c.challenger_id, c.runner_id)
   and s.bottles > public.challenge_add_max();

-- คำท้าที่ยังไม่ปิด ได้แถวของคู่ท้าครบสองคน
insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
select c.id, c.runner_id, 'reach', 0
  from public.challenges c
 where c.state in ('pending', 'accepted')
on conflict (challenge_id, profile_id) do nothing;

insert into public.challenge_stakes (challenge_id, profile_id, side, bottles)
select c.id, c.challenger_id, 'miss', c.bottles
  from public.challenges c
 where c.state in ('pending', 'accepted')
on conflict (challenge_id, profile_id) do nothing;
