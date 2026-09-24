"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth";
import { NICKNAME_MAX, NICKNAME_MIN } from "@/lib/club-limits";
import { toThaiDbError } from "@/lib/supabase/errors";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NicknameState = { error: string | null; ok: boolean };

export async function updateNicknameAction(
  _prev: NicknameState,
  formData: FormData,
): Promise<NicknameState> {
  const viewer = await requireApproved();
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return {
      error: `ฉายาต้องยาว ${NICKNAME_MIN} ถึง ${NICKNAME_MAX} ตัวอักษร`,
      ok: false,
    };
  }

  if (nickname === viewer.profile.nickname) {
    return { error: null, ok: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nickname })
    .eq("id", viewer.userId);

  if (error) return { error: toThaiDbError(error), ok: false };

  revalidatePath("/club/me");
  revalidatePath("/club/admin");
  return { error: null, ok: true };
}

export type AvatarState = { error: string | null; ok: boolean };

/**
 * บันทึก URL รูปที่เพิ่งอัปขึ้น Storage
 *
 * Server Action ถูกยิงตรงด้วย POST ได้ จึงรับ URL มาเฉยๆ ไม่ได้
 * ต้องยืนยันว่าเป็นไฟล์ในบัคเก็ต avatars ใต้โฟลเดอร์ของคนคนนั้นจริง
 * ไม่งั้นใครก็ยัด URL อะไรก็ได้เข้ามาเป็นรูปโปรไฟล์
 */
export async function saveAvatarUrlAction(
  publicUrl: string,
): Promise<AvatarState> {
  const viewer = await requireApproved();
  const { url } = readSupabaseEnv();

  const expectedPrefix = `${url}/storage/v1/object/public/avatars/${viewer.userId}/`;
  if (!publicUrl.startsWith(expectedPrefix)) {
    return { error: "ที่อยู่ของรูปไม่ถูกต้อง", ok: false };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", viewer.userId);

  if (error) return { error: toThaiDbError(error), ok: false };

  revalidatePath("/club/me");
  revalidatePath("/club/admin");
  return { error: null, ok: true };
}
