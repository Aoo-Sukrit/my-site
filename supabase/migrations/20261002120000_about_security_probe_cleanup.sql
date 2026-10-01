-- ============================================================================
--  AOOOKULELE & CO. — ลบข้อมูลทดสอบสิทธิ์ของหน้า ABOUT ทิ้ง
-- ----------------------------------------------------------------------------
--  คู่กับ 20261002110000_about_security_probe.sql
--  ยิงทดสอบด้วย anon key เสร็จแล้ว ผลเป็นไปตามที่ออกแบบไว้ทุกข้อ
--
--    about_profile_get()                   อ่านได้ ✓
--    ตาราง about_profile ตรงๆ               42501 permission denied
--    admin_save_about_profile()            42501
--    admin_save_sections()                 42501
--    admin_set_post_pinned()               42501
--    post_sections_list()                  ไม่คืนหมวดที่ซ่อน (probe-hidden ไม่โผล่)
--    section_gallery('photography')        ได้แต่รูปจากโพสต์สาธารณะที่เผยแพร่แล้ว
--                                          รูปจากใบคลับ ลิงก์ลับ แค่ฉัน และร่าง ไม่หลุด
--    section_gallery('probe-hidden')       คืนรายการเปล่า
--
--  ลบ post_media ตามไปเองผ่าน on delete cascade ของ posts
--  ลบโพสต์ด้วย share_token ที่ตั้งไว้ตายตัว ไม่ได้ลบด้วยหัวเรื่องหรือด้วยหมวด
--  โพสต์ "My first website done" ของเจ้าของเว็บจึงไม่ถูกแตะเลย
--  แล้วค่อยลบหมวดซ่อนทีหลัง เพราะ section_id เป็น on delete restrict
--
--  รูปในโพสต์ทดสอบชี้ไปที่อยู่ปลอมที่ไม่มีไฟล์จริง จึงไม่มีไฟล์ค้างใน storage
-- ============================================================================

delete from public.posts
 where share_token in (
   'probeabouttokenpublic00000000000',
   'probeabouttokenclub000000000000',
   'probeabouttokenunlisted00000000',
   'probeabouttokenprivate0000000000',
   'probeabouttokendraft000000000000'
 );

delete from public.post_sections where slug = 'probe-hidden';
