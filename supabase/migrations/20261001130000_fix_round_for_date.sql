-- ============================================================================
--  แก้ด่วน: สร้างรอบเดือนใหม่ไม่ได้
-- ----------------------------------------------------------------------------
--  20261001090000_results_at.sql เขียน round_for_date() ใหม่ แต่ insert แค่
--  (month, results_at) ลืม target_opens_at กับ target_locks_at ซึ่งเป็น
--  not null มาตั้งแต่ 20260925000006_targets.sql
--  insert จึงล้มทุกครั้ง พอขึ้นเดือนตุลาคม ทุกหน้าเลยขึ้นว่า "ยังไม่มีรอบของเดือนนี้"
--  กรอกผลวิ่ง ตั้งเป้า ตั้งรางวัล ไม่ได้ทั้งหมด
--
--  ไฟล์นี้ใส่ค่าเริ่มต้นกลับครบทั้งสามคอลัมน์ แล้วสร้างรอบเดือนปัจจุบันให้ทันที
--    target_opens_at = วันที่ 1 เวลา 00:00 ตามเวลาไทย
--    target_locks_at = วันที่ 8 เวลา 00:00 ตามเวลาไทย (หมดเขตปลายวันที่ 7)
--    results_at      = default_results_at() (เที่ยงวันที่ 1 ของเดือนถัดไป)
--  รันซ้ำได้ไม่พัง
-- ============================================================================

create or replace function public.round_for_date(target date)
returns public.rounds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_month date := date_trunc('month', target)::date;
  result       public.rounds;
begin
  insert into public.rounds (month, target_opens_at, target_locks_at, results_at)
  values (
    target_month,
    (target_month::timestamp at time zone 'Asia/Bangkok'),
    ((target_month + 7)::timestamp at time zone 'Asia/Bangkok'),
    public.default_results_at(target_month)
  )
  on conflict (month) do nothing;

  select * into result
    from public.rounds
   where month = target_month;

  return result;
end;
$$;

revoke all on function public.round_for_date(date) from public, anon;
grant execute on function public.round_for_date(date) to authenticated;

-- สร้างรอบของเดือนปัจจุบันให้เลย ไม่ต้องรอให้ใครเปิดหน้าเว็บ
select public.round_for_date(public.current_month_bkk());
