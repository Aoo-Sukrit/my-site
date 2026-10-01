-- ============================================================================
--  AOOOKULELE & CO. — ข้อมูลชั่วคราวไว้ทดสอบสิทธิ์ของหน้า ABOUT
-- ----------------------------------------------------------------------------
--  ทดสอบสองอย่างที่ยังพิสูจน์ด้วยของจริงไม่ได้
--    1. หมวดที่ซ่อนไว้ ต้องไม่โผล่ให้คนที่ยังไม่ล็อกอิน
--    2. แกลเลอรีของหมวด ต้องไม่มีรูปจากโพสต์ club unlisted private หรือร่าง
--
--  ใส่หมวดซ่อนหนึ่งหมวด และโพสต์ห้าใบในหมวด photography ใบละแบบ
--  แต่ละใบมีรูปหนึ่งรูปที่ชี้ไปที่อยู่ปลอม (ไม่มีไฟล์จริงใน storage)
--  เพราะการทดสอบดูแค่ว่ารูปไหนหลุดออกมาในผลลัพธ์ ไม่ได้เปิดรูปจริง
--
--  ทุกอย่างขึ้นต้นด้วย probe- หรือ [ทดสอบสิทธิ์] และไฟล์ถัดไป
--  (20261002120000_about_security_probe_cleanup) จะลบทิ้งให้หมด
--  ไม่แตะโพสต์ของเจ้าของเว็บเลย
-- ============================================================================

insert into public.post_sections (slug, title, kind, position, hidden)
values ('probe-hidden', '[ทดสอบสิทธิ์] หมวดซ่อน', 'hobby', 999, true)
on conflict (slug) do nothing;

with made as (
  insert into public.posts (title, body, section_id, visibility, status,
                            published_at, share_token)
  select v.title, '', 
         (select id from public.post_sections where slug = 'photography'),
         v.visibility, v.status,
         case when v.status = 'published' then now() end,
         v.token
    from (values
      ('[ทดสอบสิทธิ์] รูปสาธารณะ', 'public',   'published', 'probeabouttokenpublic00000000000'),
      ('[ทดสอบสิทธิ์] รูปคลับ',    'club',     'published', 'probeabouttokenclub000000000000'),
      ('[ทดสอบสิทธิ์] รูปลิงก์ลับ', 'unlisted', 'published', 'probeabouttokenunlisted00000000'),
      ('[ทดสอบสิทธิ์] รูปแค่ฉัน',  'private',  'published', 'probeabouttokenprivate0000000000'),
      ('[ทดสอบสิทธิ์] รูปร่าง',     'public',   'draft',     'probeabouttokendraft000000000000')
    ) as v(title, visibility, status, token)
   where not exists (
     select 1 from public.posts p where p.share_token = v.token
   )
  returning id, share_token
)
insert into public.post_media (post_id, position, kind, url, caption)
select made.id, 0, 'image',
       'probe/' || made.share_token || '.jpg',
       '[ทดสอบสิทธิ์] รูปในโพสต์'
  from made;
