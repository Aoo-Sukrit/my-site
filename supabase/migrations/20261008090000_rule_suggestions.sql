-- ============================================================================
--  AOOOKULELE & CO. — กล่องเสนอแก้กติกาเดือนหน้า (ท้ายแท็บคำท้า)
-- ----------------------------------------------------------------------------
--  เพื่อนเขียนข้อเสนอสั้นๆ ว่าอยากแก้กติกาอะไรเดือนหน้า แล้วกด 👍 ให้ข้อเสนอ
--  ของคนอื่นที่เห็นด้วย เจ้าของเว็บดูว่าข้อไหนคนเห็นด้วยเยอะ แล้วไปแก้กติกาเอง
--  ระบบไม่ได้เปลี่ยนกติกาอะไรให้อัตโนมัติ
--
--  ตกลงกันวันที่ 8 ต.ค. 2569
--    - มีปุ่ม 👍 เรียงข้อที่คนเห็นด้วยเยอะไว้บน
--    - หน้าเว็บโชว์แค่ของเดือนปัจจุบัน ขึ้นเดือนใหม่กระดานว่างเอง
--      (ของเก่ายังอยู่ในตาราง ไม่ได้ลบ แค่ไม่ได้ดึงมาโชว์)
--
--  กติกา
--    - สมาชิกที่อนุมัติแล้วเท่านั้น เขียนได้คนละไม่เกิน 10 ข้อต่อเดือน
--      ข้อละ 1–280 ตัวอักษร
--    - คนเขียนลบข้อของตัวเองได้ แอดมินลบได้ทุกข้อ
--    - 👍 ได้คนละหนึ่งครั้งต่อข้อ กดซ้ำเพื่อเอาออก กดให้ข้อของตัวเองไม่ได้
--    - เขียนและกด 👍 ได้เฉพาะข้อของเดือนปัจจุบัน
--
--  ผลกับข้อมูลจริง: เพิ่มตารางใหม่สองตารางกับฟังก์ชันสี่ตัว
--  ไม่แตะตารางหรือข้อมูลเดิมเลย
-- ============================================================================


-- ============================================================================
--  1. ตาราง
-- ============================================================================

create table if not exists public.rule_suggestions (
  id         uuid        primary key default gen_random_uuid(),
  -- วันที่ 1 ของเดือนที่เขียน (เวลาไทย) ใช้แยกกระดานของแต่ละเดือน
  month      date        not null default public.current_month_bkk(),
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

comment on table public.rule_suggestions is
  'ข้อเสนอแก้กติกาเดือนหน้า เขียนจากท้ายแท็บคำท้า หน้าเว็บโชว์เฉพาะเดือนปัจจุบัน';

create index if not exists rule_suggestions_month_idx
  on public.rule_suggestions (month, created_at desc);

-- 👍 หนึ่งคนต่อหนึ่งข้อ บังคับด้วย primary key
create table if not exists public.rule_suggestion_votes (
  suggestion_id uuid        not null references public.rule_suggestions (id) on delete cascade,
  profile_id    uuid        not null references public.profiles (id)         on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (suggestion_id, profile_id)
);

comment on table public.rule_suggestion_votes is
  'ใครกด 👍 ข้อเสนอไหน หนึ่งคนต่อหนึ่งข้อ';


-- ============================================================================
--  2. ปิดประตูตาราง ทางเข้าออกมีแค่ฟังก์ชันในข้อ 3 แบบเดียวกับตารางอื่นในเว็บ
-- ============================================================================

revoke all on public.rule_suggestions      from anon, authenticated;
revoke all on public.rule_suggestion_votes from anon, authenticated;

alter table public.rule_suggestions      enable row level security;
alter table public.rule_suggestion_votes enable row level security;


-- ============================================================================
--  3. ฟังก์ชัน
-- ============================================================================

-- เขียนได้คนละกี่ข้อต่อเดือน เก็บไว้ที่เดียว ต้องตรงกับ src/lib/rule-suggestions.ts
create or replace function public.rule_suggestion_monthly_limit()
returns int
language sql
immutable
set search_path = ''
as $$ select 10; $$;


-- ข้อเสนอของเดือนปัจจุบัน 👍 เยอะสุดอยู่บน เท่ากันเอาใหม่กว่าขึ้นก่อน
drop function if exists public.rule_suggestions_list();
create function public.rule_suggestions_list()
returns table (
  id          uuid,
  author_id   uuid,
  nickname    text,
  avatar_url  text,
  body        text,
  created_at  timestamptz,
  vote_count  int,
  i_voted     boolean,
  is_mine     boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.require_approved_member() as id)
  select s.id,
         s.author_id,
         p.nickname,
         p.avatar_url,
         s.body,
         s.created_at,
         coalesce(v.n, 0)::int,
         exists (
           select 1 from public.rule_suggestion_votes mv
            where mv.suggestion_id = s.id and mv.profile_id = me.id
         ),
         s.author_id = me.id
    from public.rule_suggestions s
    join public.profiles p on p.id = s.author_id
    cross join me
    left join lateral (
      select count(*) as n
        from public.rule_suggestion_votes vv
       where vv.suggestion_id = s.id
    ) v on true
   where s.month = public.current_month_bkk()
   order by coalesce(v.n, 0) desc, s.created_at desc;
$$;


create or replace function public.rule_suggestion_add(p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me     uuid := public.require_approved_member();
  clean  text := btrim(coalesce(p_body, ''));
  used   int;
  new_id uuid;
begin
  if clean = '' then
    raise exception 'พิมพ์ข้อเสนอก่อนนะ' using errcode = '23514';
  end if;

  if char_length(clean) > 280 then
    raise exception 'ข้อเสนอยาวเกิน 280 ตัวอักษร' using errcode = '23514';
  end if;

  select count(*) into used
    from public.rule_suggestions
   where author_id = me
     and month = public.current_month_bkk();

  if used >= public.rule_suggestion_monthly_limit() then
    raise exception 'เดือนนี้เสนอครบ % ข้อแล้ว ลบข้อเก่าก่อนถ้าอยากเสนอใหม่',
      public.rule_suggestion_monthly_limit() using errcode = '54000';
  end if;

  insert into public.rule_suggestions (author_id, body)
  values (me, clean)
  returning id into new_id;

  return new_id;
end;
$$;


-- คนเขียนลบของตัวเองได้ แอดมินลบได้ทุกข้อ 👍 ที่ติดอยู่หายตาม (cascade)
create or replace function public.rule_suggestion_delete(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me     uuid := public.require_approved_member();
  author uuid;
begin
  select author_id into author from public.rule_suggestions where id = p_id;

  if author is null then
    raise exception 'ไม่เจอข้อเสนอนี้' using errcode = '22023';
  end if;

  if author <> me and not public.current_user_is_admin() then
    raise exception 'ลบได้เฉพาะข้อเสนอของตัวเอง' using errcode = '42501';
  end if;

  delete from public.rule_suggestions where id = p_id;
end;
$$;


-- 👍 กดหรือเอาออก p_on = true คือกด false คือเอาออก
-- รับค่าที่อยากให้เป็นแทนการสลับ กดเบิ้ลเร็วๆ จะได้ไม่กลับไปกลับมา
create or replace function public.rule_suggestion_vote(p_id uuid, p_on boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_approved_member();
  s  public.rule_suggestions;
begin
  select * into s from public.rule_suggestions where id = p_id;

  if s.id is null then
    raise exception 'ไม่เจอข้อเสนอนี้' using errcode = '22023';
  end if;

  if s.month <> public.current_month_bkk() then
    raise exception 'ข้อเสนอนี้ปิดโหวตไปแล้ว' using errcode = '42501';
  end if;

  if s.author_id = me then
    raise exception 'กดเห็นด้วยให้ข้อของตัวเองไม่ได้' using errcode = '42501';
  end if;

  if p_on then
    insert into public.rule_suggestion_votes (suggestion_id, profile_id)
    values (p_id, me)
    on conflict do nothing;
  else
    delete from public.rule_suggestion_votes
     where suggestion_id = p_id and profile_id = me;
  end if;
end;
$$;


-- ============================================================================
--  4. สิทธิ์ เรียกได้เฉพาะคนที่ล็อกอินแล้ว (ข้างในเช็กซ้ำว่าอนุมัติแล้ว)
-- ============================================================================

revoke all on function public.rule_suggestion_monthly_limit()       from public, anon;
revoke all on function public.rule_suggestions_list()               from public, anon, authenticated;
revoke all on function public.rule_suggestion_add(text)             from public, anon, authenticated;
revoke all on function public.rule_suggestion_delete(uuid)          from public, anon, authenticated;
revoke all on function public.rule_suggestion_vote(uuid, boolean)   from public, anon, authenticated;

grant execute on function public.rule_suggestion_monthly_limit()     to authenticated;
grant execute on function public.rule_suggestions_list()             to authenticated;
grant execute on function public.rule_suggestion_add(text)           to authenticated;
grant execute on function public.rule_suggestion_delete(uuid)        to authenticated;
grant execute on function public.rule_suggestion_vote(uuid, boolean) to authenticated;
