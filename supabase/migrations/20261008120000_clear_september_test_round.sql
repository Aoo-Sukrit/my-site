-- ============================================================================
--  AOOOKULELE & CO. — ล้างรอบเดือนกันยายน 2569 ทิ้งทั้งรอบ
-- ----------------------------------------------------------------------------
--  เดือนกันยายนเป็นเดือนเทสระบบ เจ้าของเว็บขอให้ลบทิ้ง (8 ต.ค. 2569 ตอบ "ก")
--  ให้เว็บดูเหมือนคลับเริ่มเดือนตุลาคม
--
--  ลบอะไร (เฉพาะที่ผูกกับรอบ month = 2026-09-01 เท่านั้น)
--    - runs          ผลวิ่งทุกรายการในรอบนั้น
--    - run_edits     ประวัติการแก้ของผลวิ่งพวกนั้น
--                    (รวมแถว "delete" ที่ trigger เขียนเพิ่มตอนเราลบในไฟล์นี้)
--    - targets, target_votes, prizes, challenges (+ challenge_stakes)
--                    หายตามรอบเอง เพราะผูก on delete cascade กับ rounds
--    - rounds        แถวของรอบกันยายน
--
--  ไม่แตะ
--    สมาชิก โปรไฟล์ รูปโปรไฟล์ รอบเดือนตุลาคมและทุกอย่างในนั้น โพสต์ หน้า ABOUT
--    กระดานแซว ข้อเสนอแก้กติกา
--
--  ที่ไฟล์นี้ไม่ได้ลบ
--    รูปหลักฐานผลวิ่งใน Storage bucket "proofs" ไม่ลบผ่าน SQL เพราะจะทำให้
--    ระบบไฟล์ของ Supabase ไม่ตรงกับตาราง ถ้าจะลบให้ลบจาก Dashboard → Storage
--
--  รันซ้ำได้: ถ้าไม่เจอรอบกันยายนแล้วก็ไม่ทำอะไร
--  ลบแล้วกู้คืนไม่ได้
-- ============================================================================

do $$
declare
  sept_id     uuid;
  run_ids     uuid[];
  n_runs      int;
  n_edits     int;
  n_targets   int;
  n_votes     int;
  n_prizes    int;
  n_chal      int;
begin
  select id into sept_id from public.rounds where month = date '2026-09-01';

  if sept_id is null then
    raise notice 'ไม่เจอรอบเดือนกันยายน 2569 แล้ว ไม่มีอะไรให้ลบ';
    return;
  end if;

  -- กันพลาด: ห้ามลบรอบที่ยังเป็นเดือนปัจจุบัน
  if date '2026-09-01' = public.current_month_bkk() then
    raise exception 'ไม่ลบรอบของเดือนปัจจุบัน';
  end if;

  -- นับไว้ก่อน จะได้รายงานใน log ว่าลบไปเท่าไหร่
  select array_agg(id) into run_ids from public.runs where round_id = sept_id;
  n_runs    := coalesce(array_length(run_ids, 1), 0);
  select count(*) into n_targets from public.targets      where round_id = sept_id;
  select count(*) into n_votes   from public.target_votes where round_id = sept_id;
  select count(*) into n_prizes  from public.prizes       where round_id = sept_id;
  select count(*) into n_chal    from public.challenges   where round_id = sept_id;

  -- ผลวิ่งต้องลบก่อน เพราะ runs ผูกกับ rounds แบบ on delete restrict
  -- migration ไม่มี auth.uid() trigger กันการแก้จึงปล่อยผ่าน
  delete from public.runs where round_id = sept_id;

  -- ประวัติการแก้ไม่มี foreign key ไปที่ runs ต้องลบตาม run_id เอง
  -- ทำหลังลบ runs เพราะตอนลบ trigger บันทึกแถว "delete" เพิ่มเข้ามาอีก
  delete from public.run_edits where run_id = any (coalesce(run_ids, '{}'));
  get diagnostics n_edits = row_count;

  -- เป้า โหวต รางวัล คำท้า หายตามเองด้วย cascade
  delete from public.rounds where id = sept_id;

  raise notice 'ลบรอบกันยายน 2569 แล้ว: ผลวิ่ง % รายการ, ประวัติแก้ % แถว, เป้า % คน, โหวต % ครั้ง, รางวัล % รายการ, คำท้า % ใบ',
    n_runs, n_edits, n_targets, n_votes, n_prizes, n_chal;
end;
$$;
