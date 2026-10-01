-- ============================================================================
--  AOOOKULELE & CO. — หัวข้อหน้า BLOG ที่แก้ได้ + ปิดชื่อคนนำจากคนนอก
-- ----------------------------------------------------------------------------
--  สองเรื่องในไฟล์เดียวเพราะแตะคนละที่ ไม่ทับกัน และทั้งคู่เป็นงานเล็ก
--
--  สารบัญ
--    1. ตาราง blog_content (แถวเดียว) + ฟังก์ชันอ่านและเขียน
--    2. home_club_summary() ไม่คืนคนนำให้คนนอก
--    3. สิทธิ์
-- ============================================================================


-- ============================================================================
--  1. blog_content
-- ----------------------------------------------------------------------------
--  เดิมคำว่า "บล็อก" กับประโยคใต้หัวข้อฝังอยู่ใน src/app/blog/page.tsx
--  จะแก้คำเดียวก็ต้อง deploy ใหม่ ย้ายมาอยู่ในตารางแบบเดียวกับ home_content
--
--  ทำไมเป็นตารางใหม่ไม่ใช่เพิ่มคอลัมน์ใน home_content
--  ชื่อ home_content บอกว่าเก็บข้อความของหน้าแรก ถ้ายัดข้อความหน้า BLOG
--  เข้าไปด้วย ชื่อตารางจะเริ่มโกหก คนที่มาอ่านโค้ดทีหลังจะเดาผิด
--
--  แต่พอมีหน้าที่สามที่ต้องแก้ได้แบบนี้ ถึงเวลาเลิกทำตารางต่อหน้าแล้วย้ายไป
--  ตารางเดียวที่มีคอลัมน์บอกว่าเป็นของหน้าไหน ตอนนี้แค่สองหน้ายังไม่คุ้มที่จะรื้อ
--
--  หัวข้อใหญ่ห้ามว่าง (not null + check ว่าตัดช่องว่างแล้วต้องยังเหลือตัวอักษร)
--  เพราะหน้าที่ไม่มีหัวข้อเลยอ่านแล้วเหมือนเว็บพัง
--  ส่วนประโยคใต้หัวข้อว่างได้ หน้าเว็บซ่อนให้เอง
-- ============================================================================

create table if not exists public.blog_content (
  id         boolean     primary key default true check (id),
  title      text        not null
                         check (char_length(btrim(title)) between 1 and 80),
  subtitle   text        check (subtitle is null or char_length(subtitle) <= 300),
  updated_at timestamptz not null default now()
);

comment on table public.blog_content is
  'หัวข้อและประโยคใต้หัวข้อของหน้า BLOG มีแถวเดียวเสมอ แก้ได้เฉพาะแอดมิน ทุกคนอ่านได้';

drop trigger if exists blog_content_touch_updated_at on public.blog_content;
create trigger blog_content_touch_updated_at
  before update on public.blog_content
  for each row execute function public.touch_updated_at();

-- ค่าเริ่มต้นคือข้อความที่อยู่บนหน้าเว็บตอนนี้เป๊ะๆ หน้าตาจึงไม่เปลี่ยนเลย
-- ใส่ครั้งเดียว ถ้ามีแถวอยู่แล้วไม่ทับของเดิม
insert into public.blog_content (id, title, subtitle)
values (
  true,
  'บล็อก',
  'เรื่องที่อยากเล่า งานที่ทำ และอะไรที่เจอระหว่างทาง'
)
on conflict (id) do nothing;

revoke all on public.blog_content from anon, authenticated;
alter table public.blog_content enable row level security;


drop function if exists public.blog_content_get();
create function public.blog_content_get()
returns table (
  title    text,
  subtitle text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.title, b.subtitle
    from public.blog_content b
   where b.id;
$$;

create or replace function public.admin_save_blog_content(
  p_title    text,
  p_subtitle text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
begin
  if not public.current_user_is_admin() then
    raise exception 'แก้หน้า BLOG ได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  -- ดักก่อนถึง check constraint เพื่อให้คนกรอกเห็นข้อความเป็นภาษาคน
  -- ไม่ใช่ชื่อ constraint ที่อ่านไม่รู้เรื่อง
  if v_title = '' then
    raise exception 'หัวข้อใหญ่เว้นว่างไม่ได้' using errcode = '23514';
  end if;

  update public.blog_content
     set title    = v_title,
         subtitle = nullif(btrim(coalesce(p_subtitle, '')), '')
   where id;
end;
$$;


-- ============================================================================
--  2. home_club_summary() ไม่คืนคนนำให้คนนอก
-- ----------------------------------------------------------------------------
--  ของเดิมคืนชื่อ รูป และระยะของคนที่นำอยู่ให้ทุกคนที่เรียก รวมถึงคนที่ยังไม่
--  ล็อกอิน ซึ่งเท่ากับเอาชื่อกับรูปหน้าของสมาชิกไปแปะหน้าแรกให้คนทั้ง
--  อินเทอร์เน็ตดูโดยที่เจ้าตัวไม่ได้ตกลง
--
--  ตัวเลขรวมของกลุ่มไม่ได้ชี้ไปที่ใครเป็นคนๆ จึงยังคืนให้ทุกคนได้เหมือนเดิม
--    คนนอก         จำนวนสมาชิก กับยอดวิ่งรวม (ไม่มีชื่อ ไม่มีรูป ไม่มีระยะรายคน)
--    สมาชิกอนุมัติ  เห็นคนนำเพิ่มขึ้นมา
--
--  บังคับที่ฐานข้อมูล ไม่ใช่แค่ไม่แสดงในหน้าเว็บ เพราะ anon key อยู่ในเบราว์เซอร์
--  และ repo นี้เป็น public ใครก็ยิง rpc ตัวนี้เองได้
--
--  current_profile_status() ถูก grant ไว้ให้แค่ authenticated แต่เรียกจากในนี้ได้
--  เพราะฟังก์ชันนี้เป็น security definer จึงรันด้วยสิทธิ์ของเจ้าของฟังก์ชัน
--  ไม่ใช่สิทธิ์ของคนเรียก · ส่วน anon ได้ status เป็น null เพราะ auth.uid()
--  เป็น null ซึ่งก็ไม่เท่ากับ 'approved' อยู่ดี
--
--  เงื่อนไข is_member อยู่ใน lateral ตัวเดียวกับที่หาคนนำ ไม่ได้อยู่ข้างนอก
--  แถวผลลัพธ์จึงยังออกมาหนึ่งแถวเหมือนเดิม ได้ leader_* เป็น null สามคอลัมน์
--  ไม่ใช่ไม่มีแถวเลย ซึ่งจะทำให้หน้าเว็บคิดว่าเดือนนี้ไม่มีรอบ
-- ============================================================================

create or replace function public.home_club_summary()
returns table (
  round_month       date,
  member_count      int,
  total_km          numeric,
  leader_nickname   text,
  leader_avatar_url text,
  leader_km         numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with picked as (select public.current_month_bkk() as mth),
  viewer as (
    -- coalesce เพราะคนที่ยังไม่ล็อกอินได้ status เป็น null การเทียบจึงได้ null
    -- ไม่ใช่ false ซึ่งใน where ก็ไม่ผ่านอยู่ดี แต่เขียนให้อ่านแล้วไม่ต้องเดา
    select coalesce(public.current_profile_status() = 'approved', false)
             as is_member
  ),
  this_round as (
    select r.id
      from public.rounds r, picked
     where r.month = picked.mth
  ),
  totals as (
    select p.id,
           p.nickname,
           p.avatar_url,
           coalesce(sum(run.distance_km), 0)::numeric(10,2) as km
      from public.profiles p
      left join public.runs run
        on run.profile_id = p.id
       and run.round_id in (select id from this_round)
     where p.status = 'approved'
     group by p.id, p.nickname, p.avatar_url
  )
  select (select picked.mth from picked),
         (select count(*)::int from totals),
         (select coalesce(sum(totals.km), 0)::numeric(10,2) from totals),
         lead.nickname,
         lead.avatar_url,
         lead.km
    from (select 1 as one) anchor
    left join lateral (
      select t.nickname, t.avatar_url, t.km
        from totals t, viewer
       where t.km > 0
         and viewer.is_member
       order by t.km desc, t.nickname
       limit 1
    ) lead on true
   where anchor.one = 1;
$$;


-- ============================================================================
--  3. สิทธิ์
-- ----------------------------------------------------------------------------
--  blog_content_get เปิดให้ anon เพราะหน้า BLOG เป็นหน้าสาธารณะที่คนยังไม่
--  ล็อกอินต้องอ่านได้ ชุดเดียวกับ home_content_get
--
--  home_club_summary ถูก create or replace สิทธิ์เดิมจึงยังอยู่ แต่ประกาศซ้ำ
--  ไว้ให้ชัด เผื่อมีคนอ่านไฟล์นี้อย่างเดียวแล้วสงสัยว่าใครเรียกได้
-- ============================================================================

revoke all on function public.blog_content_get()    from public, anon, authenticated;
grant execute on function public.blog_content_get() to anon, authenticated;

revoke all on function public.home_club_summary()    from public, anon, authenticated;
grant execute on function public.home_club_summary() to anon, authenticated;

revoke all on function public.admin_save_blog_content(text, text)
  from public, anon, authenticated;
grant execute on function public.admin_save_blog_content(text, text)
  to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- หัวข้อหน้า BLOG ตอนนี้
-- select * from public.blog_content_get();

-- ตัวเลขคลับ เรียกใน SQL editor (เป็นเจ้าของฐานข้อมูล ไม่ได้ล็อกอินเป็นสมาชิก)
-- จะได้ leader_* เป็น null เพราะ current_profile_status() หาโปรไฟล์ไม่เจอ
-- ต้องไปทดสอบด้วย anon key กับบัญชีสมาชิกจริงถึงจะเห็นความต่าง
-- select * from public.home_club_summary();
