export const CLUB_TIME_ZONE = "Asia/Bangkok";

/**
 * วันที่แบบ YYYY-MM-DD ตามเวลาไทย
 *
 * เซิร์ฟเวอร์อาจเดินด้วย UTC ถ้าใช้ toISOString() ตรงๆ ช่วงเที่ยงคืนถึงตีเจ็ด
 * ตามเวลาไทยจะได้วันที่ของเมื่อวาน ซึ่งทำให้ค่าเริ่มต้นในช่องวันที่วิ่งผิด
 * ฝั่งฐานข้อมูลก็คิดเดือนด้วยโซนเดียวกันนี้ (supabase/migrations/20260925000003_runs.sql ข้อ 1)
 *
 * en-CA ให้รูปแบบ YYYY-MM-DD พอดีกับที่ <input type="date"> ต้องการ
 */
export function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** ชื่อเดือนภาษาไทยจากวันที่ 1 ของเดือน เช่น "กันยายน 2569" */
export function thaiMonthLabel(monthStart: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: CLUB_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart}T00:00:00+07:00`));
}

/** วันที่แบบสั้นภาษาไทย เช่น "24 ก.ย." */
export function thaiShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: CLUB_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(new Date(`${isoDate}T00:00:00+07:00`));
}

/**
 * "7 ต.ค. 2569" วันที่สั้นพร้อมปี พ.ศ. ใช้วางข้างช่องเลือกวันที่
 * ช่อง input type=date โชว์ตามภาษาเครื่อง บางเครื่องเป็น 10/07/2026
 * อ่านแล้วงงว่าวันหรือเดือนมาก่อน บรรทัดนี้ยืนยันให้เป็นภาษาไทยอีกที
 */
export function thaiDateWithYear(isoDate: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: CLUB_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00+07:00`));
}

/** วันและเวลาแบบสั้นภาษาไทย ใช้กับประวัติการแก้ */
export function thaiDateTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: CLUB_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** ตัวเลขระยะแบบอ่านง่าย 12.5 -> "12.50" */
export function formatKm(value: number | string): string {
  return Number(value).toFixed(2);
}

/**
 * timestamptz -> ค่าสำหรับ <input type="datetime-local"> เป็นเวลาไทย
 *
 * input ชนิดนี้ไม่มีโซนเวลาในตัว มันอ่านค่าเป็นเวลาท้องถิ่นของเครื่องผู้ใช้
 * ถ้าปล่อยให้แปลงเอง แอดมินที่เปิดจากเครื่องที่ตั้งโซนอื่นจะเห็นเวลาเพี้ยน
 * จึงบังคับแปลงเป็นเวลาไทยเองทั้งขาเข้าและขาออก
 */
export function toBangkokInputValue(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  // hourCycle h23 ทำให้เที่ยงคืนออกมาเป็น 24 ในบางรันไทม์ ต้องดักเอง
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** ค่าจาก <input type="datetime-local"> ที่ถือว่าเป็นเวลาไทย -> ISO timestamptz */
export function fromBangkokInputValue(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;

  // +07:00 คือเวลาไทย ซึ่งไม่มี daylight saving จึงคงที่ตลอดปี
  const date = new Date(`${local}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** วันและเวลาแบบเต็มภาษาไทย ใช้บอกว่ารอบเปิดหรือปิดเมื่อไหร่ */
export function thaiDateTimeLong(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: CLUB_TIME_ZONE,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * ตัวเลขเปอร์เซ็นต์แบบอ่านง่าย
 *
 * นี่คือ "จุดปัดเศษจุดเดียว" ของทั้งระบบ ฐานข้อมูลส่งมาเป็นทศนิยมสองตำแหน่ง
 * แล้วปัดเป็นจำนวนเต็มที่นี่ครั้งเดียว
 *
 * เคยมีบั๊กจากการปัดสองรอบ 167 / 130 = 128.4615 ฐานข้อมูลปัดเป็น 128.5
 * แล้วตรงนี้ปัดต่อได้ 129 ซึ่งมากกว่าความจริงไปหนึ่ง
 * ถ้าจะแก้ที่ไหนก็ตาม อย่าให้มีการปัดเกิดขึ้นก่อนถึงบรรทัดนี้
 */
export function formatPercent(value: number | string | null): string {
  if (value === null) return "—";
  return `${Math.round(Number(value))}%`;
}

/**
 * สิ้นเดือนของรอบนั้น คือเที่ยงคืนของวันที่ 1 เดือนถัดไปตามเวลาไทย
 * ต้องตรงกับ round_month_end() ฝั่งฐานข้อมูล
 */
export function bangkokMonthEnd(monthStart: string): Date {
  const [year, month] = monthStart.slice(0, 7).split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const stamp = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`;
  return new Date(stamp);
}

/** เดือนของรอบนั้นจบไปแล้วหรือยัง */
export function monthHasEnded(monthStart: string): boolean {
  return Date.now() >= bangkokMonthEnd(monthStart).getTime();
}

/** เลขวันที่ของเดือนตามเวลาไทย */
export function bangkokDayOfMonth(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: CLUB_TIME_ZONE,
      day: "numeric",
    }).format(new Date(iso)),
  );
}

/**
 * เหลืออีกกี่วันจนถึงเวลานั้น ปัดขึ้น
 * วันนี้ยังไม่จบถือว่าเหลือ 1 วัน ถึงเวลาแล้วคืน 0
 */
export function daysLeftUntil(iso: string, from: number = Date.now()): number {
  const left = new Date(iso).getTime() - from;
  if (left <= 0) return 0;
  return Math.ceil(left / 86_400_000);
}

/**
 * เวลานั้นผ่านไปแล้วหรือยัง
 *
 * ห่อ Date.now() ไว้ในฟังก์ชันเพราะเรียกตรงๆ ในตัว component จะผิดกฎ
 * ความบริสุทธิ์ของ React (react-hooks/purity) ซึ่งเจอมาแล้วหลายรอบ
 */
export function hasPassed(iso: string, now: number = Date.now()): boolean {
  return now >= new Date(iso).getTime();
}

/**
 * ตอนนี้ยังไม่เลย days วันหลังเวลา iso ใช่ไหม (รวมช่วงก่อนถึง iso ด้วย)
 * ใช้กับของที่ควรขึ้นแค่ช่วงสั้นๆ หลังเหตุการณ์ เช่นแถบประกาศผลเดือนก่อน
 * ถ้า iso อ่านไม่ออกถือว่าเลยไปแล้ว ไม่ขึ้นอะไรค้างไว้
 */
export function withinDaysAfter(
  iso: string,
  days: number,
  now: number = Date.now(),
): boolean {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  return now < at + days * 24 * 60 * 60 * 1000;
}
