-- ============================================================================
--  AOOOKULELE & CO. — หน้าแรกที่แก้ได้จากมือถือ
-- ----------------------------------------------------------------------------
--  เดิมข้อความหน้าแรกฝังอยู่ใน src/app/page.tsx จะแก้ทีต้อง deploy ใหม่ทุกครั้ง
--  ย้ายมาอยู่ในตารางแถวเดียวแบบเดียวกับ about_profile
--
--  ค่าเริ่มต้นเป็นข้อความที่อยู่บนหน้าเว็บตอนนี้เป๊ะๆ หน้าตาจึงไม่เปลี่ยนเลย
--  จนกว่าเจ้าของเว็บจะเข้าไปแก้เอง
--
--  สารบัญ
--    1. ตาราง home_content (แถวเดียว)
--    2. ฟังก์ชันอ่านและเขียน
--    3. ตัวเลขสดของคลับสำหรับการ์ดบนหน้าแรก
--    4. แก้ about_running_stats() ไม่ให้โชว์อันดับตอนยังไม่ได้วิ่ง
--    5. สิทธิ์
-- ============================================================================


-- ============================================================================
--  1. home_content
-- ----------------------------------------------------------------------------
--  แยกตารางจาก about_profile เพราะคนละหน้าและคนละเรื่อง ถ้ายัดรวมกัน
--  ชื่อตารางจะโกหกว่าเก็บแค่ข้อมูลแนะนำตัว ซึ่งทำให้คนอ่านโค้ดทีหลังงง
--
--  แถวเดียวตลอดกาล บังคับด้วย primary key ที่เป็น boolean แล้ว check ว่าต้อง
--  เป็น true วิธีเดียวกับ about_profile
-- ============================================================================

create table if not exists public.home_content (
  id         boolean     primary key default true check (id),
  eyebrow    text        check (eyebrow is null or char_length(eyebrow) <= 60),
  title      text        check (title is null or char_length(title) <= 80),
  subtitle   text        check (subtitle is null or char_length(subtitle) <= 300),
  intro      text        check (intro is null or char_length(intro) <= 1000),
  /** บรรทัด "ช่วงนี้ทำอะไรอยู่" ว่างไว้ได้ หน้าเว็บจะซ่อนให้เอง */
  now_line   text        check (now_line is null or char_length(now_line) <= 200),
  club_blurb text        check (club_blurb is null or char_length(club_blurb) <= 200),
  updated_at timestamptz not null default now()
);

comment on table public.home_content is
  'ข้อความบนหน้าแรก มีแถวเดียวเสมอ แก้ได้เฉพาะแอดมิน ทุกคนอ่านได้';

drop trigger if exists home_content_touch_updated_at on public.home_content;
create trigger home_content_touch_updated_at
  before update on public.home_content
  for each row execute function public.touch_updated_at();

-- ค่าเริ่มต้นคือข้อความที่อยู่บนหน้าเว็บตอนนี้ ใส่ครั้งเดียว ถ้ามีแถวแล้วไม่ทับ
insert into public.home_content (id, eyebrow, title, subtitle, intro, club_blurb)
values (
  true,
  'WELCOME ABOARD',
  'AOOOKULELE & CO.',
  E'anything about aoookulele\n— made for fun, forever under construction',
  'ตอนนี้หน้าอื่นยังว่างอยู่ กำลังทยอยเติม ถ้าเป็นทีม Beer Now Run Later กดที่ CLUB ไปดูผลวิ่งเดือนนี้ได้เลย',
  'ตารางแข่งวิ่งประจำเดือนของแก๊ง'
)
on conflict (id) do nothing;

revoke all on public.home_content from anon, authenticated;
alter table public.home_content enable row level security;


-- ============================================================================
--  2. ฟังก์ชันอ่านและเขียน
-- ============================================================================

drop function if exists public.home_content_get();
create function public.home_content_get()
returns table (
  eyebrow    text,
  title      text,
  subtitle   text,
  intro      text,
  now_line   text,
  club_blurb text
)
language sql
stable
security definer
set search_path = ''
as $$
  select h.eyebrow, h.title, h.subtitle, h.intro, h.now_line, h.club_blurb
    from public.home_content h
   where h.id;
$$;

create or replace function public.admin_save_home_content(
  p_eyebrow    text,
  p_title      text,
  p_subtitle   text,
  p_intro      text,
  p_now_line   text,
  p_club_blurb text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'แก้หน้าแรกได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  update public.home_content
     set eyebrow    = nullif(btrim(coalesce(p_eyebrow, '')), ''),
         title      = nullif(btrim(coalesce(p_title, '')), ''),
         subtitle   = nullif(btrim(coalesce(p_subtitle, '')), ''),
         intro      = nullif(btrim(coalesce(p_intro, '')), ''),
         now_line   = nullif(btrim(coalesce(p_now_line, '')), ''),
         club_blurb = nullif(btrim(coalesce(p_club_blurb, '')), '')
   where id;
end;
$$;


-- ============================================================================
--  3. ตัวเลขสดของคลับ
-- ----------------------------------------------------------------------------
--  การ์ดคลับบนหน้าแรกเป็นหน้าสาธารณะ คนที่ยังไม่ล็อกอินก็เห็น จึงต้องมีฟังก์ชัน
--  ของตัวเอง ใช้ month_leaderboard() ไม่ได้เพราะตัวนั้นกันไว้ให้เฉพาะสมาชิก
--
--  สิ่งที่คืนออกไปคือตัวเลขรวมของกลุ่ม กับชื่อและรูปของคนที่นำอยู่คนเดียว
--  ไม่ได้คืนอันดับของคนอื่น ไม่ได้คืนผลวิ่งรายครั้ง และไม่คืนอะไรเลยถ้าเดือนนั้น
--  ยังไม่มีใครกรอกผล
--
--  ชื่อพารามิเตอร์ที่คืนออกไปตั้งใจไม่ใช้คำว่า month เฉยๆ เพราะจะไปชนกับชื่อ
--  คอลัมน์ใน CTE แล้วอ้างกำกวม
-- ============================================================================

drop function if exists public.home_club_summary();
create function public.home_club_summary()
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
        from totals t
       where t.km > 0
       order by t.km desc, t.nickname
       limit 1
    ) lead on true
   where anchor.one = 1;
$$;


-- ============================================================================
--  4. about_running_stats() ไม่โชว์อันดับตอนยังไม่ได้วิ่ง
-- ----------------------------------------------------------------------------
--  เดิมเดือนที่ยังไม่ได้วิ่งเลยขึ้นว่า "อันดับ 1" เพราะทุกคนได้ 0 เท่ากันหมด
--  rank() จึงให้ทุกคนอันดับ 1 ซึ่งอ่านแล้วเข้าใจผิดว่ากำลังนำอยู่
--  ถ้ายังไม่มีระยะในเดือนนั้น ไม่ต้องคืนอันดับเลย
-- ============================================================================

create or replace function public.about_running_stats()
returns table (
  year_km    numeric,
  month_km   numeric,
  month_rank int,
  months     jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select id from public.profiles
     where is_admin and status = 'approved'
     order by created_at
     limit 1
  ),
  this_month as (select public.current_month_bkk() as m),
  year_start as (
    select date_trunc('year', public.today_bkk())::date as d
  ),
  year_total as (
    select coalesce(sum(r.distance_km), 0)::numeric(10,2) as km
      from public.runs r, owner, year_start
     where r.profile_id = owner.id
       and r.ran_on >= year_start.d
  ),
  month_total as (
    select coalesce(sum(r.distance_km), 0)::numeric(10,2) as km
      from public.runs r, owner, this_month
     where r.profile_id = owner.id
       and date_trunc('month', r.ran_on)::date = this_month.m
  ),
  ranked as (
    select p.id,
           rank() over (order by coalesce(sum(r.distance_km), 0) desc) as place
      from public.profiles p
      left join public.runs r
        on r.profile_id = p.id
       and date_trunc('month', r.ran_on)::date
           = (select m from this_month)
     where p.status = 'approved'
     group by p.id
  ),
  bars as (
    select to_char(g.m, 'YYYY-MM') as month,
           coalesce(sum(r.distance_km), 0)::numeric(10,2) as km
      from generate_series(
             (select m from this_month) - interval '7 months',
             (select m from this_month),
             interval '1 month'
           ) as g(m)
      left join public.runs r
        on r.profile_id = (select id from owner)
       and date_trunc('month', r.ran_on) = g.m
     group by g.m
     order by g.m
  )
  select year_total.km,
         month_total.km,
         case
           when month_total.km > 0
             then (select place::int from ranked, owner where ranked.id = owner.id)
         end,
         (select jsonb_agg(jsonb_build_object('month', bars.month, 'km', bars.km))
            from bars)
    from year_total, month_total
   where exists (select 1 from owner);
$$;


-- ============================================================================
--  5. สิทธิ์
-- ----------------------------------------------------------------------------
--  home_content_get และ home_club_summary เปิดให้ anon เพราะหน้าแรกเป็นหน้า
--  สาธารณะที่คนยังไม่ล็อกอินต้องอ่านได้ เป็นข้อยกเว้นชุดเดียวกับระบบโพสต์
--  (ดูเหตุผลเต็มใน 20261001140000_posts.sql ข้อ 8)
--
--  about_running_stats ถูก create or replace ไม่ได้ถูก drop สิทธิ์เดิมจึงยังอยู่
--  แต่ประกาศซ้ำไว้ให้ชัด เผื่อมีคนอ่านไฟล์นี้อย่างเดียวแล้วสงสัย
-- ============================================================================

revoke all on function public.home_content_get()    from public, anon, authenticated;
grant execute on function public.home_content_get() to anon, authenticated;

revoke all on function public.home_club_summary()    from public, anon, authenticated;
grant execute on function public.home_club_summary() to anon, authenticated;

revoke all on function public.about_running_stats()    from public, anon, authenticated;
grant execute on function public.about_running_stats() to anon, authenticated;

revoke all on function public.admin_save_home_content(
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.admin_save_home_content(
  text, text, text, text, text, text
) to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- ข้อความหน้าแรกตอนนี้
-- select * from public.home_content_get();

-- ตัวเลขสดของคลับเดือนนี้
-- select * from public.home_club_summary();

-- สถิติวิ่ง เดือนที่ยังไม่ได้วิ่งต้องได้ month_rank เป็น null
-- select year_km, month_km, month_rank from public.about_running_stats();
