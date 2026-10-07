import { sharePerPerson, splitPot, type BeerSplit } from "./beer-split";

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

/** คนท้าวางกองตั้งต้นได้ 1 ถึง 12 ขวด */
export const BOTTLE_MIN = 1;
export const BOTTLE_MAX = 12;

/**
 * เพื่อนเติมกองได้คนละ 0 ถึง 3 ขวด (0 = ร่วมหุ้นเฉยๆ)
 * ต้องตรงกับ challenge_add_max() ในฐานข้อมูล
 */
export const JOIN_ADD_MAX = 3;

/**
 * ไม่มีใครจ่ายหรือรับเกินกี่ขวดต่อคน
 * ต้องตรงกับ challenge_share_cap() ในฐานข้อมูล
 */
export const SHARE_CAP = 24;

/** ตัวเลือกจำนวนขวดตอนท้า 1 ถึง 12 */
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

/** ทั้งกอง = ผลรวมที่ทุกคนใส่ไว้ (คนท้า + ที่เพื่อนเติม) */
export function potOf(stakes: StakeLike[]): number {
  return stakes.reduce((total, stake) => total + stake.bottles, 0);
}

export function sideCount(stakes: StakeLike[], side: ChallengeSide): number {
  return stakes.filter((stake) => stake.side === side).length;
}

/**
 * ถ้ามีคนเข้าฝั่ง side พร้อมเติม add ขวด ยังไม่เกินเพดานต่อคนใช่ไหม
 * คิดแบบเดียวกับ challenge_share_ok() ในฐานข้อมูลเป๊ะๆ
 */
function shareOk(stakes: StakeLike[], side: ChallengeSide, add: number): boolean {
  const reach = sideCount(stakes, "reach") + (side === "reach" ? 1 : 0);
  const miss = sideCount(stakes, "miss") + (side === "miss" ? 1 : 0);
  const fewest = Math.min(reach, miss);
  if (fewest === 0) return true;
  return (potOf(stakes) + add) / fewest <= SHARE_CAP;
}

/**
 * เข้าฝั่งนี้แล้วเติมได้มากสุดกี่ขวด (0 ถึง 3)
 * ใช้จำกัดตัวเลือกในปุ่มเข้าร่วม ไม่ให้คนกดแล้วโดนฐานข้อมูลปฏิเสธ
 * คืน 0 เมื่อเติมไม่ได้แล้ว ซึ่งยังร่วมหุ้น +0 ได้เสมอ
 */
export function maxAddFor(stakes: StakeLike[], side: ChallengeSide): number {
  for (let add = JOIN_ADD_MAX; add > 0; add--) {
    if (shareOk(stakes, side, add)) return add;
  }
  return 0;
}

export function checkAdd(value: string | number): Check {
  const add = typeof value === "number" ? value : Number(value);
  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, reason: "เลือกก่อนว่าจะเติมกี่ขวด" };
  }
  if (!Number.isInteger(add) || add < 0 || add > JOIN_ADD_MAX) {
    return { ok: false, reason: `เติมกองได้ตั้งแต่ 0 ถึง ${JOIN_ADD_MAX} ขวด` };
  }
  return { ok: true };
}

/**
 * ถ้าฝั่ง winner ชนะ แต่ละคนฝั่งชนะได้เท่าไหร่ และฝั่งแพ้เสียคนละเท่าไหร่
 * ใช้โชว์พรีวิวบนการ์ดก่อนตัดสิน
 */
export function previewIfWins(stakes: StakeLike[], winner: ChallengeSide) {
  const loser: ChallengeSide = winner === "reach" ? "miss" : "reach";
  const pot = potOf(stakes);
  return {
    gain: sharePerPerson(pot, sideCount(stakes, winner)),
    loss: sharePerPerson(pot, sideCount(stakes, loser)),
  };
}

function idsOf(rows: StakeLike[], side: ChallengeSide): string[] {
  return rows.filter((row) => row.side === side).map((row) => row.profile_id);
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

  const pot = potOf(stakes);
  const reach = idsOf(stakes, "reach");
  const miss = idsOf(stakes, "miss");

  return status === "reached"
    ? splitPot(pot, reach, miss)
    : splitPot(pot, miss, reach);
}
