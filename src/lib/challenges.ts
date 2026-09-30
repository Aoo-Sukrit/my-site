import { createSupabaseServerClient } from "./supabase/server";
import type {
  ChallengeRow,
  ChallengeStakeRow,
  ChallengeableMember,
  RoundDeadlines,
} from "./supabase/types";

/**
 * ข้อมูลคำท้า ดึงผ่าน RPC เท่านั้น
 *
 * ตาราง challenges กับ challenge_stakes ถูกถอนสิทธิ์จาก anon และ
 * authenticated ไปหมดแล้ว ไม่ใช่เพราะข้อมูลเป็นความลับ (คำท้าเปิดให้ทุกคนเห็น
 * ตลอด) แต่เพราะถ้าเปิด insert/update ตรงได้ ใครก็ข้ามกติกาเวลาได้ทันที
 */

/**
 * เวลาสำคัญของรอบเดือนนี้
 *
 * นี่คือทางเดียวที่หน้าเว็บรู้ว่า "ปิดรับวันไหน" กับ "ตัดสินวันไหน"
 * เลข 20 กับเลข 4 อยู่ในฐานข้อมูลที่เดียว หน้าเว็บไม่ได้ก๊อปมาเขียนซ้ำ
 */
export async function getRoundDeadlines(
  monthKey?: string,
): Promise<RoundDeadlines | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_deadlines", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  const rows = (data ?? []) as RoundDeadlines[];
  return rows[0] ?? null;
}

export async function getRoundChallenges(
  monthKey?: string,
): Promise<ChallengeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_challenges", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as ChallengeRow[];
}

export async function getRoundChallengeStakes(
  monthKey?: string,
): Promise<ChallengeStakeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_challenge_stakes", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as ChallengeStakeRow[];
}

/** จับเบียร์ทุกก้อนเข้ากลุ่มตามคำท้า เรียงตามเวลาที่ลง */
export function stakesByChallenge(
  rows: ChallengeStakeRow[],
): Map<string, ChallengeStakeRow[]> {
  const grouped = new Map<string, ChallengeStakeRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.challenge_id);
    if (list) list.push(row);
    else grouped.set(row.challenge_id, [row]);
  }
  return grouped;
}

export async function getChallengeableMembers(): Promise<
  ChallengeableMember[]
> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("challengeable_members");
  return (data ?? []) as ChallengeableMember[];
}

/** คำท้าที่รอเรากดรับอยู่ ใช้ขึ้นแถบเตือนบนหน้า /club */
export function pendingForMe(rows: ChallengeRow[]): ChallengeRow[] {
  return rows.filter((row) => row.i_am_runner && row.status === "pending");
}
