/**
 * กติกาของเกมตั้งเป้ารายเดือน
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งจาก
 * ฟอร์มฝั่งเบราว์เซอร์และจาก Server Action เหมือน run-rules.ts
 *
 * ตัวบังคับจริงคือ constraint กับ trigger ใน supabase/006_targets.sql
 * ตรงนี้มีไว้ให้ข้อความขึ้นเร็วและตรงกัน ถ้าสองฝั่งไม่ตรงให้ยึดฝั่งฐานข้อมูล
 */

export const TARGET_MIN_KM = 5;
export const TARGET_MAX_KM = 500;

export const VOTE_MIN = -5;
export const VOTE_MAX = 5;

/** ปุ่มโหวตที่ให้กด ไม่มี 0 เพราะไม่โหวตก็เท่ากับบอกว่าเป้านั้นเหมาะสมแล้ว */
export const VOTE_OPTIONS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5] as const;

/** เป้าสุดท้ายต่ำกว่านี้ไม่ได้ ต่อให้โดนโหวตลบจนติดลบ */
export const FINAL_MIN_KM = 5;

export type RuleCheck = { ok: true } | { ok: false; reason: string };

export function checkTargetKm(value: string | number): RuleCheck {
  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, reason: "ใส่เป้าระยะของเดือนนี้ด้วย" };
  }

  const km = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(km)) {
    return { ok: false, reason: "เป้าต้องเป็นตัวเลข" };
  }
  if (km < TARGET_MIN_KM) {
    return {
      ok: false,
      reason: `เป้าต้องอย่างน้อย ${TARGET_MIN_KM} กม.`,
    };
  }
  if (km > TARGET_MAX_KM) {
    return {
      ok: false,
      reason: `เป้าเกิน ${TARGET_MAX_KM} กม. เช็กอีกทีว่าพิมพ์ถูกไหม`,
    };
  }

  return { ok: true };
}

export function checkVoteDelta(value: number): RuleCheck {
  if (!Number.isInteger(value)) {
    return { ok: false, reason: "ค่าปรับต้องเป็นจำนวนเต็ม" };
  }
  if (value === 0) {
    return {
      ok: false,
      reason: "ปรับ 0 ไม่มีความหมาย ไม่โหวตก็เท่ากับบอกว่าเป้านั้นเหมาะสมแล้ว",
    };
  }
  if (value < VOTE_MIN || value > VOTE_MAX) {
    return {
      ok: false,
      reason: `ปรับได้ตั้งแต่ ${VOTE_MIN} ถึง +${VOTE_MAX} กม.`,
    };
  }

  return { ok: true };
}

/**
 * ช่วงเวลาของรอบ คำนวณจาก target_opens_at กับ target_locks_at ในตาราง rounds
 * ไม่มีเลขวันที่ฝังไว้ในโค้ดเลย แอดมินเลื่อนเวลาได้โดยไม่ต้อง deploy ใหม่
 */
export type RoundPhase = "before" | "open" | "revealed";

export function roundPhase(opensAt: string, locksAt: string): RoundPhase {
  const now = Date.now();
  const opens = new Date(opensAt).getTime();
  const locks = new Date(locksAt).getTime();

  if (!Number.isFinite(opens) || !Number.isFinite(locks)) return "before";
  if (now < opens) return "before";
  if (now < locks) return "open";
  return "revealed";
}

export const PHASE_LABEL: Record<RoundPhase, string> = {
  before: "ยังไม่เปิด",
  open: "เปิดอยู่ ปิดตา",
  revealed: "เปิดผลแล้ว",
};

/** เป้าสุดท้ายหลังรวมโหวต ใช้ตอนแสดงผลให้ตรงกับที่ฐานข้อมูลคำนวณ */
export function finalKm(baseKm: number, totalDelta: number): number {
  return Math.max(baseKm + totalDelta, FINAL_MIN_KM);
}
