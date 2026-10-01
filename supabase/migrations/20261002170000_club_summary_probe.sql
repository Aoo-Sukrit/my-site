-- ============================================================================
--  AOOOKULELE & CO. — เทสชั่วคราว: home_club_summary() ปิดคนนำจากคนนอกจริงไหม
-- ----------------------------------------------------------------------------
--  ปัญหาของการเทสตัวจริง
--  home_club_summary() ดูเดือนปัจจุบันเท่านั้น และเดือนตุลาคมนี้ยังไม่มีใคร
--  กรอกผลเลย ยอดรวมเป็น 0 ทุกคน จึงไม่มีคนนำอยู่แต่แรก
--  เรียกด้วย anon key แล้วได้ leader เป็น null ก็ไม่ได้พิสูจน์อะไร
--  เพราะสมาชิกเรียกก็ได้ null เหมือนกัน
--
--  วิธีเทส
--  ฟังก์ชันนี้คือตัวเดียวกันแบบรับเดือนเข้ามาได้ เอาไปยิงกับกันยายนซึ่งมีระยะจริง
--  167 กม. แล้วดูสองคอลัมน์พร้อมกัน
--    leader_nickname        ต้องเป็น null เมื่อเรียกด้วย anon key
--    ungated_leader_exists  ต้องเป็น true แปลว่าเดือนนั้นมีคนนำอยู่จริง
--  ได้สองอย่างนี้พร้อมกัน = null ที่เห็นมาจากด่านกั้น ไม่ใช่เพราะไม่มีข้อมูล
--
--  คืนเป็น boolean ว่ามีคนนำไหม ไม่คืนชื่อ เพราะถ้าคืนชื่อออกมาก็เท่ากับเปิด
--  ข้อมูลที่เพิ่งปิดไปให้ anon อ่านได้ ระหว่างที่ฟังก์ชันเทสนี้ยังอยู่
--
--  ไม่ insert ไม่ update ไม่ delete อะไรเลยสักแถว อ่านอย่างเดียว
--  ไฟล์ถัดไป 20261002180000_club_summary_probe_cleanup.sql ลบฟังก์ชันนี้ทิ้ง
-- ============================================================================

drop function if exists public.probe_club_summary(date);
create function public.probe_club_summary(p_month date)
returns table (
  member_count          int,
  total_km              numeric,
  leader_nickname       text,
  leader_km             numeric,
  ungated_leader_exists boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with picked as (select date_trunc('month', p_month)::date as mth),
  viewer as (
    select coalesce(public.current_profile_status() = 'approved', false)
             as is_member
  ),
  this_round as (
    select r.id
      from public.rounds r, picked
     where r.month = picked.mth
  ),
  totals as (
    select p.id,
           p.nickname,
           p.avatar_url,
           coalesce(sum(run.distance_km), 0)::numeric(10,2) as km
      from public.profiles p
      left join public.runs run
        on run.profile_id = p.id
       and run.round_id in (select id from this_round)
     where p.status = 'approved'
     group by p.id, p.nickname, p.avatar_url
  )
  select (select count(*)::int from totals),
         (select coalesce(sum(totals.km), 0)::numeric(10,2) from totals),
         lead.nickname,
         lead.km,
         exists (select 1 from totals t where t.km > 0)
    from (select 1 as one) anchor
    left join lateral (
      select t.nickname, t.km
        from totals t, viewer
       where t.km > 0
         and viewer.is_member
       order by t.km desc, t.nickname
       limit 1
    ) lead on true
   where anchor.one = 1;
$$;

revoke all on function public.probe_club_summary(date)
  from public, anon, authenticated;
grant execute on function public.probe_club_summary(date) to anon, authenticated;
