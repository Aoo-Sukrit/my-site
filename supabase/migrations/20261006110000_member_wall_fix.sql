-- ============================================================================
--  AOOOKULELE & CO. — แก้ชื่อตัวแปรที่ชนกับชื่อคอลัมน์ในกระดานแซว
-- ----------------------------------------------------------------------------
--  member_wall_list() ที่ลงไปใน 20261006090000_member_wall.sql เรียกไม่ได้เลย
--  ขึ้น "column reference is_admin is ambiguous (SQLSTATE 42702)"
--
--  สาเหตุ: ประกาศตัวแปรชื่อ is_admin ไว้ใน declare แล้วในคำสั่ง select ก็ join
--  ตาราง profiles ซึ่งมีคอลัมน์ชื่อ is_admin เหมือนกัน plpgsql จึงไม่รู้ว่า
--  is_admin ที่เขียนไว้หมายถึงตัวแปรหรือคอลัมน์ เลยไม่ยอมรันตั้งแต่แรก
--
--  บทเรียนเดียวกับตอน position เป็นชื่อพารามิเตอร์ไม่ได้
--  ใน plpgsql ชื่อตัวแปรห้ามซ้ำกับชื่อคอลัมน์ที่อยู่ในขอบเขตของคำสั่งนั้น
--  เปลี่ยนเป็น viewer_is_admin ซึ่งไม่มีตารางไหนมีคอลัมน์ชื่อนี้
--
--  member_wall_count() ไม่ได้ join profiles จึงไม่เจอปัญหา แต่เปลี่ยนชื่อ
--  ให้เหมือนกันไว้ เผื่อวันหลังมีคนเพิ่ม join เข้าไปแล้วไปเจอกับดักเดิม
--
--  ไม่แตะโครงตาราง ไม่แตะข้อมูล แก้แค่ตัวฟังก์ชัน
-- ============================================================================

drop function if exists public.member_wall_list(uuid, int);
create function public.member_wall_list(p_owner uuid, p_limit int default 50)
returns table (
  id            uuid,
  author_id     uuid,
  author_name   text,
  author_avatar text,
  body          text,
  hidden        boolean,
  can_delete    boolean,
  created_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me              uuid    := public.require_approved_member();
  viewer_is_admin boolean := public.current_user_is_admin();
begin
  return query
  select w.id,
         w.author_id,
         p.nickname,
         p.avatar_url,
         w.body,
         w.hidden,
         -- คนที่กำลังดูอยู่ลบข้อความนี้ได้ไหม (คนเขียนเอง หรือแอดมิน)
         (w.author_id = me or viewer_is_admin),
         w.created_at
    from public.member_wall w
    join public.profiles p on p.id = w.author_id
   where w.owner_id = p_owner
     and (not w.hidden or w.owner_id = me or viewer_is_admin)
   order by w.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;


drop function if exists public.member_wall_count(uuid);
create function public.member_wall_count(p_owner uuid)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me              uuid    := public.require_approved_member();
  viewer_is_admin boolean := public.current_user_is_admin();
  total           int;
begin
  select count(*)::int into total
    from public.member_wall w
   where w.owner_id = p_owner
     and (not w.hidden or w.owner_id = me or viewer_is_admin);

  return total;
end;
$$;


revoke all on function public.member_wall_list(uuid, int)
  from public, anon, authenticated;
grant execute on function public.member_wall_list(uuid, int) to authenticated;

revoke all on function public.member_wall_count(uuid)
  from public, anon, authenticated;
grant execute on function public.member_wall_count(uuid) to authenticated;
