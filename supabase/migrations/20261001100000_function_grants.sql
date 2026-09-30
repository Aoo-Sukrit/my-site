-- ============================================================================
--  AOOOKULELE & CO. — ไล่ปิดสิทธิ์ฟังก์ชันทั้ง schema public
-- ----------------------------------------------------------------------------
--  Postgres ให้ execute กับ PUBLIC เป็นค่าเริ่มต้นสำหรับฟังก์ชันทุกตัวที่สร้าง
--  การเขียน grant execute ... to authenticated ไม่ได้ถอนของ PUBLIC ออก
--  แปลว่า anon ซึ่งยังไม่ได้ล็อกอินก็เรียกได้ทุกตัวที่ไม่ได้ถอนไว้เอง
--
--  เคยเจอรูนี้มาแล้วจริงกับ member_round_km() ซึ่งคืนระยะรวมรายเดือนของใครก็ได้
--  ให้คนที่ถือแค่ anon key (แก้ไปใน 20260930213000_challenge_grants.sql)
--  ตอนนี้มีสมาชิกใหม่ที่เจ้าของเว็บไม่รู้จักเข้ามา เลยไล่ปิดให้หมดทั้งโปรเจกต์
--
--  วิธี ถอนของทุกคนก่อนเป็นฐาน แล้วค่อยให้กลับเฉพาะเท่าที่จำเป็น
--  ทำแบบนี้แทนการไล่ถอนทีละตัว เพราะถ้ามีฟังก์ชันไหนหลุดสายตาไป
--  มันจะถูกปิดโดยอัตโนมัติ ไม่ใช่เปิดทิ้งไว้โดยอัตโนมัติ
--
--  สรุปจำนวน ณ ไฟล์นี้ 61 ฟังก์ชัน
--    13 ตัว เป็นฟังก์ชันของ trigger ไม่ต้องให้ใคร execute เลย
--    13 ตัว เป็นตัวช่วยภายใน ถูกเรียกจากในฟังก์ชัน security definer เท่านั้น
--    35 ตัว เปิดให้ authenticated เพราะหน้าเว็บเรียกจริง หรือ policy ใช้
--     1 ใน 35 นั้น (nickname_available) เปิดให้ anon ด้วย เพราะหน้าสมัคร
--       ต้องเช็กชื่อซ้ำตั้งแต่ยังไม่ล็อกอิน
--
--  สารบัญ
--    1. ฟังก์ชันใหม่ต่อจากนี้ไม่ได้ execute ให้ PUBLIC อัตโนมัติ
--    2. ถอนของทุกคนเป็นฐาน
--    3. ให้กลับเฉพาะที่จำเป็น
-- ============================================================================


-- ============================================================================
--  1. ค่าเริ่มต้นของฟังก์ชันที่จะสร้างต่อจากนี้
-- ----------------------------------------------------------------------------
--  alter default privileges ผูกกับ role ที่สร้างวัตถุ ไม่ใช่กับ schema เฉยๆ
--  migration รันด้วย postgres จึงตั้งให้ทั้ง current_user และ postgres
--  ห่อ exception ไว้เพราะถ้าฐานข้อมูลไหนไม่มี role postgres จะได้ไม่ล้มทั้งไฟล์
-- ============================================================================

alter default privileges in schema public revoke execute on functions from public;

do $$
begin
  execute 'alter default privileges for role postgres in schema public '
       || 'revoke execute on functions from public';
exception when others then
  raise notice 'ตั้ง default privileges ให้ role postgres ไม่สำเร็จ: %', sqlerrm;
end;
$$;


-- ============================================================================
--  2. ถอนของทุกคนเป็นฐาน
-- ----------------------------------------------------------------------------
--  ไล่ทุกฟังก์ชันใน schema public ด้วย pg_proc ไม่ได้ไล่ตามรายชื่อที่จดไว้
--  จะได้ครอบคลุมตัวที่เผลอลืมด้วย
-- ============================================================================

do $$
declare
  fn record;
  n  int := 0;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       -- ข้ามฟังก์ชันที่มากับ extension ถ้าวันหลังมีใครติดตั้งลง public
       -- การไปถอนสิทธิ์ของ extension จะทำให้ของที่พึ่งมันพังโดยไม่รู้ตัว
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'
       )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated', fn.sig
    );
    n := n + 1;
  end loop;

  raise notice 'ถอนสิทธิ์ execute ไปแล้ว % ฟังก์ชัน', n;
end;
$$;


-- ============================================================================
--  3. ให้กลับเฉพาะที่จำเป็น
-- ============================================================================

-- ----------------------------------------------------------------------------
--  3.1 หน้าสมัคร ต้องเช็กชื่อซ้ำตั้งแต่ยังไม่ล็อกอิน
--      ฟังก์ชันนี้คืนแค่ true/false ว่าชื่อว่างไหม ไม่ได้คืนข้อมูลของใคร
-- ----------------------------------------------------------------------------

grant execute on function public.nickname_available(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
--  3.2 ฟังก์ชันที่ RLS policy กับ storage policy เรียกใช้
--      policy ถูกประเมินด้วยสิทธิ์ของคนที่เรียก ไม่ใช่สิทธิ์ของเจ้าของตาราง
--      ถ้าถอนสามตัวนี้จาก authenticated ทั้งเว็บจะพังทันที อ่านอะไรไม่ได้เลย
--        current_profile_status  ใช้ใน policy ของ profiles rounds runs
--                                run_edits และ storage (proofs prizes)
--        current_user_is_admin   ใช้ใน policy ฝั่งแอดมินของตารางเดียวกัน
--        prize_image_visible     ใช้ใน policy อ่านไฟล์ของบัคเก็ต prizes
-- ----------------------------------------------------------------------------

grant execute on function public.current_profile_status()  to authenticated;
grant execute on function public.current_user_is_admin()   to authenticated;
grant execute on function public.prize_image_visible(text) to authenticated;

-- ----------------------------------------------------------------------------
--  3.3 ฟังก์ชันที่หน้าเว็บเรียกผ่าน supabase.rpc() จริง
--      ตรวจรายชื่อด้วยการ grep หา .rpc( ทั้ง src/ แล้วเทียบทีละตัว
--      รวมสามตัวที่เรียกผ่านตัวแปรใน challenges/actions.ts ซึ่ง grep ธรรมดาไม่เจอ
--      (accept_challenge decline_challenge cancel_challenge)
-- ----------------------------------------------------------------------------

-- รอบและกระดาน
grant execute on function public.current_round()                to authenticated;
grant execute on function public.round_for_date(date)           to authenticated;
grant execute on function public.round_by_month(date)           to authenticated;
grant execute on function public.round_months()                 to authenticated;
grant execute on function public.month_leaderboard(date)        to authenticated;
grant execute on function public.month_percent_board(date)      to authenticated;

-- เกมตั้งเป้า
grant execute on function public.my_target_state()              to authenticated;
grant execute on function public.votable_members()              to authenticated;
grant execute on function public.my_votes()                     to authenticated;
grant execute on function public.round_targets(date)            to authenticated;
grant execute on function public.round_vote_breakdown(date)     to authenticated;
grant execute on function public.set_my_target(numeric)         to authenticated;
grant execute on function public.vote_on_target(uuid, int)      to authenticated;

-- รางวัล
grant execute on function public.round_prizes(date)             to authenticated;
grant execute on function public.delete_prize(uuid)             to authenticated;
grant execute on function public.reveal_prize(uuid)             to authenticated;
grant execute on function public.create_prize(
  text, int, boolean, text, text, text, boolean
) to authenticated;
grant execute on function public.update_prize(
  uuid, text, int, boolean, text, text, text
) to authenticated;

-- คำท้า
grant execute on function public.round_deadlines(date)          to authenticated;
grant execute on function public.round_challenges(date)         to authenticated;
grant execute on function public.round_challenge_stakes(date)   to authenticated;
grant execute on function public.challengeable_members()        to authenticated;
grant execute on function public.create_challenge(uuid, numeric, int)
                                                                to authenticated;
grant execute on function public.accept_challenge(uuid)         to authenticated;
grant execute on function public.decline_challenge(uuid)        to authenticated;
grant execute on function public.cancel_challenge(uuid)         to authenticated;
grant execute on function public.join_challenge(uuid, text, int)
                                                                to authenticated;
grant execute on function public.admin_delete_challenge(uuid)   to authenticated;

-- แอดมิน (ตัวฟังก์ชันเช็กเองว่าคนเรียกเป็นแอดมินจริง)
grant execute on function public.admin_member_list()            to authenticated;
grant execute on function public.admin_reset_target(uuid)       to authenticated;
grant execute on function public.admin_clear_round_targets()    to authenticated;


-- ============================================================================
--  ที่เหลือไม่ได้ให้ใครโดยตั้งใจ
-- ----------------------------------------------------------------------------
--  ฟังก์ชันของ trigger (13 ตัว) ไม่ต้องมีสิทธิ์ execute ให้ใคร Postgres เรียก
--  ให้เองตอน trigger ทำงาน
--    enforce_run_edit_window  enforce_run_entry_window  guard_challenge_write
--    guard_prize_write  guard_round_write  guard_stake_write  guard_target_write
--    guard_vote_write  handle_new_user  log_run_edit  protect_profile_columns
--    sync_user_email  touch_updated_at
--
--  ตัวช่วยภายใน (13 ตัว) ถูกเรียกจากในฟังก์ชัน security definer ซึ่งทำงานใน
--  นามเจ้าของฟังก์ชัน จึงไม่ต้องเปิดให้ role ภายนอกเลย
--    backdate_grace_days  challenge_join_last_day  challenge_lock_at
--    challenge_status  current_month_bkk  default_results_at  member_round_km
--    prize_is_secret  require_approved_member  round_month_end  round_settle_at
--    thai_month_label  today_bkk
--
--  ถ้าวันหลังหน้าเว็บต้องเรียกตัวไหนในสองกลุ่มนี้ ต้องเพิ่ม grant ในไฟล์ใหม่
--  อย่าไปแก้ไฟล์นี้ เพราะรันไปแล้ว
-- ============================================================================


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- anon เรียกอะไรได้บ้าง ควรเหลือแค่ nickname_available แถวเดียว
-- select p.oid::regprocedure as ฟังก์ชัน
--   from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--  where ns.nspname = 'public'
--    and has_function_privilege('anon', p.oid, 'execute')
--  order by 1;

-- authenticated เรียกอะไรได้บ้าง ควรได้ 35 แถว
-- select count(*) from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--  where ns.nspname = 'public'
--    and has_function_privilege('authenticated', p.oid, 'execute');

-- PUBLIC ยังเหลือสิทธิ์ที่ไหนไหม ควรได้ 0 แถว
-- select p.oid::regprocedure
--   from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--  where ns.nspname = 'public'
--    and array_to_string(p.proacl, ',') like '%=X/%'
--    and array_to_string(p.proacl, ',') like '%,=X%';
