"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { NICKNAME_MAX, NICKNAME_MIN } from "@/lib/club-limits";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProfileStatus } from "@/lib/supabase/types";

/**
 * กลับไปหน้าแอดมินพร้อมข้อความ
 *
 * ใช้ query string แทน useActionState เพราะหน้านี้มีฟอร์มเล็กๆ เต็มไปหมด
 * (หนึ่งฟอร์มต่อหนึ่งปุ่มต่อหนึ่งคน) การผูก state แยกทีละฟอร์มจะยุ่งกว่า
 * แบบนี้ยังทำงานได้แม้ JS ยังโหลดไม่เสร็จด้วย
 */
function backTo(message: string, isError: boolean): never {
  const key = isError ? "err" : "msg";
  redirect(`/club/admin?${key}=${encodeURIComponent(message)}`);
}

export async function setStatusAction(formData: FormData) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id) backTo("ไม่รู้ว่าจะแก้ของใคร", true);
  if (!isProfileStatus(status)) backTo("สถานะไม่ถูกต้อง", true);

  // กันแอดมินเผลอปิดประตูใส่ตัวเอง ถ้าเป็นแอดมินคนเดียวจะกู้คืนได้แค่ผ่าน
  // SQL Editor เท่านั้น
  if (id === admin.userId && status !== "approved") {
    backTo("เปลี่ยนสถานะตัวเองแบบนั้นไม่ได้ เดี๋ยวล็อกตัวเองออกจากระบบ", true);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id);

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club/admin");
  backTo("อัปเดตสถานะแล้ว", false);
}

export async function setAdminAction(formData: FormData) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const makeAdmin = String(formData.get("is_admin") ?? "") === "true";

  if (!id) backTo("ไม่รู้ว่าจะแก้ของใคร", true);

  if (id === admin.userId && !makeAdmin) {
    backTo("ถอดสิทธิ์แอดมินของตัวเองไม่ได้ ให้ตั้งคนอื่นเป็นแอดมินก่อน", true);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: makeAdmin })
    .eq("id", id);

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club/admin");
  backTo(makeAdmin ? "ตั้งเป็นแอดมินแล้ว" : "ถอดสิทธิ์แอดมินแล้ว", false);
}

export async function setNicknameAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (!id) backTo("ไม่รู้ว่าจะแก้ของใคร", true);
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    backTo(`ชื่อต้องยาว ${NICKNAME_MIN} ถึง ${NICKNAME_MAX} ตัวอักษร`, true);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nickname })
    .eq("id", id);

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club/admin");
  backTo("เปลี่ยนชื่อแล้ว", false);
}
