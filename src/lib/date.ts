export const CLUB_TIME_ZONE = "Asia/Bangkok";

/**
 * วันที่แบบ YYYY-MM-DD ตามเวลาไทย
 *
 * เซิร์ฟเวอร์อาจเดินด้วย UTC ถ้าใช้ toISOString() ตรงๆ ช่วงเที่ยงคืนถึงตีเจ็ด
 * ตามเวลาไทยจะได้วันที่ของเมื่อวาน ซึ่งทำให้ค่าเริ่มต้นในช่องวันที่วิ่งผิด
 * ฝั่งฐานข้อมูลก็คิดเดือนด้วยโซนเดียวกันนี้ (003_runs.sql ข้อ 1)
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

/** ตัวเลขเปอร์เซ็นต์แบบอ่านง่าย */
export function formatPercent(value: number | string | null): string {
  if (value === null) return "—";
  return `${Number(value).toFixed(0)}%`;
}
