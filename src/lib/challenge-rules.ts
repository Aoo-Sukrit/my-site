import { splitBeer, type BeerSplit, type BeerStake } from "./beer-split";

/**
 * กติกาของคำท้า ฝั่งที่ไม่ต้องคุยกับฐานข้อมูล
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน เรียกได้ทั้งจาก Server Component และไฟล์ "use client"
 * ตัวบังคับจริงอยู่ในฐานข้อมูล (supabase/migrations/20260930203000_challenges.sql)
 * ตรงนี้มีไว้ให้ข้อความขึ้นเร็วและตรงกัน ถ้าสองฝั่งไม่ตรงกันให้ยึดฝั่งฐานข้อมูล
 *
 * เรื่องเวลา ไฟล์นี้ตั้งใจไม่มีเลข 20 และไม่มีเลข 4 อยู่เลย
 * เวลาปิดรับ (lock_at) กับเวลาตัดสิน (settle_at) มาจาก round_deadlines()
 * ฝั่งฐานข้อมูล ซึ่งคำนวณจาก challenge_join_last_day() กับ backdate_grace_days()
 * ที่เก็บไว้ที่เดียว หน้าเว็บแค่เอา timestamp มาแสดงเฉยๆ
 */

export const BOTTLE_MIN = 1;
export const BOTTLE_MAX = 12;

/** ตัวเลือกจำนวนขวดในฟอร์ม 1 ถึง 12 */
export const BOTTLE_OPTIONS = Array.from(
  { length: BOTTLE_MAX - BOTTLE_MIN + 1 },
  (_, index) => BOTTLE_MIN + index,
);

export const CHALLENGE_STATUSES = [
  "pending",
  "running",
  "reached",
  "missed",
  "declined",
  "cancelled",
  "expired",
] as const;

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const CHALLENGE_STATUS_LABEL: Record<ChallengeStatus, string> = {
  pending: "รอรับ",
  running: "กำลังแข่ง",
  reached: "ถึงแล้ว",
  missed: "ไม่ถึง",
  declined: "ปฏิเสธแล้ว",
  cancelled: "ยกเลิกแล้ว",
  expired: "ตกไป",
};

export type ChallengeSide = "reach" | "miss";

export const SIDE_LABEL: Record<ChallengeSide, string> = {
  reach: "ถึงแน่",
  miss: "ไม่ถึงแน่",
};

export function isChallengeStatus(value: unknown): value is ChallengeStatus {
  return (
    typeof value === "string" &&
    (CHALLENGE_STATUSES as readonly string[]).includes(value)
  );
}

export function isChallengeSide(value: unknown): value is ChallengeSide {
  return value === "reach" || value === "miss";
}

/** ตัดสินไปแล้ว รู้ผลแน่นอน ไม่เปลี่ยนอีก */
export function isSettled(status: ChallengeStatus): boolean {
  return status === "reached" || status === "missed";
}

/** เกิดขึ้นจริงแล้ว มีเบียร์วางอยู่ */
export function isLive(status: ChallengeStatus): boolean {
  return status === "running" || isSettled(status);
}

/** ไม่ได้เกิดขึ้น เอาไว้ท้ายสุดแบบจางๆ */
export function isDormant(status: ChallengeStatus): boolean {
  return (
    status === "declined" || status === "cancelled" || status === "expired"
  );
}

/** ลำดับการเรียงบนหน้าเว็บ ตรงกับ order by ใน round_challenges() */
export function statusOrder(status: ChallengeStatus): number {
  if (status === "running") return 0;
  if (status === "pending") return 1;
  if (isSettled(status)) return 2;
  return 3;
}

export type Check = { ok: true } | { ok: false; reason: string };

export function checkBottles(value: string | number): Check {
  const bottles = typeof value === "number" ? value : Number(value);

  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, reason: "เลือกจำนวนเบียร์ด้วย" };
  }
  if (!Number.isInteger(bottles)) {
    return { ok: false, reason: "จำนวนเบียร์ต้องเป็นจำนวนเต็ม" };
  }
  if (bottles < BOTTLE_MIN || bottles > BOTTLE_MAX) {
    return {
      ok: false,
      reason: `วางเบียร์ได้ตั้งแต่ ${BOTTLE_MIN} ถึง ${BOTTLE_MAX} ขวด`,
    };
  }
  return { ok: true };
}

/**
 * เป้าต้องมากกว่าระยะที่เขาวิ่งไปแล้ว ไม่งั้นท้าแล้วชนะทันทีตั้งแต่วินาทีแรก
 * @param currentKm ระยะรวมของคนถูกท้าในเดือนนี้ ณ ตอนกดท้า
 */
export function checkTargetKm(
  value: string | number,
  currentKm: number,
): Check {
  const target = typeof value === "number" ? value : Number(value);

  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, reason: "ใส่ระยะเป้าด้วย" };
  }
  if (!Number.isFinite(target)) {
    return { ok: false, reason: "ระยะเป้าต้องเป็นตัวเลข" };
  }
  if (target <= 0) {
    return { ok: false, reason: "ระยะเป้าต้องมากกว่า 0" };
  }
  if (target > 2000) {
    return { ok: false, reason: "ระยะเป้าเกิน 2000 กม. เช็กอีกทีว่าพิมพ์ถูกไหม" };
  }
  if (target <= currentKm) {
    return {
      ok: false,
      reason: `เขาวิ่งไปแล้ว ${currentKm.toFixed(2)} กม. ตั้งเป้าให้มากกว่านี้`,
    };
  }
  return { ok: true };
}

/** ระยะขั้นต่ำที่ตั้งเป้าได้ คือมากกว่าของเดิมไปอีกครึ่งกิโล จะได้กดง่าย */
export function suggestedTargetKm(currentKm: number): number {
  return Math.max(1, Math.ceil((currentKm + 0.5) * 2) / 2);
}

/** 0 ถึง 100 ใช้กับความกว้างของแถบ */
export function progressPercent(totalKm: number, targetKm: number): number {
  if (targetKm <= 0) return 0;
  return Math.max(0, Math.min(100, (totalKm / targetKm) * 100));
}

/** เหลืออีกกี่กิโล ถึงแล้วคืน 0 */
export function remainingKm(totalKm: number, targetKm: number): number {
  return Math.max(0, targetKm - totalKm);
}

/**
 * ยังลงเบียร์เพิ่มได้อยู่ไหม
 *
 * lockAtIso มาจาก round_deadlines() ฝั่งฐานข้อมูล ไฟล์นี้ไม่รู้จักเลข 20
 * ห่อ Date.now() ไว้ในฟังก์ชันเพราะเรียกตรงๆ ในตัว component จะผิดกฎ
 * ความบริสุทธิ์ของ React (เคยโดนมาแล้วตอนทำรูปสตอรี่)
 */
export function isJoinOpen(lockAtIso: string, now: number = Date.now()): boolean {
  return now < new Date(lockAtIso).getTime();
}

export type StakeLike = {
  profile_id: string;
  side: string;
  bottles: number;
};

function toStakes(rows: StakeLike[], side: ChallengeSide): BeerStake[] {
  return rows
    .filter((row) => row.side === side)
    .map((row) => ({ id: row.profile_id, bottles: row.bottles }));
}

/**
 * ผลแบ่งเบียร์ของคำท้าใบหนึ่ง
 * ยังไม่ตัดสินก็ยังไม่มีใครได้ใครเสีย คืนผลเปล่าไปเลย
 */
export function challengePayouts(
  status: ChallengeStatus,
  stakes: StakeLike[],
): BeerSplit {
  if (!isSettled(status)) return { pot: 0, winners: [], losers: [] };

  const reach = toStakes(stakes, "reach");
  const miss = toStakes(stakes, "miss");

  return status === "reached"
    ? splitBeer(reach, miss)
    : splitBeer(miss, reach);
}
