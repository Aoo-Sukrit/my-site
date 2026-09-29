import type { VoteBreakdownRow } from "./supabase/types";

/**
 * สรุปรางวัลขำๆ จากรายการโหวตรายคู่
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งสองฝั่ง
 * และเขียนเทสได้ง่าย เหมือน run-rules.ts กับ target-rules.ts
 *
 * ข้อมูลที่รับเข้ามาเปิดได้เฉพาะหลังถึง target_locks_at อยู่แล้ว
 * เพราะ round_vote_breakdown() คืน 0 แถวก่อนหน้านั้น
 */

export type AwardWinner = {
  memberId: string;
  nickname: string;
  avatarUrl: string | null;
  /** ผลรวมที่ทำให้ชนะ บวกหรือลบตามประเภทรางวัล */
  total: number;
  /** จำนวนโหวตที่นับเข้ารางวัลนี้ ใช้ตัดสินตอนคะแนนเท่ากัน */
  voteCount: number;
};

type Tally = {
  memberId: string;
  nickname: string;
  avatarUrl: string | null;
  total: number;
  voteCount: number;
};

function collect(
  rows: VoteBreakdownRow[],
  side: "voter" | "subject",
  keep: (delta: number) => boolean,
): Tally[] {
  const byMember = new Map<string, Tally>();

  for (const row of rows) {
    if (!keep(row.delta)) continue;

    const memberId = side === "voter" ? row.voter_id : row.subject_id;
    const nickname =
      side === "voter" ? row.voter_nickname : row.subject_nickname;
    const avatarUrl =
      side === "voter" ? row.voter_avatar_url : row.subject_avatar_url;

    const current = byMember.get(memberId) ?? {
      memberId,
      nickname,
      avatarUrl,
      total: 0,
      voteCount: 0,
    };

    current.total += row.delta;
    current.voteCount += 1;
    byMember.set(memberId, current);
  }

  return [...byMember.values()];
}

/**
 * เลือกผู้ชนะ
 * คะแนนเท่ากันตัดสินด้วยจำนวนโหวตที่มากกว่า แล้วค่อยเรียงตามชื่อ
 * เพื่อให้ผลออกมาเหมือนเดิมทุกครั้ง ไม่ขึ้นกับลำดับแถวที่ฐานข้อมูลส่งมา
 */
function pickWinner(
  tallies: Tally[],
  better: (a: Tally, b: Tally) => number,
): AwardWinner | null {
  if (tallies.length === 0) return null;

  const sorted = [...tallies].sort((a, b) => {
    const byScore = better(a, b);
    if (byScore !== 0) return byScore;
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.nickname.localeCompare(b.nickname, "th");
  });

  return sorted[0];
}

/** คนที่กดบวกให้คนอื่นรวมมากที่สุด */
export function heaviestHand(rows: VoteBreakdownRow[]): AwardWinner | null {
  const tallies = collect(rows, "voter", (delta) => delta > 0);
  return pickWinner(tallies, (a, b) => b.total - a.total);
}

/** คนที่กดลบให้คนอื่นรวมมากที่สุด (ผลรวมติดลบมากสุด) */
export function kindestHeart(rows: VoteBreakdownRow[]): AwardWinner | null {
  const tallies = collect(rows, "voter", (delta) => delta < 0);
  return pickWinner(tallies, (a, b) => a.total - b.total);
}

/** คนที่เป้าโดนบวกรวมมากที่สุด */
export function mostPiledOn(rows: VoteBreakdownRow[]): AwardWinner | null {
  const tallies = collect(rows, "subject", (delta) => delta > 0);
  return pickWinner(tallies, (a, b) => b.total - a.total);
}

/** จัดกลุ่มโหวตตามคนที่โดน เพื่อเอาไปแสดงเป็นแถวรูปใต้ชื่อแต่ละคน */
export function votesBySubject(
  rows: VoteBreakdownRow[],
): Map<string, VoteBreakdownRow[]> {
  const grouped = new Map<string, VoteBreakdownRow[]>();

  for (const row of rows) {
    const list = grouped.get(row.subject_id) ?? [];
    list.push(row);
    grouped.set(row.subject_id, list);
  }

  return grouped;
}
