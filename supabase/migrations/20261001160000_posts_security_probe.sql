-- ============================================================================
--  AOOOKULELE & CO. — ข้อมูลชั่วคราวไว้ทดสอบสิทธิ์ของระบบโพสต์
-- ----------------------------------------------------------------------------
--  ใส่โพสต์ทดสอบห้าใบ ใบละแบบ เพื่อยิงทดสอบด้วย anon key ว่าคนที่ยังไม่ล็อกอิน
--  ดึงอะไรได้บ้างจริงๆ ไม่ใช่แค่เชื่อว่าโค้ดถูก
--
--  ทุกใบขึ้นต้นหัวเรื่องด้วย [ทดสอบสิทธิ์] และใช้ share_token ที่เดาได้
--  เพื่อให้ยิงทดสอบได้ ไฟล์ถัดไป (20261001170000_posts_security_probe_cleanup)
--  จะลบทั้งห้าใบทิ้ง ไม่เหลือค้างในฐานข้อมูลจริง
--
--  ไม่มีรูปแนบ จึงไม่มีไฟล์ค้างใน storage
-- ============================================================================

insert into public.posts (title, body, section_id, visibility, status,
                          published_at, share_token)
select v.title, v.body,
       (select id from public.post_sections where slug = 'blog'),
       v.visibility, v.status,
       case when v.status = 'published' then now() end,
       v.token
  from (values
    ('[ทดสอบสิทธิ์] สาธารณะ',  'ใบนี้ทุกคนควรเห็น',        'public',   'published', 'probetokenpublic0000000000000000'),
    ('[ทดสอบสิทธิ์] คลับ',     'ใบนี้เฉพาะสมาชิกคลับ',     'club',     'published', 'probetokenclub000000000000000000'),
    ('[ทดสอบสิทธิ์] ลิงก์ลับ', 'ใบนี้เห็นได้เฉพาะทางลิงก์', 'unlisted', 'published', 'probetokenunlisted0000000000000'),
    ('[ทดสอบสิทธิ์] แค่ฉัน',   'ใบนี้แอดมินเท่านั้น',      'private',  'published', 'probetokenprivate000000000000000'),
    ('[ทดสอบสิทธิ์] ร่าง',     'ใบนี้ยังเป็นร่าง',          'public',   'draft',     'probetokendraft00000000000000000')
  ) as v(title, body, visibility, status, token)
 where not exists (
   select 1 from public.posts p where p.share_token = v.token
 );
