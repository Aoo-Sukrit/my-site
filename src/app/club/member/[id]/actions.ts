"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WALL_BODY_MAX } from "@/lib/wall-rules";

/**
 * กระดานแซว
 *
 * ทั้งสามท่าไม่รับ id ของคนเขียนจากฝั่งเบราว์เซอร์เลย ฐานข้อมูลหยิบจาก
 * auth.uid() เอง และตรวจสิทธิ์ซ้ำอีกชั้นข้างใน ที่นี่จึงเป็นแค่ทางผ่าน
 * ที่คอยแปลง error ให้เป็นภาษาคนกับสั่งให้หน้ารีเฟรช
 */

export type WallResult = { ok: boolean; error: string | null };

function refresh(ownerId: string) {
  revalidatePath(`/club/member/${ownerId}`);
}

export async function addWallMessageAction(
  ownerId: string,
  body: string,
): Promise<WallResult> {
  await requireApproved();

  const clean = body.trim();
  if (!clean) return { ok: false, error: "พิมพ์ข้อความก่อนนะ" };
  if (clean.length > WALL_BODY_MAX) {
    return { ok: false, error: `ข้อความยาวเกิน ${WALL_BODY_MAX} ตัวอักษร` };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("member_wall_add", {
    p_owner: ownerId,
    p_body: clean,
  });

  if (error) return { ok: false, error: toThaiDbError(error) };

  refresh(ownerId);
  return { ok: true, error: null };
}

export async function deleteWallMessageAction(formData: FormData) {
  await requireApproved();

  const id = String(formData.get("message_id") ?? "");
  const ownerId = String(formData.get("owner_id") ?? "");

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("member_wall_delete", { p_id: id });

  refresh(ownerId);
}

export async function toggleWallHiddenAction(formData: FormData) {
  await requireApproved();

  const id = String(formData.get("message_id") ?? "");
  const ownerId = String(formData.get("owner_id") ?? "");
  const hidden = formData.get("hidden") === "true";

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("member_wall_set_hidden", {
    p_id: id,
    p_hidden: hidden,
  });

  refresh(ownerId);
}
