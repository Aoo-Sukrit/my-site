import { formatKm, formatPercent } from "./date";

/**
 * กติกาของระบบรางวัล
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งจาก
 * Server Component และจากฟอร์มฝั่งเบราว์เซอร์ เหมือน run-rules.ts
 * และ target-rules.ts
 *
 * ตัวบังคับจริงคือ constraint กับ trigger ใน
 * supabase/migrations/20260930120000_prizes.sql
 */

export type PrizeBoard = "distance" | "percent";

export const PRIZE_TITLE_MAX = 60;
export const PRIZE_DETAIL_MAX = 200;
export const PRIZE_EDIT_WINDOW_HOURS = 24;

/** อันดับที่เลือกได้ 1 ถึง 10 ส่วนอันดับสุดท้ายเป็นตัวเลือกแยก */
export const PRIZE_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const BOARD_LABEL: Record<PrizeBoard, string> = {
  distance: "ระยะรวม",
  percent: "% ของเป้า",
};

export function isPrizeBoard(value: unknown): value is PrizeBoard {
  return value === "distance" || value === "percent";
}

export function rankLabel(rankNo: number | null, isLast: boolean): string {
  return isLast ? "อันดับสุดท้าย" : `อันดับ ${rankNo}`;
}

/** ป้ายบนการ์ด เช่น "อันดับ 1 · ระยะรวม" */
export function slotLabel(
  board: PrizeBoard,
  rankNo: number | null,
  isLast: boolean,
): string {
  return `${rankLabel(rankNo, isLast)} · ${BOARD_LABEL[board]}`;
}

export type RuleCheck = { ok: true } | { ok: false; reason: string };

export function checkPrizeTitle(value: string): RuleCheck {
  const title = value.trim();
  if (title.length === 0) {
    return { ok: false, reason: "ใส่ชื่อของรางวัลด้วย" };
  }
  if (title.length > PRIZE_TITLE_MAX) {
    return {
      ok: false,
      reason: `ชื่อของรางวัลยาวเกิน ${PRIZE_TITLE_MAX} ตัวอักษร`,
    };
  }
  return { ok: true };
}

export function checkPrizeDetail(value: string): RuleCheck {
  if (value.trim().length > PRIZE_DETAIL_MAX) {
    return {
      ok: false,
      reason: `รายละเอียดยาวเกิน ${PRIZE_DETAIL_MAX} ตัวอักษร`,
    };
  }
  return { ok: true };
}

/**
 * ยังอยู่ในช่วง 24 ชั่วโมงที่แก้หรือลบได้ไหม
 * ใช้ตัดสินแค่ว่าจะโชว์ปุ่มหรือเปล่า ตัวบังคับจริงคือ trigger ในฐานข้อมูล
 */
export function withinPrizeEditWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return Date.now() - created < PRIZE_EDIT_WINDOW_HOURS * 60 * 60 * 1000;
}

export function hoursLeftToEditPrize(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const msLeft =
    created + PRIZE_EDIT_WINDOW_HOURS * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));
}

// ---------------------------------------------------------------------------
//  "ตอนนี้เป็นของใคร"
// ---------------------------------------------------------------------------

/**
 * แถวจากกระดานที่แปลงให้อยู่ในรูปเดียวกัน ไม่ว่าจะมาจากกระดานไหน
 * eligible แปลว่ามีผลงานพอจะนับเป็นเจ้าของอันดับได้จริง
 * กระดานระยะรวมคือกรอกผลวิ่งแล้ว กระดาน % คือตั้งเป้าแล้ว
 */
/**
 * ช่วงเวลาของรางวัล สามช่วง
 *   live    ยังอยู่ในเดือน ใครนำอยู่ก็ยังพลิกได้
 *   waiting เดือนจบแล้ว แต่ยังกรอกผลวิ่งย้อนหลังได้ คนถือรางวัลยังเปลี่ยนได้
 *   final   พ้นเวลากรอกย้อนหลังแล้ว ตัวเลขนิ่ง ของเป็นของคนนั้นจริง
 *
 * เคยเป็นบั๊ก การ์ดพลิกเป็น "ได้ไปแล้ว" ตั้งแต่วินาทีที่เดือนจบ
 * ทั้งที่อีกสามวันยังมีคนกรอกผลย้อนหลังเข้ามาแซงได้
 *
 * เวลาทั้งสองค่ามาจาก round_deadlines() ฝั่งฐานข้อมูล ซึ่งคำนวณจาก
 * backdate_grace_days() ที่เดียว ไฟล์นี้จึงไม่มีเลข 4 อยู่เลย
 */
export type HolderPhase = "live" | "waiting" | "final";

export function holderPhase(
  monthEndIso: string,
  settleAtIso: string,
  now: number = Date.now(),
): HolderPhase {
  if (now < new Date(monthEndIso).getTime()) return "live";
  if (now < new Date(settleAtIso).getTime()) return "waiting";
  return "final";
}

export type HolderRow = {
  memberId: string;
  nickname: string;
  avatarUrl: string | null;
  rankNo: number;
  valueLabel: string;
  eligible: boolean;
};

export function toDistanceHolders(
  rows: {
    member_id: string;
    nickname: string;
    avatar_url: string | null;
    total_km: string;
    rank_no: number;
  }[],
): HolderRow[] {
  return rows.map((row) => ({
    memberId: row.member_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    rankNo: row.rank_no,
    valueLabel: `${formatKm(row.total_km)} กม.`,
    eligible: Number(row.total_km) > 0,
  }));
}

export function toPercentHolders(
  rows: {
    member_id: string;
    nickname: string;
    avatar_url: string | null;
    percent: string | null;
    rank_no: number;
  }[],
): HolderRow[] {
  return rows.map((row) => ({
    memberId: row.member_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    rankNo: row.rank_no,
    valueLabel: formatPercent(row.percent),
    eligible: row.percent !== null,
  }));
}

/**
 * ใครครองอันดับนี้อยู่ คืนทุกคนที่เสมอกัน
 *
 * นับเฉพาะคนที่ eligible เพราะถ้าไม่กรองแล้วมีคนวิ่งแค่สองคน
 * "อันดับ 3" จะกลายเป็นกองคนที่ได้ 0 กม. ซึ่งไม่ใช่เจ้าของอันดับจริง
 * ไม่มีใครเข้าเงื่อนไขก็คืนอาร์เรย์ว่าง แล้วหน้าเว็บเขียนว่า "ยังไม่มีใคร"
 */
export function findHolders(
  rows: HolderRow[],
  rankNo: number | null,
  isLast: boolean,
): HolderRow[] {
  const eligible = rows.filter((row) => row.eligible);
  if (eligible.length === 0) return [];

  if (isLast) {
    const lastRank = Math.max(...eligible.map((row) => row.rankNo));
    return eligible.filter((row) => row.rankNo === lastRank);
  }

  return eligible.filter((row) => row.rankNo === rankNo);
}
