"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth";
import { checkTargetKm, checkVoteDelta } from "@/lib/target-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TargetActionResult = { error: string | null; ok: boolean };

function refreshTargetPages() {
  revalidatePath("/club");
  revalidatePath("/club/target");
}

/**
 * ตั้งเป้าของเดือนนี้ ตั้งได้ครั้งเดียว
 *
 * เช็กฝั่งนี้เพื่อให้ข้อความอ่านง่าย แต่ตัวบังคับจริงคือฟังก์ชัน
 * set_my_target() ในฐานข้อมูล ซึ่งเช็กทั้งสถานะสมาชิก ช่วงเวลาของรอบ
 * และความซ้ำอีกชั้น Server Action ถูกยิงตรงด้วย POST ได้
 */
export async function setTargetAction(
  _prev: TargetActionResult,
  formData: FormData,
): Promise<TargetActionResult> {
  await requireApproved();

  const raw = String(formData.get("base_km") ?? "").trim();
  const check = checkTargetKm(raw);
  if (!check.ok) return { error: check.reason, ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_my_target", {
    km: Number(raw),
  });

  if (error) return { error: toThaiDbError(error), ok: false };

  refreshTargetPages();
  return { error: null, ok: true };
}

/**
 * โหวตปรับเป้าของเพื่อน กดแล้วแก้ไม่ได้
 * ใช้เป็น form action คู่กับปุ่มยืนยันสองจังหวะ
 */
export async function voteAction(
  _prev: TargetActionResult,
  formData: FormData,
): Promise<TargetActionResult> {
  await requireApproved();

  const subject = String(formData.get("subject") ?? "");
  const delta = Number(formData.get("delta") ?? Number.NaN);

  if (!subject) return { error: "ไม่รู้ว่าจะโหวตให้ใคร", ok: false };

  const check = checkVoteDelta(delta);
  if (!check.ok) return { error: check.reason, ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("vote_on_target", { subject, delta });

  if (error) return { error: toThaiDbError(error), ok: false };

  refreshTargetPages();
  return { error: null, ok: true };
}
