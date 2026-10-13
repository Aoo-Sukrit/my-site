-- ============================================================================
--  AOOOKULELE & CO. — จัดกลุ่มโพสต์เป็น "ซีรีส์" (เช่น Quant Trading Journey)
-- ----------------------------------------------------------------------------
--  โพสต์หลายใบที่เป็นเรื่องต่อเนื่องกัน รวมไว้ในซีรีส์เดียว แต่ละใบมีเลขตอน
--  (Week 1, Week 2, …) หน้า /blog โชว์ซีรีส์เป็นการ์ดใบเดียว กดเข้าไปเห็นทุกตอน
--
--  ตกลงกันวันที่ 13 ต.ค. 2569
--    1. เลขตอนห้ามซ้ำในซีรีส์เดียวกัน (Week 3 มีได้ใบเดียว)
--    2. คำเรียกตอนตั้งได้ต่อซีรีส์ ค่าเริ่มต้น "Week"
--    3. รูปปกไม่บังคับ ไม่ตั้งก็ใช้รูปแรกของตอนแรกที่คนดูเห็นได้
--       ถ้าตั้ง เก็บในบัคเก็ต post-media เหมือนรูปในโพสต์
--    4. ซีรีส์ไม่มีสิทธิ์การมองเห็นของตัวเอง แต่ละตอนใช้สิทธิ์ของโพสต์ตัวเอง
--       คนดูเห็นเฉพาะตอนที่ตัวเองมีสิทธิ์ ถ้าไม่เหลือตอนไหนให้เห็นเลย
--       ซีรีส์ก็ไม่โผล่ ร่างกับลิงก์ลับไม่นับเป็นตอนในหน้าซีรีส์
--    5. ลบซีรีส์แล้วโพสต์ข้างในยังอยู่ แค่หลุดออกจากซีรีส์
--    6. ตั้ง slug เองได้ (เช่น quant-trading) ไม่ตั้งก็สร้างจากชื่อให้
--
--  ผลกับข้อมูลจริง
--    - เพิ่มตารางใหม่ post_series (ยังว่าง)
--    - เพิ่มสองคอลัมน์ใน posts คือ series_id กับ series_order
--      โพสต์เดิมทุกใบได้ค่าว่าง แปลว่าไม่อยู่ในซีรีส์ไหน หน้าตาเหมือนเดิม
--    - post_feed() คืนข้อมูลซีรีส์เพิ่ม (ลำดับและตัวกรองเหมือนเดิม)
--    - admin_save_post() รับซีรีส์กับเลขตอนเพิ่มอีกสองช่อง
--    - เพิ่มฟังก์ชันอ่านสี่ตัว ฟังก์ชันเขียนของแอดมินสองตัว
--    ไม่ลบ ไม่แก้ข้อมูลเดิม
-- ============================================================================


-- ============================================================================
--  1. ตาราง post_series
-- ============================================================================

create table if not exists public.post_series (
  id          uuid        primary key default gen_random_uuid(),
  -- ใช้ใน URL /blog/series/<slug>
  slug        text        not null unique
                          check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                                 and char_length(slug) between 2 and 60),
  title       text        not null check (char_length(title) between 1 and 120),
  description text        not null default ''
                          check (char_length(description) <= 1000),
  -- ที่อยู่ไฟล์ในบัคเก็ต post-media ไม่ใช่ URL เต็ม ว่างได้
  cover_url   text,
  -- คำนำหน้าเลขตอน "Week" → "Week 3"
  unit_label  text        not null default 'Week'
                          check (char_length(unit_label) between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.post_series is
  'ซีรีส์ของโพสต์ ไม่มีสิทธิ์การมองเห็นของตัวเอง ใช้ของแต่ละตอนแทน';

drop trigger if exists post_series_touch_updated_at on public.post_series;
create trigger post_series_touch_updated_at
  before update on public.post_series
  for each row execute function public.touch_updated_at();

revoke all on public.post_series from anon, authenticated;
alter table public.post_series enable row level security;


-- ============================================================================
--  2. posts.series_id กับ posts.series_order
-- ============================================================================

alter table public.posts
  add column if not exists series_id uuid
    references public.post_series (id) on delete set null;

alter table public.posts
  add column if not exists series_order int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_series_order_range'
  ) then
    alter table public.posts add constraint posts_series_order_range
      check (series_order is null or series_order between 1 and 999);
  end if;

  -- อยู่ในซีรีส์ต้องมีเลขตอนเสมอ (ทางกลับกันไม่บังคับ เผื่อซีรีส์ถูกลบ)
  if not exists (
    select 1 from pg_constraint where conname = 'posts_series_needs_order'
  ) then
    alter table public.posts add constraint posts_series_needs_order
      check (series_id is null or series_order is not null);
  end if;
end;
$$;

-- เลขตอนห้ามซ้ำในซีรีส์เดียวกัน
create unique index if not exists posts_series_order_unique
  on public.posts (series_id, series_order)
  where series_id is not null;

comment on column public.posts.series_id is
  'ซีรีส์ที่โพสต์นี้อยู่ ว่างคือโพสต์เดี่ยว ลบซีรีส์แล้วกลับเป็นว่าง';
comment on column public.posts.series_order is
  'เลขตอนในซีรีส์ เช่น 3 ของ Week 3 ห้ามซ้ำในซีรีส์เดียวกัน';


-- ============================================================================
--  3. post_feed() คืนข้อมูลซีรีส์ด้วย
-- ----------------------------------------------------------------------------
--  หน้า /blog เอาไปยุบตอนของซีรีส์เดียวกันเป็นการ์ดใบเดียว
--  เพิ่มคอลัมน์ที่คืน = return type เปลี่ยน ต้อง drop ก่อน create แล้ว grant ใหม่
--  ตัวกรองกับการเรียงเหมือนเดิมทุกอย่าง
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
  cover_youtube text,
  series_slug   text,
  series_title  text,
  series_order  int,
  series_unit   text,
  series_cover  text
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
         cover.youtube_id,
         sr.slug,
         sr.title,
         case when sr.id is not null then p.series_order end,
         sr.unit_label,
         sr.cover_url
    from public.posts p
    join public.post_sections s on s.id = p.section_id
    left join public.post_series sr on sr.id = p.series_id
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
--  4. ฟังก์ชันอ่าน
-- ============================================================================

/**
 * ตอนที่คนดูคนนี้เห็นได้ ใช้ร่วมกันทั้งหน้าซีรีส์และปุ่มตอนก่อน/ถัดไป
 * ไม่นับลิงก์ลับ (เหมือนฟีด) คนทั่วไปไม่เห็นร่างอยู่แล้วจาก can_see_post()
 * แอดมินเห็นร่างด้วย จะได้ตามแก้ตอนที่ยังไม่โพสต์ได้
 */
create or replace function public.post_series_visible_posts(p_series_id uuid)
returns setof public.posts
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
    from public.posts p
   where p.series_id = p_series_id
     and p.visibility <> 'unlisted'
     and public.can_see_post(p.visibility, p.status);
$$;


/** หัวซีรีส์ คืนว่างถ้าไม่มีตอนไหนที่คนดูเห็นได้ (แอดมินเห็นเสมอ) */
drop function if exists public.post_series_get(text);
create function public.post_series_get(p_slug text)
returns table (
  id            uuid,
  slug          text,
  title         text,
  description   text,
  cover_url     text,
  unit_label    text,
  episode_count int
)
language sql
stable
security definer
set search_path = ''
as $$
  select sr.id,
         sr.slug,
         sr.title,
         sr.description,
         sr.cover_url,
         sr.unit_label,
         n.count::int
    from public.post_series sr
    cross join lateral (
      select count(*) as count
        from public.post_series_visible_posts(sr.id)
    ) n
   where sr.slug = p_slug
     and (n.count > 0 or public.current_user_is_admin());
$$;


/** ทุกตอนที่คนดูเห็นได้ เรียงตามเลขตอน พร้อมสื่อชิ้นแรกไว้ทำรูปย่อ */
drop function if exists public.post_series_episodes(text);
create function public.post_series_episodes(p_slug text)
returns table (
  id            uuid,
  title         text,
  body          text,
  series_order  int,
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
         p.series_order,
         p.visibility,
         p.status,
         p.published_at,
         p.created_at,
         coalesce(agg.n, 0),
         cover.kind,
         cover.url,
         cover.youtube_id
    from public.post_series sr
    cross join lateral public.post_series_visible_posts(sr.id) p
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
   where sr.slug = p_slug
   order by p.series_order;
$$;


/**
 * แถบซีรีส์บนหน้าโพสต์ กับตอนก่อน/ถัดไปที่คนดูเห็นได้
 * หน้าแก้โพสต์ก็ใช้ตัวนี้หาว่าโพสต์อยู่ซีรีส์ไหน ตอนที่เท่าไหร่
 * คืนว่างถ้าโพสต์ไม่อยู่ในซีรีส์ หรือคนดูไม่มีสิทธิ์เห็นโพสต์นี้
 */
drop function if exists public.post_series_nav(uuid);
create function public.post_series_nav(p_post_id uuid)
returns table (
  series_id    uuid,
  series_slug  text,
  series_title text,
  unit_label   text,
  series_order int,
  prev_id      uuid,
  prev_title   text,
  prev_order   int,
  next_id      uuid,
  next_title   text,
  next_order   int
)
language sql
stable
security definer
set search_path = ''
as $$
  select sr.id,
         sr.slug,
         sr.title,
         sr.unit_label,
         p.series_order,
         prev.id,
         prev.title,
         prev.series_order,
         nxt.id,
         nxt.title,
         nxt.series_order
    from public.posts p
    join public.post_series sr on sr.id = p.series_id
    left join lateral (
      select v.id, v.title, v.series_order
        from public.post_series_visible_posts(sr.id) v
       where v.series_order < p.series_order
       order by v.series_order desc
       limit 1
    ) prev on true
    left join lateral (
      select v.id, v.title, v.series_order
        from public.post_series_visible_posts(sr.id) v
       where v.series_order > p.series_order
       order by v.series_order
       limit 1
    ) nxt on true
   where p.id = p_post_id
     and public.can_see_post(p.visibility, p.status);
$$;


/** ทุกซีรีส์ ไว้ทำ dropdown ในหน้าเขียนโพสต์ แอดมินเท่านั้น คนอื่นได้ว่าง */
drop function if exists public.post_series_list();
create function public.post_series_list()
returns table (
  id          uuid,
  slug        text,
  title       text,
  description text,
  cover_url   text,
  unit_label  text,
  post_count  int,
  max_order   int
)
language sql
stable
security definer
set search_path = ''
as $$
  select sr.id,
         sr.slug,
         sr.title,
         sr.description,
         sr.cover_url,
         sr.unit_label,
         count(p.id)::int,
         max(p.series_order)
    from public.post_series sr
    left join public.posts p on p.series_id = sr.id
   where public.current_user_is_admin()
   group by sr.id
   order by max(coalesce(p.published_at, p.created_at)) desc nulls first,
            sr.created_at desc;
$$;


-- ============================================================================
--  5. ฟังก์ชันเขียน (แอดมินเท่านั้น)
-- ============================================================================

/**
 * สร้างหรือแก้ซีรีส์
 *
 * slug ว่าง → สร้างจากชื่อ (เฉพาะ a-z 0-9) ถ้าชื่อเป็นภาษาไทยล้วนจนไม่เหลือ
 * อะไร ใช้ series-<ต้น id> แทน slug ที่สร้างให้แล้วชนกับของเดิม เติม -2 -3 ต่อท้าย
 * ส่วน slug ที่ตั้งเองแล้วชน แจ้งกลับไปให้เปลี่ยน ไม่เปลี่ยนให้เงียบๆ
 *
 * คืนรูปปกเก่าที่ถูกเปลี่ยนออก ฝั่งเว็บจะได้ตามไปลบใน storage
 */
create or replace function public.admin_save_series(
  p_id          uuid,
  p_slug        text,
  p_title       text,
  p_description text default '',
  p_unit_label  text default 'Week',
  p_cover_url   text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id      uuid := coalesce(p_id, gen_random_uuid());
  v_title   text := btrim(coalesce(p_title, ''));
  v_unit    text := btrim(coalesce(p_unit_label, ''));
  v_slug    text := lower(btrim(coalesce(p_slug, '')));
  v_cover   text := nullif(btrim(coalesce(p_cover_url, '')), '');
  v_auto    boolean := false;
  v_base    text;
  v_n       int := 1;
  v_old     text;
begin
  if not public.current_user_is_admin() then
    raise exception 'จัดการซีรีส์ได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  if v_title = '' then
    raise exception 'ใส่ชื่อซีรีส์ด้วย' using errcode = '23514';
  end if;
  if char_length(v_title) > 120 then
    raise exception 'ชื่อซีรีส์ยาวเกิน 120 ตัวอักษร' using errcode = '23514';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'คำอธิบายซีรีส์ยาวเกิน 1000 ตัวอักษร' using errcode = '23514';
  end if;
  if v_unit = '' then
    v_unit := 'Week';
  end if;
  if char_length(v_unit) > 20 then
    raise exception 'คำเรียกตอนยาวเกิน 20 ตัวอักษร' using errcode = '23514';
  end if;

  if v_slug = '' then
    v_auto := true;
    v_slug := left(
      btrim(regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'), '-'),
      60
    );
    v_slug := btrim(v_slug, '-');
    if char_length(v_slug) < 2 then
      v_slug := 'series-' || left(replace(v_id::text, '-', ''), 6);
    end if;
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 60 then
    raise exception 'slug ใช้ได้แค่ a-z 0-9 กับขีด - ยาว 2–60 ตัว เช่น quant-trading'
      using errcode = '23514';
  end if;

  if v_auto then
    v_base := left(v_slug, 56);
    while exists (
      select 1 from public.post_series where slug = v_slug and id <> v_id
    ) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
  elsif exists (
    select 1 from public.post_series where slug = v_slug and id <> v_id
  ) then
    raise exception 'slug "%" มีซีรีส์อื่นใช้แล้ว ลองตั้งใหม่', v_slug
      using errcode = '23505';
  end if;

  select cover_url into v_old from public.post_series where id = v_id;

  insert into public.post_series (id, slug, title, description, unit_label, cover_url)
  values (v_id, v_slug, v_title, coalesce(p_description, ''), v_unit, v_cover)
  on conflict (id) do update
     set slug        = excluded.slug,
         title       = excluded.title,
         description = excluded.description,
         unit_label  = excluded.unit_label,
         cover_url   = excluded.cover_url;

  return jsonb_build_object(
    'id', v_id,
    'slug', v_slug,
    'removed', case
      when v_old is not null and v_old is distinct from v_cover
        then jsonb_build_array(v_old)
      else '[]'::jsonb
    end
  );
end;
$$;


/** ลบซีรีส์ โพสต์ข้างในยังอยู่ครบ แค่กลายเป็นโพสต์เดี่ยว */
create or replace function public.admin_delete_series(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cover text;
begin
  if not public.current_user_is_admin() then
    raise exception 'จัดการซีรีส์ได้เฉพาะแอดมิน' using errcode = '42501';
  end if;

  select cover_url into v_cover from public.post_series where id = p_id;

  -- ล้างเลขตอนเอง on delete set null ล้างให้แค่ series_id
  update public.posts
     set series_id = null, series_order = null
   where series_id = p_id;

  delete from public.post_series where id = p_id;

  return jsonb_build_object(
    'removed',
    case when v_cover is null then '[]'::jsonb else jsonb_build_array(v_cover) end
  );
end;
$$;


/**
 * admin_save_post() รับซีรีส์กับเลขตอนเพิ่ม
 *
 * เพิ่มพารามิเตอร์ = ได้ฟังก์ชันใหม่อีกตัวที่ชื่อซ้ำ (overload) PostgREST จะงง
 * ว่าเรียกตัวไหน จึง drop ตัวเจ็ดช่องเดิมทิ้งก่อน
 * เนื้อในเหมือนเดิมทุกอย่าง ต่างแค่ส่วนซีรีส์
 */
drop function if exists public.admin_save_post(uuid, text, text, text, text, text, jsonb);
create or replace function public.admin_save_post(
  p_id           uuid,
  p_title        text,
  p_body         text,
  p_section      text,
  p_visibility   text,
  p_status       text,
  p_media        jsonb default '[]'::jsonb,
  p_series_id    uuid  default null,
  p_series_order int   default null
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
  v_unit    text;
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

  if p_series_id is not null then
    select unit_label into v_unit from public.post_series where id = p_series_id;
    if v_unit is null then
      raise exception 'ไม่เจอซีรีส์ที่เลือก ลองรีเฟรชหน้า' using errcode = '22023';
    end if;
    if p_series_order is null or p_series_order not between 1 and 999 then
      raise exception 'ใส่เลข % เป็นเลข 1–999', v_unit using errcode = '23514';
    end if;
  end if;

  -- ฝั่งเว็บเป็นคนตั้ง id มาเอง เพื่อให้โฟลเดอร์รูปใน storage ชื่อเดียวกับโพสต์
  -- ตั้งแต่รูปแรกที่อัป ทั้งที่ตอนนั้นยังไม่ได้กดบันทึกเลยสักครั้ง
  -- ถ้าปล่อยให้ฐานข้อมูลสุ่ม id เอง รูปจะไปอยู่โฟลเดอร์ที่ไม่ตรงกับโพสต์
  v_id := coalesce(p_id, gen_random_uuid());

  begin
    insert into public.posts (id, title, body, section_id, visibility, status,
                              published_at, series_id, series_order)
    values (v_id, btrim(p_title), coalesce(p_body, ''), v_section, p_visibility,
            p_status,
            case when p_status = 'published' then now() end,
            p_series_id,
            case when p_series_id is not null then p_series_order end)
    on conflict (id) do update
       set title        = excluded.title,
           body         = excluded.body,
           section_id   = excluded.section_id,
           visibility   = excluded.visibility,
           status       = excluded.status,
           series_id    = excluded.series_id,
           series_order = excluded.series_order,
           -- ตั้งเวลาเผยแพร่ครั้งแรกที่กดโพสต์ แก้ทีหลังไม่ขยับวันที่
           published_at = case
             when excluded.status = 'published'
               then coalesce(posts.published_at, now())
             else posts.published_at
           end;
  exception when unique_violation then
    -- ชนอย่างอื่นที่ไม่ใช่เลขตอน ส่งต่อตามเดิม
    if p_series_id is null then
      raise;
    end if;
    raise exception '% % มีตอนอื่นในซีรีส์นี้แล้ว เปลี่ยนเลขก่อนนะ',
      v_unit, p_series_order using errcode = '23505';
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


-- ============================================================================
--  6. สิทธิ์
-- ----------------------------------------------------------------------------
--  ฟังก์ชันอ่านของหน้าซีรีส์เปิดให้ anon ด้วย เหมือน post_feed() เพราะซีรีส์
--  ที่มีตอนสาธารณะต้องเปิดดูได้โดยไม่ล็อกอิน ข้างในกรองสิทธิ์รายตอนเองแล้ว
-- ============================================================================

revoke all on function public.post_feed(text, int, int)              from public, anon, authenticated;
grant execute on function public.post_feed(text, int, int)           to anon, authenticated;

revoke all on function public.post_series_visible_posts(uuid)        from public, anon, authenticated;

revoke all on function public.post_series_get(text)                  from public, anon, authenticated;
grant execute on function public.post_series_get(text)               to anon, authenticated;

revoke all on function public.post_series_episodes(text)             from public, anon, authenticated;
grant execute on function public.post_series_episodes(text)          to anon, authenticated;

revoke all on function public.post_series_nav(uuid)                  from public, anon, authenticated;
grant execute on function public.post_series_nav(uuid)               to anon, authenticated;

revoke all on function public.post_series_list()                     from public, anon, authenticated;
grant execute on function public.post_series_list()                  to authenticated;

revoke all on function public.admin_save_series(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_save_series(uuid, text, text, text, text, text)
  to authenticated;

revoke all on function public.admin_delete_series(uuid)              from public, anon, authenticated;
grant execute on function public.admin_delete_series(uuid)           to authenticated;

revoke all on function public.admin_save_post(
  uuid, text, text, text, text, text, jsonb, uuid, int
) from public, anon, authenticated;
grant execute on function public.admin_save_post(
  uuid, text, text, text, text, text, jsonb, uuid, int
) to authenticated;
