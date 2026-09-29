-- ============================================================================
--  AOOOKULELE & CO. — เปิดให้เห็นเป้าที่เพื่อนตั้ง แต่ยังปิดผลรวมโหวตไว้
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql, 002_removed.sql, 003_runs.sql,
--  004_profile_fields.sql, 005_distance_range.sql, 006_targets.sql
--  และ 007_vote_requires_target.sql ที่รันไปแล้ว
--
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง
--
--  เปลี่ยนอะไร
--    votable_members()  คืนเพิ่ม base_km กับ last_month_km
--    my_votes()         คืนเพิ่ม base_km
--
--  ทำไม
--    การกด -5 ถึง +5 โดยไม่เห็นเป้าของเขาเลย คือการสุ่ม ไม่ใช่การตัดสินใจ
--    สิ่งที่ต้องปิดตาจริงๆ คือผลรวมโหวต ไม่ใช่ตัวเป้า
--    และเพราะ 007 บังคับให้ตั้งเป้าตัวเองก่อนอยู่แล้ว ทุกคนจึงตั้งเป้า
--    โดยไม่มีข้อมูลเท่ากันหมด พอล็อกเสร็จค่อยเห็นของคนอื่น ซึ่งแฟร์
--
--  สิ่งที่ยังห้ามคืนเด็ดขาด
--    total_delta หรือผลรวมโหวตของคนอื่น
--    จำนวนคนที่โหวตเขาไปแล้ว
--    ทั้งสองอย่างยังเปิดได้เฉพาะหลังถึงเวลา target_locks_at ผ่าน
--    round_targets() กับ month_percent_board() เหมือนเดิม
--
--  ต้อง drop ก่อน create ไม่ใช่ create or replace เฉยๆ เพราะการเพิ่ม
--  คอลัมน์ผลลัพธ์คือการเปลี่ยนชนิดที่ฟังก์ชันคืนค่า Postgres จะฟ้องว่า
--  cannot change return type of existing function
-- ============================================================================


-- ============================================================================
--  1. votable_members() — เพิ่มเป้าของเขา และระยะจริงเดือนก่อน
-- ----------------------------------------------------------------------------
--  เงื่อนไขเดิมจาก 006 และ 007 ยกมาครบทุกข้อ ไม่มีตัวไหนหล่น
--    t.round_id = r.id                    เฉพาะเป้าของรอบเดือนนี้
--    p.status = 'approved'                เฉพาะสมาชิกที่อนุมัติแล้ว
--    p.id <> me.id                        ไม่เอาตัวเอง
--    now() อยู่ในช่วง opens ถึง locks     เฉพาะตอนรอบเปิด
--    not exists (...target_votes...)      คนที่เรายังไม่ได้โหวต
--    exists (...targets mine...)          เราต้องตั้งเป้าตัวเองก่อน (จาก 007)
--
--  last_month_km ใช้ sum() เปล่าๆ ไม่ใส่ coalesce โดยตั้งใจ
--  ไม่มีแถวผลวิ่งเลยจะได้ null ซึ่งหน้าเว็บเอาไปแสดงว่า
--  "ไม่มีข้อมูลเดือนก่อน" ครอบคลุมทั้งคนที่เพิ่งเข้าทีมและคนที่เดือนก่อน
--  ไม่ได้กรอกอะไรไว้
-- ============================================================================

drop function if exists public.votable_members();

create function public.votable_members()
returns table (
  member_id     uuid,
  nickname      text,
  caption       text,
  avatar_url    text,
  base_km       numeric,
  last_month_km numeric
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
  ),
  last_round as (
    select rd.id
      from public.rounds rd
     where rd.month = (public.current_month_bkk() - interval '1 month')::date
  )
  select p.id,
         p.nickname,
         p.caption,
         p.avatar_url,
         t.base_km,
         (
           select sum(run.distance_km)
             from public.runs run, last_round
            where run.profile_id = p.id
              and run.round_id = last_round.id
         ) as last_month_km
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
     and exists (
       select 1 from public.targets mine
        where mine.round_id = r.id
          and mine.profile_id = me.id
     )
   order by p.nickname;
$$;

grant execute on function public.votable_members() to authenticated;


-- ============================================================================
--  2. my_votes() — เพิ่มเป้าของคนที่เราโหวตไปแล้ว
-- ----------------------------------------------------------------------------
--  เงื่อนไขเดิมจาก 006 ยกมาครบ
--    v.round_id = r.id      เฉพาะรอบเดือนนี้
--    v.voter_id = me.id     เฉพาะโหวตที่เรากดเอง
--
--  ปลอดภัยที่จะคืน base_km ตรงนี้ เพราะคนที่เราโหวตไปแล้วคือคนที่เรา
--  เห็นเป้าเขาตอนกดอยู่แล้ว ไม่ได้เปิดเผยอะไรเพิ่ม
--  ส่วน delta ที่คืนมาคือของเราเอง ไม่ใช่ผลรวมของทุกคน
--
--  ใช้ left join ไม่ใช่ join ธรรมดา เผื่อกรณีที่แอดมินรีเซ็ตเป้าของใครสักคน
--  ระหว่างรอบ ถ้าใช้ join ธรรมดาแล้วเกิดมีโหวตที่ไม่มีเป้าคู่กัน
--  แถวนั้นจะหายจากรายการเงียบๆ ทำให้คนโหวตงงว่าโหวตไปไหน
--  ทางนี้ base_km จะเป็น null แล้วหน้าเว็บแสดงขีดแทน
-- ============================================================================

drop function if exists public.my_votes();

create function public.my_votes()
returns table (
  subject_id uuid,
  nickname   text,
  caption    text,
  avatar_url text,
  base_km    numeric,
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
  select p.id,
         p.nickname,
         p.caption,
         p.avatar_url,
         t.base_km,
         v.delta,
         v.created_at
    from public.target_votes v
    join public.profiles p on p.id = v.subject_id
    left join public.targets t
      on t.round_id = v.round_id and t.profile_id = v.subject_id
    cross join me
    cross join r
   where v.round_id = r.id
     and v.voter_id = me.id
   order by v.created_at desc;
$$;

grant execute on function public.my_votes() to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- คอลัมน์ผลลัพธ์ของสองฟังก์ชันนี้ ควรเห็น base_km และ last_month_km
-- select p.proname, pg_get_function_result(p.oid) as คืนค่า
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('votable_members', 'my_votes');

-- ยืนยันว่ายังไม่มีฟังก์ชันไหนคืนผลรวมโหวตของคนอื่นก่อนเวลา
-- ทั้งสองตัวนี้ต้องคืน 0 แถวถ้ายังไม่ถึง target_locks_at
-- select count(*) as ควรเป็นศูนย์ถ้ายังไม่เปิดผล from public.round_targets();
-- select count(*) as ควรเป็นศูนย์ถ้ายังไม่เปิดผล from public.month_percent_board();
