-- ============================================================================
--  AOOOKULELE & CO. — ปิดรูรั่ว member_round_km
-- ----------------------------------------------------------------------------
--  แก้ของที่พลาดใน 20260930203000_challenges.sql
--
--  เรื่องที่พลาด
--  Postgres ให้สิทธิ์ execute ของฟังก์ชันใหม่กับ PUBLIC เป็นค่าเริ่มต้น
--  การเขียน grant execute ... to authenticated ไม่ได้ถอนสิทธิ์ของ PUBLIC ออก
--  แปลว่า anon ซึ่งยังไม่ได้ล็อกอินก็เรียกได้
--
--  ฟังก์ชันอ่านข้อมูลตัวอื่นในโปรเจกต์นี้รอดมาได้เพราะกันตัวเองไว้ในตัวฟังก์ชัน
--  เช่น month_leaderboard() มี where current_profile_status() = 'approved'
--  และ round_prizes() เรียก require_approved_member() เป็นบรรทัดแรก
--  แต่ member_round_km() เป็น security definer ที่อ่านตาราง runs โดยไม่ได้กันอะไรเลย
--  ยิง POST /rest/v1/rpc/member_round_km ด้วย anon key แล้วใส่ id ก็ได้ระยะ
--  ของคนนั้นกลับไปเลย ทั้งที่กระดานตัวจริงปิดไว้ให้เฉพาะสมาชิก
--
--  วิธีแก้
--  ถอน execute ของ member_round_km() จากทุก role ที่มาจากภายนอก
--  ฟังก์ชันนี้ไม่ได้มีไว้ให้หน้าเว็บเรียกตรงอยู่แล้ว มีไว้ให้ฟังก์ชันอื่นใช้ภายใน
--  ซึ่งเรียกต่อได้ปกติ เพราะ security definer ทำงานในนามเจ้าของฟังก์ชัน
--
--  และถอน PUBLIC ออกจากฟังก์ชันอื่นของชุดคำท้าให้หมดด้วย เหลือเฉพาะ
--  authenticated ตามที่ตั้งใจ ตัวที่ต้องการให้กันเองอยู่แล้วก็ยังกันเหมือนเดิม
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. member_round_km — ใช้ภายในเท่านั้น ไม่เปิดให้เรียกจากข้างนอกเลย
-- ----------------------------------------------------------------------------

revoke all on function public.member_round_km(uuid, uuid)
  from public, anon, authenticated;

comment on function public.member_round_km(uuid, uuid) is
  'ระยะรวมของคนหนึ่งในรอบหนึ่ง สำหรับให้ฟังก์ชันอื่นเรียกภายในเท่านั้น '
  'ถอน execute จากทุก role ที่เรียกผ่าน API ได้ เพราะไม่ได้เช็กสิทธิ์คนเรียกเอง '
  'ใครอยากได้ตัวเลขนี้ให้ไปเรียก round_challenges() หรือ month_leaderboard() '
  'ซึ่งเช็กว่าเป็นสมาชิกที่อนุมัติแล้วก่อนคืนข้อมูล';


-- ----------------------------------------------------------------------------
--  2. ที่เหลือ เหลือสิทธิ์เฉพาะ authenticated
-- ----------------------------------------------------------------------------
--  ตัวที่คืนข้อมูลจริงกันตัวเองด้วย require_approved_member() อยู่แล้ว
--  ตรงนี้เป็นการปิดชั้นนอกอีกชั้น ไม่ได้ไปเปลี่ยนกติกาอะไรในตัวฟังก์ชัน
-- ----------------------------------------------------------------------------

revoke all on function public.challenge_join_last_day()               from public, anon;
revoke all on function public.backdate_grace_days()                   from public, anon;
revoke all on function public.challenge_lock_at(date)                 from public, anon;
revoke all on function public.round_settle_at(date)                   from public, anon;
revoke all on function public.challenge_status(text, date, numeric, numeric)
                                                                      from public, anon;
revoke all on function public.round_deadlines(date)                   from public, anon;
revoke all on function public.round_challenges(date)                  from public, anon;
revoke all on function public.round_challenge_stakes(date)            from public, anon;
revoke all on function public.challengeable_members()                 from public, anon;
revoke all on function public.create_challenge(uuid, numeric, int)    from public, anon;
revoke all on function public.cancel_challenge(uuid)                  from public, anon;
revoke all on function public.decline_challenge(uuid)                 from public, anon;
revoke all on function public.accept_challenge(uuid)                  from public, anon;
revoke all on function public.join_challenge(uuid, text, int)         from public, anon;
revoke all on function public.admin_delete_challenge(uuid)            from public, anon;

-- revoke จาก PUBLIC ไม่ได้ลบ grant ที่ให้ authenticate ไว้ตรงๆ แต่ให้ซ้ำไว้
-- เผื่อไฟล์นี้ถูกรันในฐานข้อมูลที่ยังไม่มี grant ชุดนั้น
grant execute on function public.challenge_join_last_day()            to authenticated;
grant execute on function public.backdate_grace_days()                to authenticated;
grant execute on function public.challenge_lock_at(date)              to authenticated;
grant execute on function public.round_settle_at(date)                to authenticated;
grant execute on function public.challenge_status(text, date, numeric, numeric)
                                                                      to authenticated;
grant execute on function public.round_deadlines(date)                to authenticated;
grant execute on function public.round_challenges(date)               to authenticated;
grant execute on function public.round_challenge_stakes(date)         to authenticated;
grant execute on function public.challengeable_members()              to authenticated;
grant execute on function public.create_challenge(uuid, numeric, int) to authenticated;
grant execute on function public.cancel_challenge(uuid)               to authenticated;
grant execute on function public.decline_challenge(uuid)              to authenticated;
grant execute on function public.accept_challenge(uuid)               to authenticated;
grant execute on function public.join_challenge(uuid, text, int)      to authenticated;
grant execute on function public.admin_delete_challenge(uuid)         to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ใครเรียก member_round_km ได้บ้าง ควรไม่มี anon / authenticated / PUBLIC
-- select r.rolname, has_function_privilege(r.rolname, p.oid, 'execute')
--   from pg_proc p, pg_roles r
--  where p.proname = 'member_round_km'
--    and r.rolname in ('anon', 'authenticated');

-- เรียกจากข้างในยังได้อยู่ไหม ควรได้ตัวเลขตามปกติ
-- select * from public.round_challenges();
