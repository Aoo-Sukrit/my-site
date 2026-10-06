-- ============================================================================
--  AOOOKULELE & CO. — เทสชั่วคราว: กระดานแซวบังคับสิทธิ์จริงไหม
-- ----------------------------------------------------------------------------
--  ทำไมต้องเทสด้วยไฟล์ migration
--  ฟังก์ชันของกระดานแซวตัดสินใจจาก auth.uid() ซึ่งมาจาก JWT ของคนที่ล็อกอิน
--  เทสจากเครื่องด้วย anon key ได้แค่ว่า "คนนอกเรียกไม่ได้" แต่พิสูจน์ไม่ได้ว่า
--  ระหว่างสมาชิกด้วยกันเอง ใครทำอะไรได้บ้าง เพราะล็อกอินแทนคนอื่นไม่ได้
--
--  ในนี้ตั้งค่า request.jwt.claims แล้วสวมบทเป็นสมาชิกจริงทีละคน
--  เรียกฟังก์ชันตัวจริง ไม่ใช่ตัวจำลอง แล้วตรวจผลว่าตรงกับที่ตั้งใจไว้ไหม
--
--  ถ้าข้อไหนไม่ผ่าน จะ raise exception ซึ่งทำให้ทั้งไฟล์ถูกย้อนกลับทั้งหมด
--  และ Supabase จะรายงานว่า deploy ไม่สำเร็จ
--  เพราะฉะนั้น "deploy เขียว = ทุกข้อผ่าน และไม่มีข้อมูลทดสอบค้างอยู่"
--
--  ข้อมูล: insert เฉพาะตาราง member_wall แล้วลบเฉพาะแถวที่ไฟล์นี้สร้างเอง
--  โดยเก็บ id ไว้ในอาเรย์ ไม่ได้ลบด้วยเงื่อนไขกว้างๆ
--  ไม่แตะตาราง profiles, runs, targets, posts เลยสักคำสั่ง
-- ============================================================================

do $$
declare
  owner_id  uuid;
  friend_id uuid;
  third_id  uuid;
  msg_id    uuid;
  made      uuid[] := '{}';
  seen      int;
  author    uuid;
  blocked   boolean;
  i         int;
begin
  -- ---- หาสมาชิกที่อนุมัติแล้วสามคนมาใช้เทส ----------------------------------
  select id into owner_id
    from public.profiles where status = 'approved'
   order by created_at limit 1;

  select id into friend_id
    from public.profiles where status = 'approved' and id <> owner_id
   order by created_at limit 1;

  select id into third_id
    from public.profiles where status = 'approved'
     and id not in (owner_id, friend_id)
   order by created_at limit 1;

  if third_id is null then
    raise exception 'เทสไม่ได้ ต้องมีสมาชิกที่อนุมัติแล้วอย่างน้อย 3 คน';
  end if;

  -- ---- 1. เพื่อนเขียนบนกระดานของเจ้าของ --------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', friend_id)::text, true);
  set local role authenticated;

  msg_id := public.member_wall_add(owner_id, 'ทดสอบระบบ เดี๋ยวลบทิ้ง');
  made := made || msg_id;

  reset role;
  select author_id into author from public.member_wall where id = msg_id;
  if author is distinct from friend_id then
    raise exception 'ข้อ 1 ไม่ผ่าน: คนเขียนควรเป็น % แต่ได้ %', friend_id, author;
  end if;

  -- ---- 2. คนที่สามเห็นข้อความนั้น ---------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', third_id)::text, true);
  set local role authenticated;

  select count(*) into seen
    from public.member_wall_list(owner_id) w where w.id = msg_id;
  reset role;

  if seen <> 1 then
    raise exception 'ข้อ 2 ไม่ผ่าน: สมาชิกคนอื่นควรเห็นข้อความที่ไม่ได้ซ่อน';
  end if;

  -- ---- 3. คนที่สามซ่อนข้อความบนกระดานคนอื่นไม่ได้ -------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', third_id)::text, true);
  set local role authenticated;

  blocked := false;
  begin
    perform public.member_wall_set_hidden(msg_id, true);
  exception when others then
    blocked := true;
  end;
  reset role;

  if not blocked then
    raise exception 'ข้อ 3 ไม่ผ่าน: คนที่ไม่ใช่เจ้าของกระดานไม่ควรซ่อนได้';
  end if;

  -- ---- 4. คนที่สามลบข้อความของคนอื่นไม่ได้ --------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', third_id)::text, true);
  set local role authenticated;

  blocked := false;
  begin
    perform public.member_wall_delete(msg_id);
  exception when others then
    blocked := true;
  end;
  reset role;

  if not blocked then
    raise exception 'ข้อ 4 ไม่ผ่าน: คนที่ไม่ได้เขียนไม่ควรลบได้';
  end if;

  -- ---- 5. เจ้าของกระดานซ่อนได้ แล้วคนอื่นต้องไม่เห็น ------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id)::text, true);
  set local role authenticated;
  perform public.member_wall_set_hidden(msg_id, true);
  reset role;

  perform set_config('request.jwt.claims',
    json_build_object('sub', third_id)::text, true);
  set local role authenticated;
  select count(*) into seen
    from public.member_wall_list(owner_id) w where w.id = msg_id;
  reset role;

  if seen <> 0 then
    raise exception 'ข้อ 5 ไม่ผ่าน: ข้อความที่ซ่อนแล้วคนอื่นยังเห็นอยู่';
  end if;

  -- ---- 6. เจ้าของกระดานยังเห็นข้อความที่ซ่อนไว้ ---------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id)::text, true);
  set local role authenticated;
  select count(*) into seen
    from public.member_wall_list(owner_id) w
   where w.id = msg_id and w.hidden;
  reset role;

  if seen <> 1 then
    raise exception 'ข้อ 6 ไม่ผ่าน: เจ้าของกระดานควรเห็นข้อความที่ตัวเองซ่อนไว้';
  end if;

  -- ---- 7. โควตา 30 ข้อความต่อวัน ------------------------------------------------
  --  ข้อ 1 ใช้ไปแล้ว 1 ข้อความ จึงเขียนเพิ่มได้อีก 29 ข้อความก่อนจะเต็ม
  perform set_config('request.jwt.claims',
    json_build_object('sub', friend_id)::text, true);
  set local role authenticated;

  for i in 1..29 loop
    made := made || public.member_wall_add(owner_id, 'ทดสอบโควตา ' || i);
  end loop;

  blocked := false;
  begin
    made := made || public.member_wall_add(owner_id, 'ทดสอบโควตา เกิน');
  exception when others then
    blocked := true;
  end;
  reset role;

  if not blocked then
    raise exception 'ข้อ 7 ไม่ผ่าน: เขียนเกิน 30 ข้อความต่อวันได้';
  end if;

  -- ---- 8. คนเขียนลบของตัวเองได้ --------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', friend_id)::text, true);
  set local role authenticated;
  perform public.member_wall_delete(msg_id);
  reset role;

  if exists (select 1 from public.member_wall where id = msg_id) then
    raise exception 'ข้อ 8 ไม่ผ่าน: ลบข้อความของตัวเองแล้วแต่ยังอยู่';
  end if;

  -- ---- เก็บกวาด ------------------------------------------------------------------
  --  ลบเฉพาะ id ที่ไฟล์นี้สร้างเอง ไม่ได้ลบด้วยเงื่อนไขกว้างๆ
  delete from public.member_wall where id = any(made);

  if exists (select 1 from public.member_wall where id = any(made)) then
    raise exception 'เก็บกวาดไม่สำเร็จ ยังมีข้อมูลทดสอบค้างอยู่';
  end if;

  perform set_config('request.jwt.claims', '', true);
end;
$$;
