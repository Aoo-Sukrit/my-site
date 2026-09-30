-- ============================================================================
--  AOOOKULELE & CO. — ให้แอดมินสร้างรูปเล็กย้อนหลังให้สมาชิกได้
-- ----------------------------------------------------------------------------
--  รูปสตอรี่เปลี่ยนมาใช้รูปโปรไฟล์ขนาดเล็ก (<user id>/avatar-320.jpg)
--  ซึ่งตัวอัปโหลดสร้างให้เองตั้งแต่ตอนอัปรูป แต่คนที่อัปไว้ก่อนหน้านี้ยังไม่มี
--  หน้าแอดมินจึงมีปุ่มสร้างย้อนหลังให้ทุกคนครั้งเดียว
--
--  ติดตรงที่ policy เดิมของบัคเก็ต avatars ยอมให้เขียนเฉพาะโฟลเดอร์ของตัวเอง
--    avatars_insert_own : (storage.foldername(name))[1] = auth.uid()
--  แอดมินจึงเขียนไฟล์ในโฟลเดอร์ของคนอื่นไม่ได้เลย
--
--  ไฟล์นี้เปิดช่องให้แอดมินแคบที่สุดเท่าที่พอใช้งาน
--    - เฉพาะบัคเก็ต avatars
--    - เฉพาะคนที่เป็นแอดมินจริง
--    - เฉพาะไฟล์ที่ชื่อลงท้ายด้วย /avatar-320.jpg เท่านั้น
--  แปลว่าแอดมินยังเขียนทับรูปโปรไฟล์จริงของคนอื่นไม่ได้ แตะได้แค่รูปย่อ
--  ซึ่งสร้างใหม่จากรูปจริงได้ตลอดอยู่แล้ว
--
--  ไม่ได้แตะตารางหรือข้อมูลใดๆ เพิ่ม policy สองอันบน storage.objects เท่านั้น
-- ============================================================================

-- upsert ของ supabase-js เข้าทาง insert ก่อน ถ้าไฟล์มีอยู่แล้วค่อยไป update
-- จึงต้องเปิดทั้งสองทาง ไม่งั้นการสร้างซ้ำให้คนที่มีไฟล์อยู่แล้วจะพัง

drop policy if exists avatars_insert_admin_thumb on storage.objects;
create policy avatars_insert_admin_thumb on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.current_user_is_admin()
    and name like '%/avatar-320.jpg'
  );

drop policy if exists avatars_update_admin_thumb on storage.objects;
create policy avatars_update_admin_thumb on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and public.current_user_is_admin()
    and name like '%/avatar-320.jpg'
  )
  with check (
    bucket_id = 'avatars'
    and public.current_user_is_admin()
    and name like '%/avatar-320.jpg'
  );


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- policy ของบัคเก็ต avatars มีอะไรบ้าง
-- select policyname, cmd, qual, with_check
--   from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and policyname like 'avatars%'
--  order by policyname;

-- ตอนนี้ใครมีรูปเล็กแล้วบ้าง
-- select name, (metadata->>'size')::int as ไบต์
--   from storage.objects
--  where bucket_id = 'avatars' and name like '%/avatar-320.jpg'
--  order by name;
