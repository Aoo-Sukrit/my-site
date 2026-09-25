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
