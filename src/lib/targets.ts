import { createSupabaseServerClient } from "./supabase/server";
import type {
  MyTargetState,
  MyVote,
  PercentRow,
  RoundTargetRow,
  VotableMember,
  VoteBreakdownRow,
} from "./supabase/types";

/**
 * ทุกอย่างในไฟล์นี้เรียกผ่าน RPC ไม่มีการ select ตาราง targets หรือ
 * target_votes ตรงๆ เลย เพราะสองตารางนั้นถูกถอนสิทธิ์ทั้งหมดใน
 * supabase/migrations/20260925000006_targets.sql เพื่อให้การปิดตาบังคับอยู่ที่ฐานข้อมูล
 * ไม่ใช่แค่ซ่อนในหน้าเว็บ
 *
 * ฟังก์ชันฝั่งฐานข้อมูลเป็นคนตัดสินเองว่าช่วงเวลาไหนคืนอะไรได้บ้าง
 * ฝั่งนี้แค่เอาผลมาแสดง
 */

export async function getMyTargetState(): Promise<MyTargetState | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_target_state");

  const rows = (data ?? []) as MyTargetState[];
  return rows[0] ?? null;
}

export async function getVotableMembers(): Promise<VotableMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("votable_members");
  return (data ?? []) as VotableMember[];
}

export async function getMyVotes(): Promise<MyVote[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_votes");
  return (data ?? []) as MyVote[];
}

/** ก่อนถึงเวลาเปิดผล ฝั่งฐานข้อมูลคืน 0 แถวเสมอ ไม่ว่าใครเรียก */
export async function getRoundTargets(
  monthKey?: string,
): Promise<RoundTargetRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_targets", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as RoundTargetRow[];
}

/** ก่อนถึงเวลาเปิดผล ฝั่งฐานข้อมูลคืน 0 แถวเสมอ ไม่ว่าใครเรียก */
export async function getPercentBoard(
  monthKey?: string,
): Promise<PercentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("month_percent_board", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as PercentRow[];
}

/** ก่อนถึงเวลาเปิดผล ฝั่งฐานข้อมูลคืน 0 แถวเสมอ เหมือน round_targets() */
export async function getVoteBreakdown(
  monthKey?: string,
): Promise<VoteBreakdownRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_vote_breakdown", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as VoteBreakdownRow[];
}
