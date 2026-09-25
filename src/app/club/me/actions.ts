"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth";
import {
  ABOUT_MAX,
  CAPTION_MAX,
  NICKNAME_MAX,
  NICKNAME_MIN,
} from "@/lib/club-limits";
import { toThaiDbError } from "@/lib/supabase/errors";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileState = { error: string | null; ok: boolean };

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await requireApproved();

  const nickname = String(formData.get("nickname") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();

  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return {
      error: `ชื่อต้องยาว ${NICKNAME_MIN} ถึง ${NICKNAME_MAX} ตัวอักษร`,
      ok: false,
    };
  }
  // นับเป็นตัวอักษรเหมือนกับ char_length ฝั่งฐานข้อมูล ไม่ใช่นับไบต์
  if (caption.length > CAPTION_MAX) {
    return { error: `แคปชั่นยาวเกิน ${CAPTION_MAX} ตัวอักษร`, ok: false };
  }
  if (about.length > ABOUT_MAX) {
    return { error: `เกี่ยวกับยาวเกิน ${ABOUT_MAX} ตัวอักษร`, ok: false };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nickname,
      // เก็บช่องว่างเป็น null ไม่ใช่สตริงว่าง หน้าอื่นจะได้เช็กง่ายว่ามีไหม
      caption: caption || null,
      about: about || null,
    })
    .eq("id", viewer.userId);

  if (error) return { error: toThaiDbError(error), ok: false };

  revalidatePath("/club");
  revalidatePath("/club/me");
  revalidatePath(`/club/member/${viewer.userId}`);
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

  revalidatePath("/club");
  revalidatePath("/club/me");
  revalidatePath(`/club/member/${viewer.userId}`);
  revalidatePath("/club/admin");
  return { error: null, ok: true };
}
