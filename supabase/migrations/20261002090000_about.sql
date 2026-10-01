-- ============================================================================
--  AOOOKULELE & CO. — หน้า ABOUT
-- ----------------------------------------------------------------------------
--  สร้างบนระบบโพสต์ที่ทำไว้แล้ว งานแต่ละชิ้นคือโพสต์หมวด work
--  งานอดิเรกแต่ละอย่างคือ post_sections ที่ kind = 'hobby'
--  ไฟล์นี้เพิ่มแค่สองอย่าง ข้อมูลแนะนำตัว กับธงปักหมุดบนโพสต์
--
--  สารบัญ
--    1. ตาราง about_profile (แถวเดียว)
--    2. posts.pinned
--    3. post_feed() คืนธงปักหมุดด้วย
--    4. post_sections_list() คืนรูปปกสำรองด้วย
--    5. ฟังก์ชันอ่านของหน้า ABOUT
--    6. ฟังก์ชันเขียน (แอดมินเท่านั้น)
--    7. สิทธิ์
-- ============================================================================


-- ============================================================================
--  1. about_profile — ข้อมูลแนะนำตัว
-- ----------------------------------------------------------------------------
--  ตารางแถวเดียว บังคับด้วย primary key ที่เป็น boolean แล้ว check ว่าต้องเป็น
--  true เท่านั้น จึงมีได้แถวเดียวตลอดกาล ไม่ต้องมีโค้ดคอยกันเอง
--
--  chips กับ stats เก็บเป็น jsonb เพราะจำนวนไม่แน่นอนและไม่มีใครต้อง query
--  เข้าไปข้างใน ถ้าแยกเป็นตารางย่อยจะต้องมีฟังก์ชันจัดการลำดับอีกชุด
--  ซึ่งไม่คุ้มกับของที่แก้ปีละครั้ง
--    chips  ["ONE JK · Solar", "ปากเกร็ด นนทบุรี"]
--    stats  [{"value": "12", "label": "โครงการโซลาร์"}]  ไม่เกิน 3 ช่อง
-- ============================================================================

create table if not exists public.about_profile (
  id            boolean     primary key default true check (id),
  display_name  text        check (display_name is null
                                   or char_length(display_name) <= 60),
  tagline       text        check (tagline is null
                                   or char_length(tagline) <= 200),
  story         text        check (story is null or char_length(story) <= 4000),
  /** ที่อยู่ไฟล์ในบัคเก็ต post-media ไม่ใช่ URL เต็ม */
  avatar_url    text,
  chips         jsonb       not null default '[]'::jsonb,
  line_url      text,
  instagram_url text,
  facebook_url  text,
  strava_url    text,
  email         text,
  stats         jsonb       not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

comment on table public.about_profile is
  'ข้อมูลแนะนำตัวของหน้า ABOUT มีแถวเดียวเสมอ แก้ได้เฉพาะแอดมิน ทุกคนอ่านได้';

insert into public.about_profile (id) values (true) on conflict (id) do nothing;

drop trigger if exists about_profile_touch_updated_at on public.about_profile;
create trigger about_profile_touch_updated_at
  before update on public.about_profile
  for each row execute function public.touch_updated_at();

revoke all on public.about_profile from anon, authenticated;
alter table public.about_profile enable row level security;


-- ============================================================================
--  2. posts.pinned — งานที่อยากให้ขึ้นการ์ดใหญ่
-- ============================================================================

alter table public.posts add column if not exists pinned boolean not null default false;

comment on column public.posts.pinned is
  'ปักหมุดให้ขึ้นเป็นการ์ดใหญ่บนหน้า ABOUT ถ้าไม่มีใบไหนปักไว้ จะใช้ใบล่าสุดแทน';


-- ============================================================================
--  3. post_feed() คืนธงปักหมุดด้วย
-- ----------------------------------------------------------------------------
--  เพิ่มคอลัมน์ที่คืน แปลว่า return type เปลี่ยน ต้อง drop ก่อน create
--  การเรียงยังเหมือนเดิมคือใหม่สุดก่อน เพราะหน้า /blog ไม่ควรเอาของที่ปักหมุด
--  ขึ้นก่อน ฝั่ง ABOUT เป็นคนจัดลำดับเองว่าจะเอาใบไหนขึ้นการ์ดใหญ่
-- ============================================================================

drop function if exists public.post_feed(text, int, int);
create function public.post_feed(
  p_section_slug text default null,
  p_limit        int  default 40,
  p_offset       int  default 0
)
returns table (
  id            uuid,
  title         text,
  body          text,
  section_slug  text,
  section_title text,
  section_kind  text,
  visibility    text,
  status        text,
  pinned        boolean,
  published_at  timestamptz,
  created_at    timestamptz,
  media_count   bigint,
  cover_kind    text,
  cover_url     text,
  cover_youtube text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         p.title,
         p.body,
         s.slug,
         s.title,
         s.kind,
         p.visibility,
         p.status,
         p.pinned,
         p.published_at,
         p.created_at,
         coalesce(agg.n, 0),
         cover.kind,
         cover.url,
         cover.youtube_id
    from public.posts p
    join public.post_sections s on s.id = p.section_id
    left join lateral (
      select count(*) as n from public.post_media m where m.post_id = p.id
    ) agg on true
    left join lateral (
      select m.kind, m.url, m.youtube_id
        from public.post_media m
       where m.post_id = p.id
       order by m.position, m.created_at
       limit 1
    ) cover on true
   where p.visibility <> 'unlisted'
     and public.can_see_post(p.visibility, p.status)
     and (p_section_slug is null or s.slug = p_section_slug)
   order by coalesce(p.published_at, p.created_at) desc
   limit greatest(1, least(coalesce(p_limit, 40), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;


-- ============================================================================
--  4. post_sections_list() คืนรูปปกสำรองด้วย
-- ----------------------------------------------------------------------------
--  ช่องงานอดิเรกต้องมีรูปปก ลำดับที่ใช้คือ
--    1. รูปที่แอดมินตั้งไว้เอง (cover_url)
--    2. รูปแรกของโพสต์ล่าสุดในหมวดที่คนดูเห็นได้ (fallback_cover)
--    3. ไม่มีทั้งคู่ ฝั่งเว็บใช้พื้นสีเรียบ
--  คิดข้อ 2 ที่นี่ เพราะต้องกรองตามสิทธิ์ของคนดู ซึ่งทำได้แต่ในฐานข้อมูล
-- ============================================================================

drop function if exists public.post_sections_list();
create function public.post_sections_list()
returns table (
  slug           text,
  title          text,
  kind           text,
  intro          text,
  cover_url      text,
  fallback_cover text,
  sort_order     int,
  hidden         boolean,
  post_count     bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slug,
         s.title,
         s.kind,
         s.intro,
         s.cover_url,
         fallback.url,
         s.position,
         s.hidden,
         coalesce(visible.n, 0)
    from public.post_sections s
    left join lateral (
      select count(*) as n
        from public.posts p
       where p.section_id = s.id
         and p.visibility <> 'unlisted'
         and public.can_see_post(p.visibility, p.status)
    ) visible on true
    left join lateral (
      select m.url
        from public.posts p
        join public.post_media m on m.post_id = p.id
       where p.section_id = s.id
         and p.visibility <> 'unlisted'
         and public.can_see_post(p.visibility, p.status)
         and m.kind = 'image'
       order by coalesce(p.published_at, p.created_at) desc,
                m.position, m.created_at
       limit 1
    ) fallback on true
   where not s.hidden or public.current_user_is_admin()
   order by s.position, s.title;
$$;


-- ============================================================================
--  5. ฟังก์ชันอ่านของหน้า ABOUT
-- ============================================================================

/** ข้อมูลแนะนำตัว ทุกคนอ่านได้ นี่คือหน้าแนะนำตัวสาธารณะ */
drop function if exists public.about_profile_get();
create function public.about_profile_get()
returns table (
  display_name  text,
  tagline       text,
  story         text,
  avatar_url    text,
  chips         jsonb,
  line_url      text,
  instagram_url text,
  facebook_url  text,
  strava_url    text,
  email         text,
  stats         jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.display_name, a.tagline, a.story, a.avatar_url, a.chips,
         a.line_url, a.instagram_url, a.facebook_url, a.strava_url, a.email,
         a.stats
    from public.about_profile a
   where a.id;
$$;

/**
 * รูปทั้งหมดในหมวดหนึ่ง ไว้ทำแกลเลอรี
 *
 * กรองตามสิทธิ์ของคนดูเหมือนทุกที่ รูปจากโพสต์ที่เป็นลิงก์ลับ เฉพาะคลับ
 * แค่ฉัน หรือยังเป็นร่าง จึงไม่มีทางโผล่ในแกลเลอรีของคนนอก
 */
drop function if exists public.section_gallery(text, int);
create function public.section_gallery(p_slug text, p_limit int default 60)
returns table (
  post_id    uuid,
  post_title text,
  url        text,
  caption    text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, m.url, m.caption
    from public.posts p
    join public.post_sections s on s.id = p.section_id
    join public.post_media m on m.post_id = p.id
   where s.slug = p_slug
     and m.kind = 'image'
     and p.visibility <> 'unlisted'
     and public.can_see_post(p.visibility, p.status)
   order by coalesce(p.published_at, p.created_at) desc,
            m.position, m.created_at
   limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;

/**
 * สถิติวิ่งของเจ้าของเว็บ ดึงจากข้อมูลคลับมาเอง
 *
 * "เจ้าของเว็บ" คือแอดมินคนแรกที่สมัคร ไม่ได้ตั้งค่าแยกไว้ เพราะคลับนี้มี
 * เจ้าของคนเดียว ถ้าวันหลังตั้งแอดมินเพิ่ม คนที่สมัครก่อนยังเป็นคนเดิมอยู่ดี
 *
 * เปิดให้ anon อ่านได้ เพราะนี่คือหน้าแนะนำตัวสาธารณะของเจ้าของเอง และคืนแค่
 * ตัวเลขรวมของคนคนเดียว ไม่ได้คืนผลวิ่งรายครั้ง ไม่ได้คืนข้อมูลของสมาชิกคนอื่น
 * ส่วนอันดับคืนแค่เลขอันดับ ไม่ได้บอกว่าใครอยู่อันดับไหน
 */
drop function if exists public.about_running_stats();
create function public.about_running_stats()
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
    -- แปดเดือนล่าสุดรวมเดือนนี้ เดือนไหนไม่ได้วิ่งก็ต้องมีแท่งสูงศูนย์
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
         (select place::int from ranked, owner where ranked.id = owner.id),
         (select jsonb_agg(jsonb_build_object('month', bars.month, 'km', bars.km))
            from bars)
    from year_total, month_total
   where exists (select 1 from owner);
$$;


-- ============================================================================
--  6. ฟังก์ชันเขียน (แอดมินเท่านั้น)
-- ============================================================================

create or replace function public.admin_save_about_profile(
  p_display_name  text,
  p_tagline       text,
  p_story         text,
  p_avatar_url    text,
  p_chips         jsonb,
  p_line_url      text,
  p_instagram_url text,
  p_facebook_url  text,
  p_strava_url    text,
  p_email         text,
  p_stats         jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'แก้หน้าแนะนำตัวได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  if jsonb_array_length(coalesce(p_stats, '[]'::jsonb)) > 3 then
    raise exception 'ตัวเลขเด่นใส่ได้ไม่เกิน 3 ช่อง' using errcode = '42501';
  end if;

  update public.about_profile
     set display_name  = nullif(btrim(coalesce(p_display_name, '')), ''),
         tagline       = nullif(btrim(coalesce(p_tagline, '')), ''),
         story         = nullif(btrim(coalesce(p_story, '')), ''),
         -- ส่ง null มาแปลว่าไม่ได้เปลี่ยนรูป ใช้ของเดิมต่อ
         avatar_url    = coalesce(p_avatar_url, avatar_url),
         chips         = coalesce(p_chips, '[]'::jsonb),
         line_url      = nullif(btrim(coalesce(p_line_url, '')), ''),
         instagram_url = nullif(btrim(coalesce(p_instagram_url, '')), ''),
         facebook_url  = nullif(btrim(coalesce(p_facebook_url, '')), ''),
         strava_url    = nullif(btrim(coalesce(p_strava_url, '')), ''),
         email         = nullif(btrim(coalesce(p_email, '')), ''),
         stats         = coalesce(p_stats, '[]'::jsonb)
   where id;
end;
$$;

/**
 * บันทึกหมวดทั้งชุดในคำสั่งเดียว
 *
 * เพิ่มใหม่ เปลี่ยนชื่อ เขียนแนะนำ เลือกรูปปก เลื่อนลำดับ และซ่อน
 * ทำในคำสั่งเดียวเพราะหน้าแก้ส่งทั้งรายการมาอยู่แล้ว และลำดับต้องเรียงใหม่
 * ทั้งชุดเสมอ ถ้าแยกเป็นหลายคำสั่งแล้วพลาดกลางทาง ลำดับจะเพี้ยน
 *
 * ไม่มีการลบหมวด มีแต่ซ่อน เพราะโพสต์ที่อยู่ในหมวดนั้นจะกำพร้า
 */
create or replace function public.admin_save_sections(p_sections jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_pos  int := 0;
  v_slug text;
begin
  if not public.current_user_is_admin() then
    raise exception 'จัดการหมวดได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  for v_item in
    select * from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb))
  loop
    v_slug := btrim(coalesce(v_item->>'slug', ''));

    if v_slug !~ '^[a-z0-9-]{2,40}$' then
      raise exception 'ชื่อย่อ % ใช้ไม่ได้ ใช้ได้แค่ a-z 0-9 และขีดกลาง 2 ถึง 40 ตัว',
        v_slug using errcode = '42501';
    end if;
    if btrim(coalesce(v_item->>'title', '')) = '' then
      raise exception 'หมวด % ยังไม่มีชื่อ', v_slug using errcode = '42501';
    end if;

    insert into public.post_sections (slug, title, kind, intro, cover_url,
                                      position, hidden)
    values (
      v_slug,
      btrim(v_item->>'title'),
      coalesce(nullif(v_item->>'kind', ''), 'hobby'),
      nullif(btrim(coalesce(v_item->>'intro', '')), ''),
      nullif(v_item->>'cover_url', ''),
      v_pos,
      coalesce((v_item->>'hidden')::boolean, false)
    )
    on conflict (slug) do update
       set title     = excluded.title,
           intro     = excluded.intro,
           -- ส่ง null มาแปลว่าไม่ได้เปลี่ยนรูปปก ใช้ของเดิมต่อ
           cover_url = coalesce(excluded.cover_url, post_sections.cover_url),
           position  = excluded.position,
           hidden    = excluded.hidden;

    v_pos := v_pos + 10;
  end loop;
end;
$$;

/** ปักหมุดหรือถอนหมุดโพสต์ */
create or replace function public.admin_set_post_pinned(
  p_id     uuid,
  p_pinned boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'ปักหมุดได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  update public.posts set pinned = coalesce(p_pinned, false) where id = p_id;
end;
$$;


-- ============================================================================
--  7. สิทธิ์
-- ----------------------------------------------------------------------------
--  สองตัวที่สร้างใหม่แล้วเปิดให้ anon เป็นข้อยกเว้นชุดเดียวกับระบบโพสต์
--  (ดูเหตุผลใน 20261001140000_posts.sql ข้อ 8) เพราะหน้า ABOUT ต้องให้
--  คนที่ยังไม่ล็อกอินอ่านได้ และทั้งสองตัวกรองสิทธิ์ไว้ข้างในแล้ว
--
--  ส่วน post_feed กับ post_sections_list ถูก drop ไปตอนเปลี่ยน return type
--  ต้อง grant ใหม่ ไม่งั้นทั้งหน้า BLOG กับ ABOUT จะพังพร้อมกัน
-- ============================================================================

revoke all on function public.post_feed(text, int, int)    from public, anon;
grant execute on function public.post_feed(text, int, int) to anon, authenticated;

revoke all on function public.post_sections_list()         from public, anon;
grant execute on function public.post_sections_list()      to anon, authenticated;

revoke all on function public.about_profile_get()          from public, anon, authenticated;
grant execute on function public.about_profile_get()       to anon, authenticated;

revoke all on function public.section_gallery(text, int)   from public, anon, authenticated;
grant execute on function public.section_gallery(text, int) to anon, authenticated;

revoke all on function public.about_running_stats()        from public, anon, authenticated;
grant execute on function public.about_running_stats()     to anon, authenticated;

revoke all on function public.admin_save_about_profile(
  text, text, text, text, jsonb, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.admin_save_about_profile(
  text, text, text, text, jsonb, text, text, text, text, text, jsonb
) to authenticated;

revoke all on function public.admin_save_sections(jsonb)      from public, anon, authenticated;
grant execute on function public.admin_save_sections(jsonb)   to authenticated;

revoke all on function public.admin_set_post_pinned(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_set_post_pinned(uuid, boolean)
  to authenticated;


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- แถวแนะนำตัวมีแถวเดียวจริงไหม ควรได้ 1
-- select count(*) from public.about_profile;

-- สถิติวิ่งของเจ้าของเว็บออกมาหน้าตาแบบไหน
-- select * from public.about_running_stats();

-- anon เรียกฟังก์ชันของหน้า ABOUT ได้ตัวไหนบ้าง ควรได้สามตัว
-- select p.proname
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('about_profile_get', 'section_gallery',
--                      'about_running_stats', 'admin_save_about_profile',
--                      'admin_save_sections', 'admin_set_post_pinned')
--    and has_function_privilege('anon', p.oid, 'execute')
--  order by 1;
