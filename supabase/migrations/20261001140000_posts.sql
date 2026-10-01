-- ============================================================================
--  AOOOKULELE & CO. — ระบบโพสต์ (ใช้ทั้ง BLOG และ ABOUT)
-- ----------------------------------------------------------------------------
--  ทั้งเว็บมีโพสต์แบบเดียว อารมณ์โพสต์ Facebook
--  หัวเรื่อง + ข้อความสั้นๆ + รูป/วิดีโอหลายอัน แต่ละอันมีคำอธิบายของตัวเอง
--  เขียนได้เฉพาะแอดมิน
--
--  สารบัญ
--    1. ตาราง post_sections และข้อมูลเริ่มต้น
--    2. ตาราง posts
--    3. ตาราง post_media
--    4. ปิดประตูตารางทั้งสาม
--    5. ตัวช่วยเรื่องสิทธิ์
--    6. ฟังก์ชันอ่าน
--    7. ฟังก์ชันเขียน (แอดมินเท่านั้น)
--    8. สิทธิ์
--    9. Storage: บัคเก็ต post-media
--
--  เรื่องที่ต้องระวังที่สุดในไฟล์นี้
--  repo นี้เป็น public และ anon key อยู่ในเบราว์เซอร์ของทุกคน ใครก็ยิง
--  PostgREST เองได้ ดังนั้นโพสต์ที่ไม่ควรเห็นต้อง "ดึงไม่ได้" จริงๆ
--  ไม่ใช่แค่ไม่โผล่ในหน้าเว็บ
--
--  วิธีที่ใช้คือปิดสิทธิ์ตารางทั้งหมด แล้วให้อ่านผ่าน security definer function
--  ที่คัดแล้วว่าคืนอะไรได้บ้าง เหมือนที่ทำกับ targets prizes challenges
--  โพสต์แบบ unlisted จึงไม่มีทางหลุดมากับหน้ารวม เพราะฟังก์ชันหน้ารวมไม่คืนมันเลย
-- ============================================================================


-- ============================================================================
--  1. post_sections — หมวดที่โพสต์ไปอยู่
-- ----------------------------------------------------------------------------
--  kind บอกว่าหมวดนี้ไปโผล่ที่ไหน
--    blog   ช่องทางหลักของหน้า BLOG
--    work   งานที่ภูมิใจ (หน้า ABOUT ทำใน prompt ถัดไป)
--    hobby  งานอดิเรก
-- ============================================================================

create table if not exists public.post_sections (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        not null unique
                         check (slug ~ '^[a-z0-9-]{2,40}$'),
  title      text        not null check (char_length(title) between 1 and 60),
  kind       text        not null check (kind in ('blog', 'work', 'hobby')),
  intro      text        check (intro is null or char_length(intro) <= 300),
  cover_url  text,
  position   int         not null default 0,
  hidden     boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.post_sections is
  'หมวดที่โพสต์ไปอยู่ แอดมินเพิ่มหรือซ่อนได้ ไม่ได้ฝังไว้ในโค้ด';

drop trigger if exists post_sections_touch_updated_at on public.post_sections;
create trigger post_sections_touch_updated_at
  before update on public.post_sections
  for each row execute function public.touch_updated_at();

-- ข้อมูลเริ่มต้น ใส่ครั้งเดียว ถ้ามีอยู่แล้วไม่แตะ จะได้ไม่ทับที่แอดมินแก้ไว้
insert into public.post_sections (slug, title, kind, position)
values
  ('blog',        'บล็อก',      'blog',  0),
  ('work',        'งาน',        'work',  10),
  ('running',     'วิ่ง',        'hobby', 20),
  ('photography', 'ถ่ายภาพ',    'hobby', 30),
  ('wakeboard',   'เวคบอร์ด',    'hobby', 40),
  ('snowboard',   'สโนว์บอร์ด',  'hobby', 50),
  ('golf',        'กอล์ฟ',       'hobby', 60),
  ('tennis',      'เทนนิส',      'hobby', 70)
on conflict (slug) do nothing;


-- ============================================================================
--  2. posts
-- ----------------------------------------------------------------------------
--  body เป็นข้อความธรรมดา ขึ้นบรรทัดใหม่ได้ ลิงก์กดได้ ไม่มี markdown
--  ฝั่งเว็บเป็นคนแปลงบรรทัดกับลิงก์ตอนแสดงผล ไม่ได้เก็บ HTML ไว้ในฐานข้อมูล
--  จะได้ไม่มีทางฝัง script ลงมาได้
--
--  share_token ใช้ uuid สองท่อนต่อกันแบบตัดขีดออก ได้ 32 ตัวอักษร 122 บิต
--  เดาไม่ได้ และไม่ต้องพึ่ง pgcrypto ซึ่งอยู่คนละ schema กับที่ search_path
--  ของฟังก์ชันเรามองเห็น
-- ============================================================================

create table if not exists public.posts (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null
                           check (char_length(btrim(title)) between 1 and 160),
  body         text        not null default ''
                           check (char_length(body) <= 20000),
  section_id   uuid        not null references public.post_sections (id)
                           on delete restrict,

  visibility   text        not null default 'public'
                           check (visibility in ('public', 'club', 'unlisted', 'private')),
  status       text        not null default 'draft'
                           check (status in ('draft', 'published')),
  published_at timestamptz,

  share_token  text        not null unique
                           default replace(gen_random_uuid()::text, '-', ''),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.posts.visibility is
  'public ทุกคน · club สมาชิกที่อนุมัติแล้ว · unlisted เฉพาะคนที่มีลิงก์ '
  '/p/<share_token> และห้ามโผล่ในหน้ารวม · private แอดมินเท่านั้น';

create index if not exists posts_section_idx on public.posts (section_id);
create index if not exists posts_feed_idx
  on public.posts (status, visibility, published_at desc);

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();


-- ============================================================================
--  3. post_media
-- ----------------------------------------------------------------------------
--  url ของรูปเก็บเป็น "ที่อยู่ไฟล์ในบัคเก็ต" เช่น <post id>/<uuid>.jpg
--  ไม่ใช่ URL เต็ม เพราะโดเมนของ Supabase มาจาก env และอาจเปลี่ยนได้
--  ฝั่งเว็บประกอบ URL สาธารณะเอง และตอนลบก็ใช้ค่านี้ไปลบไฟล์ได้ตรงๆ
-- ============================================================================

create table if not exists public.post_media (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts (id) on delete cascade,
  position   int         not null default 0,
  kind       text        not null check (kind in ('image', 'youtube')),
  url        text,
  youtube_id text        check (youtube_id is null
                                or youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  caption    text        check (caption is null or char_length(caption) <= 300),
  width      int,
  height     int,
  bytes      int         check (bytes is null or bytes >= 0),
  created_at timestamptz not null default now(),

  constraint post_media_shape check (
    (kind = 'image'   and url is not null and youtube_id is null)
    or
    (kind = 'youtube' and youtube_id is not null and url is null)
  )
);

create index if not exists post_media_post_idx
  on public.post_media (post_id, position);


-- ============================================================================
--  4. ปิดประตูตารางทั้งสาม
-- ----------------------------------------------------------------------------
--  ไม่เปิดให้ query ตรงเลยแม้แต่โพสต์สาธารณะ เพราะถ้าเปิด select ได้
--  การกรอง unlisted ออกจะกลายเป็นเรื่องของ policy ที่เขียนผิดได้ง่าย
--  ทางเข้าออกมีทางเดียวคือฟังก์ชันในข้อ 6 และ 7
-- ============================================================================

revoke all on public.post_sections from anon, authenticated;
revoke all on public.posts         from anon, authenticated;
revoke all on public.post_media    from anon, authenticated;

alter table public.post_sections enable row level security;
alter table public.posts         enable row level security;
alter table public.post_media    enable row level security;


-- ============================================================================
--  5. ตัวช่วยเรื่องสิทธิ์
-- ============================================================================

/**
 * คนที่กำลังเรียกอยู่ เห็นโพสต์ที่มีสถานะแบบนี้ได้ไหม
 *
 * ไม่รวมกรณีลิงก์ลับ เพราะนั่นไม่ได้ขึ้นกับว่าเป็นใคร แต่ขึ้นกับว่ามี token ไหม
 * จึงแยกไปอยู่ใน post_by_token() ต่างหาก
 */
create or replace function public.can_see_post(p_visibility text, p_status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- แอดมินเห็นทุกอย่างรวมร่าง เพราะต้องกลับมาแก้ของตัวเอง
    when public.current_user_is_admin() then true
    when p_status <> 'published' then false
    when p_visibility = 'public' then true
    when p_visibility = 'club'
      then public.current_profile_status() = 'approved'
    else false
  end;
$$;

/** รูปหรือวิดีโอของโพสต์หนึ่ง เรียงตามลำดับที่แอดมินจัดไว้ */
create or replace function public.post_media_json(p_post_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'position', m.position,
        'kind', m.kind,
        'url', m.url,
        'youtube_id', m.youtube_id,
        'caption', m.caption,
        'width', m.width,
        'height', m.height,
        'bytes', m.bytes
      )
      order by m.position, m.created_at
    ),
    '[]'::jsonb
  )
  from public.post_media m
 where m.post_id = p_post_id;
$$;


-- ============================================================================
--  6. ฟังก์ชันอ่าน
-- ============================================================================

/** หมวดทั้งหมด หมวดที่ซ่อนไว้เห็นได้เฉพาะแอดมิน */
drop function if exists public.post_sections_list();
create function public.post_sections_list()
returns table (
  slug        text,
  title       text,
  kind        text,
  intro       text,
  cover_url   text,
  -- ชื่อ sort_order ไม่ใช่ position เพราะ Postgres ใช้ position เป็นชื่อ
  -- พารามิเตอร์ของฟังก์ชันไม่ได้ (มันเป็น col_name_keyword ของ POSITION(x IN y))
  -- เป็นชื่อคอลัมน์ในตารางได้ แต่เป็นชื่อพารามิเตอร์ไม่ได้
  sort_order  int,
  hidden      boolean,
  post_count  bigint
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
         s.position,
         s.hidden,
         count(p.id)
    from public.post_sections s
    left join public.posts p
      on p.section_id = s.id
     and public.can_see_post(p.visibility, p.status)
     and p.visibility <> 'unlisted'
   where not s.hidden or public.current_user_is_admin()
   group by s.id, s.slug, s.title, s.kind, s.intro, s.cover_url,
            s.position, s.hidden
   order by s.position, s.title;
$$;

/**
 * ฟีดโพสต์
 *
 * ไม่คืนโพสต์ unlisted เด็ดขาด ไม่ว่าคนเรียกจะเป็นใคร แม้แต่แอดมิน
 * เพราะหน้ารวมไม่ควรเป็นที่ที่ลิงก์ลับหลุด ถ้าแอดมินอยากหาของตัวเอง
 * ให้ไปดูในหน้าจัดการ ซึ่งใช้ admin_post_list() แยกต่างหาก
 */
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

/** โพสต์เดียว ตามสิทธิ์ปกติ โพสต์ลิงก์ลับไม่ออกทางนี้ */
drop function if exists public.post_by_id(uuid);
create function public.post_by_id(p_id uuid)
returns table (
  id            uuid,
  title         text,
  body          text,
  section_slug  text,
  section_title text,
  section_kind  text,
  visibility    text,
  status        text,
  published_at  timestamptz,
  created_at    timestamptz,
  share_token   text,
  media         jsonb
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
         p.published_at,
         p.created_at,
         -- token ให้เฉพาะแอดมิน คนอ่านทั่วไปไม่ต้องรู้
         case when public.current_user_is_admin() then p.share_token end,
         public.post_media_json(p.id)
    from public.posts p
    join public.post_sections s on s.id = p.section_id
   where p.id = p_id
     and p.visibility <> 'unlisted'
     and public.can_see_post(p.visibility, p.status);
$$;

/**
 * โพสต์จากลิงก์ลับ
 *
 * นี่คือทางเดียวที่โพสต์ unlisted ออกจากฐานข้อมูลได้ และต้องรู้ token 32 ตัว
 * ซึ่งเดาไม่ได้ ไม่มีที่ไหนคืน token ออกไปนอกจากให้แอดมินเอง
 *
 * ยอมให้ public ออกทางนี้ด้วย เผื่อแอดมินเปลี่ยนโพสต์จากลิงก์ลับเป็นสาธารณะ
 * ทีหลัง ลิงก์ที่ส่งให้เพื่อนไปแล้วจะได้ไม่พัง
 * ส่วน club / private / ร่าง ยังต้องมีสิทธิ์ตามปกติ ลิงก์อย่างเดียวไม่พอ
 */
drop function if exists public.post_by_token(text);
create function public.post_by_token(p_token text)
returns table (
  id            uuid,
  title         text,
  body          text,
  section_slug  text,
  section_title text,
  section_kind  text,
  visibility    text,
  status        text,
  published_at  timestamptz,
  created_at    timestamptz,
  share_token   text,
  media         jsonb
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
         p.published_at,
         p.created_at,
         p.share_token,
         public.post_media_json(p.id)
    from public.posts p
    join public.post_sections s on s.id = p.section_id
   where p.share_token = p_token
     and char_length(coalesce(p_token, '')) >= 16
     and (
       (p.status = 'published' and p.visibility in ('unlisted', 'public'))
       or public.can_see_post(p.visibility, p.status)
     );
$$;

/** รายการสำหรับหน้าจัดการของแอดมิน รวมร่างและลิงก์ลับ */
drop function if exists public.admin_post_list();
create function public.admin_post_list()
returns table (
  id            uuid,
  title         text,
  section_slug  text,
  visibility    text,
  status        text,
  share_token   text,
  published_at  timestamptz,
  created_at    timestamptz,
  media_count   bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, s.slug, p.visibility, p.status, p.share_token,
         p.published_at, p.created_at,
         (select count(*) from public.post_media m where m.post_id = p.id)
    from public.posts p
    join public.post_sections s on s.id = p.section_id
   where public.current_user_is_admin()
   order by coalesce(p.published_at, p.created_at) desc;
$$;

/** ใช้ที่เก็บไปแล้วกี่ไบต์ รวมจาก post_media แอดมินเท่านั้น */
drop function if exists public.post_storage_used();
create function public.post_storage_used()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.current_user_is_admin()
      then coalesce((select sum(m.bytes) from public.post_media m), 0)
    else 0
  end;
$$;


-- ============================================================================
--  7. ฟังก์ชันเขียน (แอดมินเท่านั้น)
-- ============================================================================

/**
 * สร้างหรือแก้โพสต์ พร้อมแทนรายการรูป/วิดีโอทั้งชุด
 *
 * ทำในคำสั่งเดียวเพราะรูปกับโพสต์ต้องตรงกันเสมอ ถ้าแยกเป็นหลายคำสั่งแล้ว
 * คำสั่งกลางทางพลาด จะเหลือโพสต์ที่มีรูปไม่ครบหรือมีรูปค้าง
 *
 * คืนที่อยู่ไฟล์ที่หลุดออกจากโพสต์ไปด้วย ฝั่งเว็บจะได้เอาไปลบใน storage ต่อ
 * ฐานข้อมูลลบไฟล์ใน storage เองไม่ได้
 */
create or replace function public.admin_save_post(
  p_id          uuid,
  p_title       text,
  p_body        text,
  p_section     text,
  p_visibility  text,
  p_status      text,
  p_media       jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_section uuid;
  v_id      uuid;
  v_removed text[];
  v_item    jsonb;
  v_pos     int := 0;
begin
  if not public.current_user_is_admin() then
    raise exception 'เขียนโพสต์ได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  select id into v_section from public.post_sections where slug = p_section;
  if v_section is null then
    raise exception 'ไม่เจอหมวด %', p_section using errcode = '42501';
  end if;

  if p_visibility not in ('public', 'club', 'unlisted', 'private') then
    raise exception 'ตัวเลือกใครเห็นได้ไม่ถูกต้อง' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'published') then
    raise exception 'สถานะไม่ถูกต้อง' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) = 0 then
    raise exception 'ใส่หัวเรื่องด้วย' using errcode = '42501';
  end if;

  -- ฝั่งเว็บเป็นคนตั้ง id มาเอง เพื่อให้โฟลเดอร์รูปใน storage ชื่อเดียวกับโพสต์
  -- ตั้งแต่รูปแรกที่อัป ทั้งที่ตอนนั้นยังไม่ได้กดบันทึกเลยสักครั้ง
  -- ถ้าปล่อยให้ฐานข้อมูลสุ่ม id เอง รูปจะไปอยู่โฟลเดอร์ที่ไม่ตรงกับโพสต์
  v_id := coalesce(p_id, gen_random_uuid());

  insert into public.posts (id, title, body, section_id, visibility, status,
                            published_at)
  values (v_id, btrim(p_title), coalesce(p_body, ''), v_section, p_visibility,
          p_status,
          case when p_status = 'published' then now() end)
  on conflict (id) do update
     set title        = excluded.title,
         body         = excluded.body,
         section_id   = excluded.section_id,
         visibility   = excluded.visibility,
         status       = excluded.status,
         -- ตั้งเวลาเผยแพร่ครั้งแรกที่กดโพสต์ แก้ทีหลังไม่ขยับวันที่
         published_at = case
           when excluded.status = 'published'
             then coalesce(posts.published_at, now())
           else posts.published_at
         end;

  -- ไฟล์ที่เคยอยู่ในโพสต์นี้ แต่ไม่ได้อยู่ในชุดใหม่ ต้องเอาไปลบใน storage
  select coalesce(array_agg(m.url), '{}')
    into v_removed
    from public.post_media m
   where m.post_id = v_id
     and m.kind = 'image'
     and m.url is not null
     and not exists (
       select 1
         from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) item
        where item->>'kind' = 'image'
          and item->>'url' = m.url
     );

  delete from public.post_media where post_id = v_id;

  for v_item in
    select * from jsonb_array_elements(coalesce(p_media, '[]'::jsonb))
  loop
    insert into public.post_media (
      post_id, position, kind, url, youtube_id, caption, width, height, bytes
    )
    values (
      v_id,
      v_pos,
      v_item->>'kind',
      nullif(v_item->>'url', ''),
      nullif(v_item->>'youtube_id', ''),
      nullif(btrim(coalesce(v_item->>'caption', '')), ''),
      nullif(v_item->>'width', '')::int,
      nullif(v_item->>'height', '')::int,
      nullif(v_item->>'bytes', '')::int
    );
    v_pos := v_pos + 1;
  end loop;

  return jsonb_build_object('id', v_id, 'removed', to_jsonb(v_removed));
end;
$$;

/** ลบโพสต์ คืนที่อยู่ไฟล์ทั้งหมดให้ฝั่งเว็บไปลบใน storage ต่อ */
create or replace function public.admin_delete_post(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_removed text[];
begin
  if not public.current_user_is_admin() then
    raise exception 'ลบโพสต์ได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  select coalesce(array_agg(m.url), '{}')
    into v_removed
    from public.post_media m
   where m.post_id = p_id and m.kind = 'image' and m.url is not null;

  delete from public.posts where id = p_id;

  return jsonb_build_object('removed', to_jsonb(v_removed));
end;
$$;


-- ============================================================================
--  8. สิทธิ์
-- ----------------------------------------------------------------------------
--  ข้อยกเว้นจากกฎใน 20261001100000_function_grants.sql
--  ปกติทั้งโปรเจกต์ให้ anon เรียกได้ตัวเดียวคือ nickname_available()
--  แต่หน้า BLOG ต้องเปิดให้คนที่ยังไม่ล็อกอินอ่านโพสต์สาธารณะได้
--  จึงต้องเปิดให้ anon อีกสี่ตัว
--
--    post_sections_list()  ชื่อหมวดกับจำนวนโพสต์ที่คนนั้นเห็นได้
--    post_feed(...)        ฟีด ไม่คืน unlisted ไม่ว่าใครเรียก
--    post_by_id(uuid)      โพสต์เดียว ไม่คืน unlisted
--    post_by_token(text)   โพสต์จากลิงก์ลับ ต้องรู้ token 32 ตัวที่เดาไม่ได้
--
--  ทั้งสี่ตัวเป็น security definer ที่กรองสิทธิ์ไว้ข้างในแล้ว จึงคืนเฉพาะสิ่งที่
--  คนเรียกมีสิทธิ์เห็นจริง ไม่ได้เปิดตารางให้ query ตรง
--
--  ฟังก์ชันของแอดมินไม่ให้ anon เพราะไม่มีเหตุผลให้เรียกได้เลย
--  (ตัวมันเองก็เช็ก current_user_is_admin() อยู่แล้วอีกชั้น)
-- ============================================================================

revoke all on function public.can_see_post(text, text)     from public, anon, authenticated;
revoke all on function public.post_media_json(uuid)        from public, anon, authenticated;

revoke all on function public.post_sections_list()         from public, anon, authenticated;
grant execute on function public.post_sections_list()      to anon, authenticated;

revoke all on function public.post_feed(text, int, int)    from public, anon, authenticated;
grant execute on function public.post_feed(text, int, int) to anon, authenticated;

revoke all on function public.post_by_id(uuid)             from public, anon, authenticated;
grant execute on function public.post_by_id(uuid)          to anon, authenticated;

revoke all on function public.post_by_token(text)          from public, anon, authenticated;
grant execute on function public.post_by_token(text)       to anon, authenticated;

revoke all on function public.admin_post_list()            from public, anon, authenticated;
grant execute on function public.admin_post_list()         to authenticated;

revoke all on function public.post_storage_used()          from public, anon, authenticated;
grant execute on function public.post_storage_used()       to authenticated;

revoke all on function public.admin_save_post(
  uuid, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.admin_save_post(
  uuid, text, text, text, text, text, jsonb
) to authenticated;

revoke all on function public.admin_delete_post(uuid)      from public, anon, authenticated;
grant execute on function public.admin_delete_post(uuid)   to authenticated;


-- ============================================================================
--  9. Storage: บัคเก็ต post-media
-- ----------------------------------------------------------------------------
--  public = true แปลว่าใครรู้ URL ก็เปิดรูปได้ ซึ่งจำเป็น เพราะโพสต์สาธารณะ
--  ต้องให้คนที่ยังไม่ล็อกอินเห็นรูป และ LINE/Facebook ต้องดึงรูปปกไปทำ preview
--
--  แต่ "เปิดรูปได้ถ้ารู้ URL" กับ "ไล่ดูว่ามีรูปอะไรบ้าง" เป็นคนละเรื่อง
--  ตั้งใจไม่ทำ policy select บน storage.objects ให้บัคเก็ตนี้เลย
--  คำสั่ง list จึงคืนรายการเปล่าสำหรับทุกคนที่ไม่ใช่แอดมิน
--  คู่กับชื่อไฟล์ที่เป็น uuid สุ่ม ทำให้ไล่เดาที่อยู่รูปไม่ได้
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- อ่านรายชื่อไฟล์ได้เฉพาะแอดมิน (ไว้ใช้ตอนเก็บกวาดไฟล์ค้าง)
drop policy if exists post_media_list_admin on storage.objects;
create policy post_media_list_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'post-media' and public.current_user_is_admin());

drop policy if exists post_media_insert_admin on storage.objects;
create policy post_media_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-media' and public.current_user_is_admin());

drop policy if exists post_media_update_admin on storage.objects;
create policy post_media_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'post-media' and public.current_user_is_admin())
  with check (bucket_id = 'post-media' and public.current_user_is_admin());

drop policy if exists post_media_delete_admin on storage.objects;
create policy post_media_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and public.current_user_is_admin());


-- ============================================================================
--  ตรวจว่าใช้ได้จริงไหม (ลบ -- ออกแล้วกด Run)
-- ============================================================================

-- หมวดเริ่มต้นเข้าครบไหม ควรได้ 8 แถว
-- select slug, title, kind, position from public.post_sections order by position;

-- ตารางถูกปิดสิทธิ์จริงไหม ควรได้ 0 แถว
-- select table_name, grantee, privilege_type
--   from information_schema.table_privileges
--  where table_schema = 'public'
--    and table_name in ('posts', 'post_media', 'post_sections')
--    and grantee in ('anon', 'authenticated');

-- anon เรียกฟังก์ชันของโพสต์ได้ตัวไหนบ้าง ควรได้สี่ตัวตามที่เขียนไว้ข้อ 8
-- select p.proname
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname like 'post%'
--    and has_function_privilege('anon', p.oid, 'execute')
--  order by 1;
