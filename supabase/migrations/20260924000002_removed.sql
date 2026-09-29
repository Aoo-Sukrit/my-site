-- ============================================================================
--  AOOOKULELE & CO. — เพิ่มสถานะ 'removed' (เอาออกจากคลับ)
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql ที่รันไปแล้ว ไม่ต้องกลับไปรันไฟล์เดิมซ้ำ
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง
--
--  สถานะทั้งหมดหลังรันไฟล์นี้
--    pending   เพิ่งสมัคร รอแอดมินอนุมัติ
--    approved  สมาชิกเต็มตัว เข้าได้ทุกหน้า
--    blocked   ถูกระงับ
--    removed   เอาออกจากคลับแล้ว
--
--  blocked กับ removed ต่างกันที่เจตนา ไม่ได้ต่างกันที่สิทธิ์
--    blocked ไว้ใช้ตอนมีปัญหาเฉพาะหน้า อยากพักไว้ก่อน
--    removed ไว้ใช้ตอนออกจากทีมจริงๆ
--  ทั้งคู่เข้าเว็บไม่ได้เหมือนกัน และไม่โผล่ในรายชื่อสมาชิกเหมือนกัน
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. ขยาย check constraint ของคอลัมน์ status ให้รับค่า 'removed'
-- ----------------------------------------------------------------------------
--  constraint เดิมถูกสร้างแบบไม่ได้ตั้งชื่อเอง Postgres เลยตั้งชื่อให้
--  ปกติจะได้ profiles_status_check แต่ถ้าเคยแก้อะไรไว้ชื่ออาจไม่ตรง
--  เลยไล่หาจาก catalog แล้วลบให้หมดก่อน จะได้ไม่มีตัวเก่าค้างมาบล็อก
-- ----------------------------------------------------------------------------

do $$
declare
  con record;
begin
  for con in
    select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'profiles'
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.profiles drop constraint %I', con.conname);
  end loop;
end
$$;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'approved', 'blocked', 'removed'));


-- ============================================================================
--  ไม่ต้องแก้ RLS หรือ policy อะไรเพิ่มเลย เพราะของเดิมเขียนไว้แบบ
--  "เฉพาะ approved เท่านั้นที่ผ่าน" ไม่ได้ไล่บล็อกทีละสถานะ
--
--    profiles_select_approved  เงื่อนไขคือ status = 'approved' ทั้งฝั่งคนอ่าน
--                              และฝั่งแถวที่ถูกอ่าน คน removed จึงหายจาก
--                              รายชื่อสมาชิกเอง และอ่านโปรไฟล์ใครไม่ได้ด้วย
--    profiles_select_own       ยังอ่านแถวตัวเองได้ เพื่อให้หน้าแจ้งสถานะ
--                              บอกได้ว่าเกิดอะไรขึ้น
--    profiles_select_admin     แอดมินยังเห็นทุกแถวรวมคน removed
--    profiles_update_admin     แอดมินกดคืนสถานะได้
--    profiles_protect_columns  คนทั่วไปยังแก้ status ตัวเองไม่ได้เหมือนเดิม
--
--  ฝั่งเว็บ proxy.ts ก็เช็กว่า status !== 'approved' แล้วเด้งออก
--  จึงครอบคลุม removed อยู่แล้วตั้งแต่ยังไม่มีสถานะนี้
-- ============================================================================


-- ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ควรได้ constraint ที่มี removed อยู่ในนั้น
-- select pg_get_constraintdef(c.oid) as รายละเอียด
--   from pg_constraint c
--   join pg_class t on t.oid = c.conrelid
--  where t.relname = 'profiles' and c.contype = 'c';

-- ดูจำนวนคนในแต่ละสถานะ
-- select status, count(*) from public.profiles group by status order by status;
