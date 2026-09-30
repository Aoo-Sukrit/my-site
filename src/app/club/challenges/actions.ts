"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth";
import {
  checkBottles,
  checkTargetKm,
  isChallengeSide,
} from "@/lib/challenge-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ทุกการกระทำกับคำท้าเดินผ่านฟังก์ชัน security definer ในฐานข้อมูล
 * ที่เช็กกติกาครบทุกข้อเองอีกรอบ ตรงนี้เช็กก่อนแค่เพื่อให้ข้อความขึ้นเร็ว
 */

export type ChallengeActionResult = { error: string | null; ok: boolean };

function refresh() {
  revalidatePath("/club");
  revalidatePath("/club/admin");
}

const REWARDS = "/club?board=rewards";

/** ต่อ query string ให้ถูกไม่ว่า back จะมี ? อยู่แล้วหรือไม่ */
function withParam(back: string, key: string, value: string) {
  const separator = back.includes("?") ? "&" : "?";
  return `${back}${separator}${key}=${encodeURIComponent(value)}`;
}

export type NewChallengeValues = {
  runnerId: string;
  targetKm: string;
  bottles: string;
  /** ระยะรวมของคนถูกท้าที่หน้าเว็บเห็นตอนกรอก ใช้เตือนล่วงหน้าเท่านั้น */
  currentKm: number;
};

export async function createChallengeAction(
  values: NewChallengeValues,
): Promise<ChallengeActionResult> {
  await requireApproved();

  if (!values.runnerId) return { error: "เลือกคนที่จะท้าก่อน", ok: false };

  const target = checkTargetKm(values.targetKm, values.currentKm);
  if (!target.ok) return { error: target.reason, ok: false };

  const bottles = checkBottles(values.bottles);
  if (!bottles.ok) return { error: bottles.reason, ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_challenge", {
    p_runner_id: values.runnerId,
    p_target_km: Number(values.targetKm),
    p_bottles: Number(values.bottles),
  });

  if (error) return { error: toThaiDbError(error), ok: false };

  refresh();
  return { error: null, ok: true };
}

/** ใช้เป็น form action คู่กับปุ่มยืนยันสองจังหวะ */
async function runChallengeRpc(
  formData: FormData,
  fn: "accept_challenge" | "decline_challenge" | "cancel_challenge",
  doneMessage: string,
) {
  await requireApproved();

  const challengeId = String(formData.get("challenge_id") ?? "");
  const back = String(formData.get("back") ?? REWARDS);

  if (!challengeId) {
    redirect(withParam(back, "err", "ไม่รู้ว่าเป็นคำท้าใบไหน"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(fn, { p_challenge_id: challengeId });

  if (error) redirect(withParam(back, "err", toThaiDbError(error)));

  refresh();
  redirect(withParam(back, "msg", doneMessage));
}

export async function acceptChallengeAction(formData: FormData) {
  await runChallengeRpc(formData, "accept_challenge", "รับคำท้าแล้ว เริ่มเลย");
}

export async function declineChallengeAction(formData: FormData) {
  await runChallengeRpc(formData, "decline_challenge", "ปฏิเสธคำท้าแล้ว");
}

export async function cancelChallengeAction(formData: FormData) {
  await runChallengeRpc(formData, "cancel_challenge", "ยกเลิกคำท้าแล้ว");
}

export async function joinChallengeAction(formData: FormData) {
  await requireApproved();

  const challengeId = String(formData.get("challenge_id") ?? "");
  const side = String(formData.get("side") ?? "");
  const bottles = String(formData.get("bottles") ?? "");
  const back = String(formData.get("back") ?? REWARDS);

  if (!challengeId) {
    redirect(withParam(back, "err", "ไม่รู้ว่าเป็นคำท้าใบไหน"));
  }
  if (!isChallengeSide(side)) {
    redirect(withParam(back, "err", "เลือกข้างก่อนว่าถึงแน่หรือไม่ถึงแน่"));
  }

  const check = checkBottles(bottles);
  if (!check.ok) redirect(withParam(back, "err", check.reason));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("join_challenge", {
    p_challenge_id: challengeId,
    p_side: side,
    p_bottles: Number(bottles),
  });

  if (error) redirect(withParam(back, "err", toThaiDbError(error)));

  refresh();
  redirect(withParam(back, "msg", "วางเบียร์แล้ว ถอนไม่ได้นะ"));
}

/** แอดมินลบคำท้าทั้งใบ เบียร์ที่วางไว้หายตามไปด้วย */
export async function adminDeleteChallengeAction(formData: FormData) {
  await requireApproved();

  const challengeId = String(formData.get("challenge_id") ?? "");
  const back = String(formData.get("back") ?? "/club/admin");

  if (!challengeId) {
    redirect(withParam(back, "err", "ไม่รู้ว่าจะลบใบไหน"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_delete_challenge", {
    p_challenge_id: challengeId,
  });

  if (error) redirect(withParam(back, "err", toThaiDbError(error)));

  refresh();
  redirect(withParam(back, "msg", "ลบคำท้าแล้ว"));
}
