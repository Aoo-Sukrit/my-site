-- ============================================================================
--  AOOOKULELE & CO. — ระบบสมาชิก CLUB
-- ----------------------------------------------------------------------------
--  วิธีใช้: ก๊อปไฟล์นี้ทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง (ทุกคำสั่งเป็น if not exists / create or replace / drop ก่อน)
--  ส่วนตั้งตัวเองเป็นแอดมิน อยู่ล่างสุดของไฟล์ ข้อ 9
-- ============================================================================


-- ============================================================================
--  1. ตาราง profiles
-- ============================================================================

create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  nickname    text        not null,
  email       text,
  avatar_url  text,
  status      text        not null default 'pending'
                          check (status in ('pending', 'approved', 'blocked')),
  is_admin    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- เผื่อเคยรันไฟล์เวอร์ชันก่อนหน้าที่ยังไม่มีคอลัมน์ email
alter table public.profiles add column if not exists email text;

comment on table public.profiles is
  'โปรไฟล์สมาชิก CLUB ผูก 1:1 กับ auth.users แถวถูกสร้างอัตโนมัติตอนสมัคร';

comment on column public.profiles.email is
  'สำเนาอีเมลจาก auth.users ไว้ให้แอดมินดูว่าใครเป็นใคร คนทั่วไปอ่านไม่ได้ ดูข้อ 7';

-- ฉายาห้ามซ้ำ และเทียบแบบไม่สนตัวพิมพ์เล็กใหญ่
-- (กัน Aoo กับ aoo อยู่บนกระดานพร้อมกันแล้วงงว่าใครเป็นใคร)
create unique index if not exists profiles_nickname_lower_key
  on public.profiles (lower(nickname));

-- ใช้เรียงคิวคนรออนุมัติในหน้าแอดมิน
create index if not exists profiles_status_idx
  on public.profiles (status);


-- ============================================================================
--  2. อัปเดต updated_at อัตโนมัติ
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ============================================================================
--  3. สมัครสมาชิกใหม่ แล้วสร้างแถวใน profiles ให้อัตโนมัติ
-- ----------------------------------------------------------------------------
--  ฉายาส่งมาจากหน้าสมัครผ่าน options.data.nickname ซึ่งไปโผล่ที่
--  auth.users.raw_user_meta_data ส่วนอีเมลคัดลอกมาจาก auth.users ตรงๆ
--  ต้องเป็น security definer เพื่อให้ insert ผ่าน RLS ได้
--  เพราะตอนนั้นยังไม่มี session ของคนสมัคร
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
      -- เผื่อสมัครจากช่องทางอื่นที่ไม่ได้ส่งฉายามา จะได้ไม่ล้ม
      'member_' || substr(new.id::text, 1, 8)
    ),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ถ้าสมาชิกไปเปลี่ยนอีเมลทีหลัง ให้สำเนาในตารางนี้ตามไปด้วย
-- ไม่งั้นหน้าแอดมินจะโชว์อีเมลเก่าค้างอยู่
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_user_email();

-- เติมอีเมลให้คนที่สมัครไปก่อนหน้านี้แล้ว
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email is distinct from u.email;


-- ============================================================================
--  4. ฟังก์ชันช่วยเช็กสิทธิ์ (ตัวแก้ปัญหา infinite recursion)
-- ----------------------------------------------------------------------------
--  policy บน profiles ที่ไป select profiles เพื่อถามว่า คนนี้เป็นแอดมินไหม
--  จะไปกระตุ้น policy ตัวเดิมซ้ำไม่รู้จบ กลายเป็น infinite recursion
--
--  ทางแก้คือย้ายคำถามนั้นมาไว้ในฟังก์ชัน security definer
--  ซึ่งรันด้วยสิทธิ์ของเจ้าของฟังก์ชัน จึงข้าม RLS ไปเลย
--  ไม่วนกลับมาเรียก policy อีก
-- ============================================================================

create or replace function public.current_profile_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.profiles where id = (select auth.uid())),
    false
  );
$$;

grant execute on function public.current_profile_status() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

-- ใช้ตอนสมัคร เพื่อบอกได้ว่าฉายาซ้ำ ก่อนจะกดสมัครจริง
-- คนที่ยังไม่ล็อกอินอ่านตาราง profiles ไม่ได้ เลยต้องผ่านฟังก์ชันนี้
-- ซึ่งตอบแค่ว่าง/ไม่ว่าง ไม่เปิดเผยข้อมูลของใคร
create or replace function public.nickname_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where lower(nickname) = lower(trim(candidate))
  );
$$;

grant execute on function public.nickname_available(text) to anon, authenticated;


-- ============================================================================
--  5. ล็อกคอลัมน์ status กับ is_admin ไม่ให้เจ้าของแถวแก้เอง
-- ----------------------------------------------------------------------------
--  RLS คุมได้แค่ระดับ แถวไหนแก้ได้ ไม่ได้คุมระดับคอลัมน์
--  ถ้าจะคุมด้วย WITH CHECK อย่างเดียวต้องเทียบค่าเก่ากับค่าใหม่ในนิพจน์เดียว
--  ซึ่งอ่านยากและพลาดง่าย เลยใช้ trigger ดักตรงๆ ชัดกว่า
--
--  ส่วนคอลัมน์ email ไม่ต้องดักตรงนี้ เพราะข้อ 7 ไม่ให้สิทธิ์ update
--  คอลัมน์นั้นกับใครเลยตั้งแต่แรก
-- ============================================================================

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- ไม่มี auth.uid() แปลว่ารันจาก SQL Editor หรือ service_role ปล่อยผ่าน
  -- (ท่อนตั้งแอดมินคนแรก ข้อ 9 ต้องอาศัยข้อนี้)
  if (select auth.uid()) is null then
    return new;
  end if;

  -- แอดมินแก้ status กับ is_admin ได้
  if public.current_user_is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'ไม่มีสิทธิ์แก้ status'
      using errcode = '42501';
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'ไม่มีสิทธิ์แก้ is_admin'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();


-- ============================================================================
--  6. RLS บน profiles (คุมว่าแถวไหนอ่าน/แก้ได้)
-- ============================================================================

alter table public.profiles enable row level security;

-- ---- อ่าน -------------------------------------------------------------------

-- ทุกคนอ่านแถวตัวเองได้ รวมคนที่ยัง pending
-- (ไม่งั้นจะไม่รู้สถานะตัวเอง และหน้า /club/pending จะแสดงอะไรไม่ได้เลย)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- คน approved อ่านโปรไฟล์ของคน approved ด้วยกันได้
drop policy if exists profiles_select_approved on public.profiles;
create policy profiles_select_approved on public.profiles
  for select to authenticated
  using (
    status = 'approved'
    and public.current_profile_status() = 'approved'
  );

-- แอดมินอ่านได้ทุกแถว
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.current_user_is_admin());

-- ---- แก้ไข ------------------------------------------------------------------

-- ทุกคนแก้แถวตัวเองได้ ส่วน status กับ is_admin ถูก trigger ข้อ 5 ล็อกไว้
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- แอดมินแก้ได้ทุกแถว
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ไม่มี policy สำหรับ insert กับ delete โดยตั้งใจ
--   insert  ทำผ่าน trigger ตอนสมัครเท่านั้น
--   delete  ถ้าจะลบสมาชิกให้ลบที่ auth.users แล้วแถวนี้หายตามเอง (on delete cascade)


-- ============================================================================
--  7. ซ่อนคอลัมน์ email  << ส่วนสำคัญ อ่านก่อนแก้อะไรตรงนี้
-- ----------------------------------------------------------------------------
--  ปัญหา: RLS ตัดสินได้แค่ว่า "แถวนี้อ่านได้ไหม" ตัดสินรายคอลัมน์ไม่ได้
--  พอ policy profiles_select_approved เปิดให้คน approved อ่านแถวของเพื่อน
--  ที่ approved ด้วยกัน เท่ากับเปิดให้เห็น "ทุกคอลัมน์" ของแถวนั้น
--  รวมถึง email ด้วย ซึ่งไม่ใช่สิ่งที่เราต้องการ
--
--  ทางแก้คือใช้ column-level privilege ของ Postgres ซึ่งเป็นคนละชั้นกับ RLS
--  ถอนสิทธิ์ select ทั้งตารางออกก่อน แล้วค่อยให้กลับไปเฉพาะคอลัมน์ที่เปิดเผยได้
--  ผลคือ authenticated อ่านคอลัมน์ email ไม่ได้เลย ไม่ว่า policy จะว่ายังไง
--  Postgres จะปฏิเสธตั้งแต่ระดับสิทธิ์
--
--  แล้วแอดมินกับเจ้าตัวดูอีเมลยังไง
--    - เจ้าตัว  เว็บอ่านจาก auth.users ผ่าน getUser() อยู่แล้ว ไม่ต้องแตะตารางนี้
--    - แอดมิน   เรียกฟังก์ชัน admin_member_list() ข้างล่าง ซึ่งเป็น
--               security definer จึงอ่าน email ได้ แต่ตอบกลับเฉพาะตอนที่
--               คนเรียกเป็นแอดมินจริงเท่านั้น
-- ============================================================================

revoke select on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;

grant select
  (id, nickname, avatar_url, status, is_admin, created_at, updated_at)
  on public.profiles to authenticated;

-- ไม่มี email ในลิสต์นี้ อีเมลจึงแก้จากหน้าเว็บไม่ได้เลย
-- มีทางเดียวคือเปลี่ยนที่ auth.users แล้ว trigger ข้อ 3 จะ sync ตามมาเอง
grant update
  (nickname, avatar_url, status, is_admin)
  on public.profiles to authenticated;

-- รายชื่อสมาชิกทั้งหมดพร้อมอีเมล สำหรับหน้าแอดมิน
-- ไม่ใช่แอดมินเรียกได้ แต่จะได้ผลลัพธ์ว่างเปล่ากลับไป
create or replace function public.admin_member_list()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select *
    from public.profiles
   where public.current_user_is_admin()
   order by created_at;
$$;

grant execute on function public.admin_member_list() to authenticated;


-- ============================================================================
--  8. Storage: บัคเก็ต avatars
-- ----------------------------------------------------------------------------
--  public = true เพื่อให้เอา URL รูปไปแปะได้ตรงๆ ไม่ต้องทำ signed url
--  file_size_limit 512000 ไบต์ = 500KB เป็นด่านสุดท้าย
--  ฝั่งเว็บย่อรูปให้เล็กกว่านี้อยู่แล้วก่อนอัป
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ใครก็ดูรูปโปรไฟล์ได้ เพราะบัคเก็ตเป็น public อยู่แล้ว
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- อัป แก้ ลบ ได้เฉพาะในโฟลเดอร์ที่ชื่อตรงกับ user id ของตัวเอง
-- เช่น avatars/1f2e3d4c.../avatar-1700000000.jpg
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================================
--  9. ตั้งตัวเองเป็นแอดมิน   << ต้องทำ ไม่งั้นไม่มีใครอนุมัติใครได้เลย
-- ----------------------------------------------------------------------------
--  ลำดับที่ถูกต้อง:
--    1) รันไฟล์นี้ทั้งไฟล์ก่อน
--    2) ไปสมัครสมาชิกที่เว็บตามปกติที่ /club/signup
--    3) กลับมาที่ SQL Editor ลบ -- หน้าสองบรรทัดล่างนี้ออก
--       แก้อีเมลให้เป็นอีเมลที่เพิ่งสมัคร แล้วกด Run
--    4) รีเฟรชเว็บ จะเข้า /club/admin ได้แล้ว
--
--  ท่อนนี้ต้องรันจาก SQL Editor เท่านั้นถึงจะผ่าน
--  เพราะตอนนั้น auth.uid() เป็น null ทำให้ trigger ข้อ 5 ปล่อยผ่านให้
--  ถ้ายิงคำสั่งเดียวกันนี้จากหน้าเว็บจะโดนบล็อก
-- ============================================================================

-- update public.profiles set status = 'approved', is_admin = true
-- where id = (select id from auth.users where email = 'เปลี่ยนเป็นอีเมลคุณ@example.com');


-- ตรวจผลว่าตั้งสำเร็จไหม (ลบ -- ออกแล้วกด Run)
-- select nickname, email, status, is_admin
--   from public.profiles
--  order by created_at;
