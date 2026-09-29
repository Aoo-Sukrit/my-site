-- ============================================================================
--  AOOOKULELE & CO. — เพิ่มแคปชั่นกับเกี่ยวกับ ในโปรไฟล์
-- ----------------------------------------------------------------------------
--  ไฟล์นี้ต่อจาก schema.sql, 002_removed.sql และ 003_runs.sql ที่รันไปแล้ว
--  ไม่ต้องกลับไปรันสามไฟล์นั้นซ้ำ
--
--  วิธีใช้: ก๊อปทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
--  รันซ้ำได้ ไม่พัง
--
--  สารบัญ
--    1. เพิ่มคอลัมน์ caption กับ about
--    2. จำกัดความยาวที่ฝั่งฐานข้อมูล
--    3. ให้สิทธิ์อ่านและแก้คอลัมน์ใหม่  << ห้ามลืม ไม่งั้นพังทั้งเว็บ
--    4. อัปเดตฟังก์ชันกระดานให้ส่งแคปชั่นมาด้วย
-- ============================================================================


-- ============================================================================
--  1. คอลัมน์ใหม่
-- ----------------------------------------------------------------------------
--  ทั้งสองช่องไม่บังคับกรอก ปล่อยเป็น null ได้
--  ไม่ต้องแตะ trigger ข้อ 5 ของ schema.sql เพราะตัวนั้นล็อกแค่ status กับ
--  is_admin สองช่องนี้เจ้าของแถวแก้เองได้ตามปกติ
-- ============================================================================

alter table public.profiles add column if not exists caption text;
alter table public.profiles add column if not exists about   text;

comment on column public.profiles.caption is
  'ประโยคสั้นๆ ใต้ชื่อ โผล่บนกระดานและหน้าโปรไฟล์ ไม่เกิน 60 ตัวอักษร';

comment on column public.profiles.about is
  'ข้อความยาวเล่าเรื่องตัวเอง โผล่เฉพาะหน้าโปรไฟล์ ไม่เกิน 500 ตัวอักษร';


-- ============================================================================
--  2. จำกัดความยาวที่ฝั่งฐานข้อมูลด้วย
-- ----------------------------------------------------------------------------
--  ฝั่งฟอร์มก็จำกัดไว้แล้ว แต่ Server Action ถูกยิงตรงด้วย POST ได้
--  ถ้าเช็กแค่ฝั่งฟอร์มก็เท่ากับไม่ได้เช็ก
--
--  ใช้ char_length ไม่ใช่ length หรือ octet_length เพราะต้องนับเป็นตัวอักษร
--  ภาษาไทยหนึ่งตัวกินหลายไบต์ ถ้านับไบต์จะได้เพดานสั้นกว่าที่ตั้งใจมาก
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_caption_length;
alter table public.profiles
  add constraint profiles_caption_length
  check (caption is null or char_length(caption) <= 60);

alter table public.profiles drop constraint if exists profiles_about_length;
alter table public.profiles
  add constraint profiles_about_length
  check (about is null or char_length(about) <= 500);


-- ============================================================================
--  3. สิทธิ์ของคอลัมน์ใหม่   << ส่วนที่ลืมไม่ได้
-- ----------------------------------------------------------------------------
--  schema.sql ข้อ 7 ถอนสิทธิ์ select และ update ทั้งตารางออก แล้วให้กลับไป
--  เฉพาะคอลัมน์ที่ระบุชื่อไว้ เพื่อซ่อนคอลัมน์ email
--
--  ผลข้างเคียงคือคอลัมน์ไหนที่เพิ่มเข้ามาทีหลังจะไม่มีสิทธิ์ติดมาด้วยเลย
--  ถ้าข้ามข้อนี้ไป เว็บจะขึ้น permission denied for column caption ทันที
--  ที่เปิดหน้าไหนก็ได้ที่ดึงโปรไฟล์
--
--  ให้สิทธิ์แค่ authenticated ไม่ให้ anon เหมือนคอลัมน์อื่น
--  ส่วนใครแก้แถวไหนได้ ยังเป็นหน้าที่ของ RLS เดิม คือเจ้าของแถวกับแอดมิน
-- ============================================================================

grant select (caption, about) on public.profiles to authenticated;
grant update (caption, about) on public.profiles to authenticated;


-- ============================================================================
--  4. ฟังก์ชันกระดาน ส่งแคปชั่นมาด้วย
-- ----------------------------------------------------------------------------
--  ต้อง drop ก่อน create ไม่ใช่ create or replace เฉยๆ
--  เพราะการเพิ่มคอลัมน์ผลลัพธ์คือการเปลี่ยนชนิดที่ฟังก์ชันคืนค่า
--  ซึ่ง create or replace ทำไม่ได้ จะฟ้อง cannot change return type
--
--  ส่วน admin_member_list() ไม่ต้องแตะ เพราะประกาศไว้เป็น
--  returns setof public.profiles คอลัมน์ใหม่จึงติดไปเองอัตโนมัติ
-- ============================================================================

drop function if exists public.month_leaderboard(date);

create function public.month_leaderboard(target_month date default null)
returns table (
  member_id   uuid,
  nickname    text,
  caption     text,
  avatar_url  text,
  is_admin    boolean,
  total_km    numeric,
  run_count   bigint,
  rank_no     bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with picked as (
    select coalesce(target_month, public.current_month_bkk()) as month
  ),
  totals as (
    select p.id            as member_id,
           p.nickname      as nickname,
           p.caption       as caption,
           p.avatar_url    as avatar_url,
           p.is_admin      as is_admin,
           coalesce(sum(r.distance_km), 0)::numeric as total_km,
           count(r.id)     as run_count
      from public.profiles p
      left join public.runs r
        on r.profile_id = p.id
       and r.round_id in (
             select rd.id from public.rounds rd, picked
              where rd.month = picked.month
           )
     where p.status = 'approved'
     group by p.id, p.nickname, p.caption, p.avatar_url, p.is_admin
  )
  select t.member_id,
         t.nickname,
         t.caption,
         t.avatar_url,
         t.is_admin,
         t.total_km,
         t.run_count,
         rank() over (order by t.total_km desc) as rank_no
    from totals t
   where public.current_profile_status() = 'approved'
   order by t.total_km desc, t.nickname;
$$;

grant execute on function public.month_leaderboard(date) to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- คอลัมน์ใหม่มาครบไหม
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles'
--  order by ordinal_position;

-- สิทธิ์ของ authenticated บนคอลัมน์ใหม่ ควรเห็น SELECT กับ UPDATE
-- select column_name, privilege_type
--   from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'profiles'
--    and grantee = 'authenticated' and column_name in ('caption', 'about')
--  order by column_name, privilege_type;

-- เพดานความยาวทำงานไหม บรรทัดนี้ควร error
-- update public.profiles set caption = repeat('ก', 61) where id = (select auth.uid());
