-- ============================================================================
--  AOOOKULELE & CO. — ใครปรับเป้าใคร + แก้ % ปัดสองรอบ + ล็อกรีเซ็ตหลังเปิดผล
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql ถึง 008_show_peer_targets.sql ที่รันไปแล้ว
--
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง
--
--  เปลี่ยนอะไร
--    1. round_vote_breakdown()  ฟังก์ชันใหม่ คืนโหวตรายคู่ หลังเปิดผลแล้ว
--    2. month_percent_board()   เลิกปัดทศนิยมในฐานข้อมูล ให้ปัดที่เดียวฝั่งเว็บ
--    3. admin_reset_target()    ล็อกไม่ให้รีเซ็ตหลังเปิดผลแล้ว
-- ============================================================================


-- ============================================================================
--  1. round_vote_breakdown() — ใครปรับเป้าใคร
-- ----------------------------------------------------------------------------
--  คืนแถวละหนึ่งโหวต พร้อมชื่อทั้งฝั่งคนโดนและคนกด
--
--  ก่อนถึง target_locks_at คืน 0 แถว เหมือน round_targets() ทุกประการ
--  เงื่อนไข now() >= r.target_locks_at อยู่ใน where ของ query หลัก
--  ไม่ได้อยู่ในโค้ดฝั่งเว็บ การปิดตาจึงบังคับที่ฐานข้อมูลจริงๆ
--
--  พอถึงเวลาเปิดผล ชื่อคนโหวตเปิดให้สมาชิกทุกคนเห็นทันที ใช้กับทุกรอบ
--  รวมรอบที่ผ่านมาแล้วด้วย ตามที่เจ้าของเว็บตัดสินไว้
-- ============================================================================

create or replace function public.round_vote_breakdown(
  target_month date default null
)
returns table (
  subject_id         uuid,
  subject_nickname   text,
  subject_avatar_url text,
  voter_id           uuid,
  voter_nickname     text,
  voter_avatar_url   text,
  delta              int
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
  select s.id,
         s.nickname,
         s.avatar_url,
         w.id,
         w.nickname,
         w.avatar_url,
         v.delta
    from public.target_votes v
    join public.profiles s on s.id = v.subject_id
    join public.profiles w on w.id = v.voter_id
    cross join r
    cross join me
   where v.round_id = r.id
     and now() >= r.target_locks_at
   order by s.nickname, v.created_at;
$$;

grant execute on function public.round_vote_breakdown(date) to authenticated;


-- ============================================================================
--  2. month_percent_board() — เลิกปัดทศนิยมสองรอบ
-- ----------------------------------------------------------------------------
--  ของเดิม round(..., 1) ทำให้ 167 / 130 = 128.4615 กลายเป็น 128.5
--  แล้วฝั่งเว็บ formatPercent() ปัดเป็นจำนวนเต็มอีกรอบได้ 129 ซึ่งผิด
--  ปัดสองรอบทำให้ตัวเลขเลื่อนขึ้นได้เสมอ
--
--  แก้โดยคืนทศนิยม 2 ตำแหน่งจากฐานข้อมูล (128.46) แล้วให้ฝั่งเว็บปัด
--  เป็นจำนวนเต็มครั้งเดียว ได้ 128 ถูกต้อง
--
--  signature กับ return type เหมือนเดิมทุกอย่าง จึงใช้ create or replace ได้
--  ไม่ต้อง drop ก่อน
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
                -- ปัด 2 ตำแหน่งพอ ให้ฝั่งเว็บปัดเป็นจำนวนเต็มครั้งเดียว
                else round(d.total_km / g.final_km * 100, 2)
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
--  3. admin_reset_target() — ล็อกหลังเปิดผลแล้ว
-- ----------------------------------------------------------------------------
--  เดิมกดได้ตลอด ซึ่งอันตราย เพราะถ้ากดหลังประกาศผลไปแล้ว
--  เป้าจริงกับกระดาน % ของรอบนั้นจะเปลี่ยนย้อนหลังโดยที่คนอื่นเห็นตัวเลขเก่าไปแล้ว
--
--  ส่วน admin_clear_round_targets() ไม่แตะ ยังกดได้ตลอดตามเดิม
--  เพราะเจ้าของเว็บใช้ล้างข้อมูลทดสอบแล้วเลื่อนเวลาเปิดรับกลับไปตั้งใหม่
--  การล้างทั้งรอบเป็นการเริ่มใหม่ทั้งหมด ไม่ใช่การแก้ผลที่ประกาศไปแล้วทีละคน
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

  if now() >= r.target_locks_at then
    raise exception 'เปิดผลรอบเดือน%ไปแล้ว รีเซ็ตทีละคนไม่ได้ เพราะจะทำให้ผลที่ประกาศไปแล้วเปลี่ยนย้อนหลัง ถ้าจะเริ่มรอบใหม่ให้ใช้ปุ่มล้างทั้งรอบ',
      public.thai_month_label(r.month)
      using errcode = '42501';
  end if;

  delete from public.target_votes
   where round_id = r.id and subject_id = subject;

  delete from public.targets
   where round_id = r.id and profile_id = subject;
end;
$$;

grant execute on function public.admin_reset_target(uuid) to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ใครปรับเป้าใครในรอบนี้ ต้องได้ 0 แถวถ้ายังไม่ถึงเวลาเปิดผล
-- select * from public.round_vote_breakdown();

-- เช็กว่า % ไม่ปัดสองรอบแล้ว ควรเห็นทศนิยม 2 ตำแหน่ง เช่น 128.46
-- select nickname, total_km, final_km, percent from public.month_percent_board();

-- ข้อความล็อกรีเซ็ตติดอยู่ในฟังก์ชันแล้วหรือยัง
-- select prosrc like '%รีเซ็ตทีละคนไม่ได้%' as มีด่านใหม่แล้ว
--   from pg_proc where proname = 'admin_reset_target';
