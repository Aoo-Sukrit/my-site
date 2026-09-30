import { thaiDateTimeLong, thaiMonthLabel } from "./date";

/**
 * กติกาของผลวิ่ง
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งจาก
 * ฟอร์มฝั่งเบราว์เซอร์ (เพื่อบอกผู้ใช้ทันทีตอนเลือกวันที่) และจาก Server Action
 *
 * เรื่องเวลา ไฟล์นี้ไม่มีเลขวันตายตัวอยู่เลย กติกาย้อนหลังมาจาก
 * rounds.results_at ฝั่งฐานข้อมูล ซึ่งแอดมินเลื่อนได้
 */

/**
 * ขั้นต่ำและขั้นสูงของระยะต่อหนึ่งรายการ
 * ต้องตรงกับ constraint runs_distance_range ใน supabase/migrations/20260925000005_distance_range.sql
 *
 * ขั้นต่ำกันคนกรอกเล่นๆ ทีละ 0.01 จนตารางรก
 * ขั้นสูงกันพิมพ์ผิด เช่นตั้งใจพิมพ์ 7.00 แต่พิมพ์ 700 ซึ่งจะทำให้กระดาน
 * เพี้ยนทั้งเดือนโดยไม่มีใครทันสังเกต
 */
export const DISTANCE_MIN_KM = 0.5;
export const DISTANCE_MAX_KM = 200;

export type DistanceCheck = { ok: true } | { ok: false; reason: string };

export function checkDistance(value: string | number): DistanceCheck {
  const distance = typeof value === "number" ? value : Number(value);

  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, reason: "ใส่ระยะที่วิ่งด้วย" };
  }
  if (!Number.isFinite(distance)) {
    return { ok: false, reason: "ระยะต้องเป็นตัวเลข" };
  }
  if (distance < DISTANCE_MIN_KM) {
    return {
      ok: false,
      reason:
        "ระยะต้องอย่างน้อย 0.5 กม. ถ้าวิ่งสั้นกว่านี้ไม่ต้องกรอกก็ได้",
    };
  }
  if (distance > DISTANCE_MAX_KM) {
    return {
      ok: false,
      reason:
        "ระยะเกิน 200 กม. ต่อครั้ง เช็กอีกทีว่าพิมพ์ถูกไหม ถ้าวิ่งจริงให้แอดมินใส่ให้",
    };
  }

  return { ok: true };
}

/** "2026-09-15" -> "2026-09" */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** "2026-09" -> "2026-08" */
export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function labelOf(monthKey: string) {
  return thaiMonthLabel(`${monthKey}-01`);
}

export type EntryCheck =
  | { ok: true; roundMonthKey: string; hint: string }
  | { ok: false; reason: string };

/**
 * เวลาตัดสินผลของแต่ละเดือน คีย์เป็น "2026-09" ค่าเป็น ISO timestamp
 * มาจากตาราง rounds ฝั่งฐานข้อมูล ไม่ได้คำนวณเองที่นี่
 */
export type ResultsAtByMonth = Record<string, string>;

/**
 * กรอกผลวิ่งของวันนี้ได้ไหม
 *
 * กติกาเหลือข้อเดียว กรอกผลของรอบไหนก็ได้ที่ยังไม่ถึงเวลาตัดสินของรอบนั้น
 * เดือนปัจจุบันผ่านเสมอเพราะเวลาตัดสินอยู่เดือนหน้า เดือนก่อนหน้าผ่านจนถึง
 * เที่ยงวันที่ 1 หรือเวลาที่แอดมินเลื่อนไป
 *
 * ตัวบังคับจริงคือ trigger runs_enforce_entry_window ในฐานข้อมูล
 * ตรงนี้มีไว้ให้ข้อความขึ้นเร็วและตรงกัน ถ้าสองฝั่งไม่ตรงกันให้ยึดฝั่งฐานข้อมูล
 *
 * @param ranOn     วันที่วิ่ง YYYY-MM-DD
 * @param today     วันนี้ตามเวลาไทย YYYY-MM-DD
 * @param resultsAt เวลาตัดสินของเดือนที่รู้จัก เดือนไหนไม่มีถือว่ายังไม่มีรอบ
 */
export function checkEntryWindow(
  ranOn: string,
  today: string,
  resultsAt: ResultsAtByMonth,
  now: number = Date.now(),
): EntryCheck {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ranOn)) {
    return { ok: false, reason: "วันที่วิ่งไม่ถูกต้อง" };
  }
  if (ranOn > today) {
    return { ok: false, reason: "กรอกวันที่ในอนาคตไม่ได้" };
  }

  const ranMonth = monthKeyOf(ranOn);
  const thisMonth = monthKeyOf(today);
  const deadline = resultsAt[ranMonth] ?? null;

  if (ranMonth === thisMonth) {
    // รอบของเดือนนี้ถูกสร้างให้เองตอนกรอกครั้งแรก เวลาตัดสินจึงอยู่เดือนหน้าเสมอ
    return {
      ok: true,
      roundMonthKey: ranMonth,
      hint: `นับเข้ารอบเดือน${labelOf(ranMonth)}`,
    };
  }

  if (!deadline) {
    return {
      ok: false,
      reason: `ไม่มีรอบของเดือน${labelOf(ranMonth)} ในระบบ ให้แอดมินช่วยใส่ให้`,
    };
  }

  if (now >= new Date(deadline).getTime()) {
    return {
      ok: false,
      reason: `ผลวิ่งของเดือน${labelOf(ranMonth)} ตัดสินไปแล้วเมื่อ ${thaiDateTimeLong(deadline)} กรอกเองไม่ได้ ให้แอดมินช่วยใส่ให้`,
    };
  }

  return {
    ok: true,
    roundMonthKey: ranMonth,
    hint: `นับเข้ารอบเดือน${labelOf(ranMonth)} (กรอกได้ถึง ${thaiDateTimeLong(deadline)})`,
  };
}

/** ช่วงวันที่ที่เลือกได้ของเดือนหนึ่ง ใช้กับ min/max ของ input type=date */
export function monthRange(monthKey: string): { min: string; max: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    min: `${monthKey}-01`,
    max: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}
