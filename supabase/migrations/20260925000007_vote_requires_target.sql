-- ============================================================================
--  AOOOKULELE & CO. — ต้องตั้งเป้าตัวเองก่อนถึงจะโหวตปรับเป้าเพื่อนได้
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql, 002_removed.sql, 003_runs.sql,
--  004_profile_fields.sql, 005_distance_range.sql และ 006_targets.sql
--  ที่รันไปแล้ว ไม่ต้องกลับไปรันไฟล์เดิมซ้ำ
--
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง เพราะเป็น create or replace ทั้งสองตัว
--  และไม่ได้เปลี่ยนชนิดที่ฟังก์ชันคืนค่า จึงไม่ต้อง drop ก่อน
--
--  เปลี่ยนสองฟังก์ชัน
--    vote_on_target()   เพิ่มด่านเช็กว่าคนกดตั้งเป้าของตัวเองแล้วหรือยัง
--    votable_members()  คนที่ยังไม่ตั้งเป้า ให้เห็นรายชื่อ 0 แถว
--
--  เหตุผล: คนที่ยังไม่ลงเดิมพันของตัวเอง ไม่ควรมีสิทธิ์ไปขยับเดิมพันของคนอื่น
-- ============================================================================


-- ============================================================================
--  1. vote_on_target() — ด่านบังคับจริง
-- ----------------------------------------------------------------------------
--  ต้องเช็กที่ฝั่งฐานข้อมูล ไม่ใช่แค่ซ่อนรายชื่อในหน้าเว็บ
--  เพราะฟังก์ชันนี้ถูกเรียกตรงผ่าน RPC ได้โดยไม่ผ่านหน้าเว็บเลย
--
--  วางด่านใหม่ไว้หลังเช็กช่วงเวลา แต่ก่อนเช็กเรื่องตัวเป้าหมาย
--  เพื่อให้คนที่ยังไม่ตั้งเป้าได้ข้อความที่ตรงกับสาเหตุจริงที่สุด
-- ============================================================================

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

  -- ด่านใหม่: ยังไม่ลงเดิมพันของตัวเอง ก็ยังไม่มีสิทธิ์ขยับของคนอื่น
  if not exists (
    select 1 from public.targets t
     where t.round_id = r.id and t.profile_id = me
  ) then
    raise exception 'ตั้งเป้าของตัวเองก่อนถึงจะปรับเป้าเพื่อนได้'
      using errcode = '42501';
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


-- ============================================================================
--  2. votable_members() — คนที่ยังไม่ตั้งเป้า เห็นรายชื่อ 0 แถว
-- ----------------------------------------------------------------------------
--  ยังห้ามคืน base_km ของใครเหมือนเดิม คืนแค่ว่าเป็นใคร
--  เงื่อนไขใหม่คือ exists ท่อนล่างสุด ถ้าคนเรียกไม่มีเป้าของตัวเองในรอบนี้
--  ทั้ง query จะไม่คืนแถวไหนเลย
-- ============================================================================

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
     and exists (
       select 1 from public.targets mine
        where mine.round_id = r.id
          and mine.profile_id = me.id
     )
   order by p.nickname;
$$;

grant execute on function public.votable_members() to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ข้อความใหม่ติดอยู่ในฟังก์ชันแล้วหรือยัง
-- select prosrc like '%ตั้งเป้าของตัวเองก่อน%' as มีด่านใหม่แล้ว
--   from pg_proc where proname = 'vote_on_target';

-- ใครในรอบนี้ตั้งเป้าแล้วบ้าง (รันจาก SQL Editor เห็นได้หมด)
-- select p.nickname, t.base_km, t.set_at
--   from public.targets t
--   join public.profiles p on p.id = t.profile_id
--   join public.rounds r on r.id = t.round_id
--  where r.month = public.current_month_bkk()
--  order by t.set_at;
