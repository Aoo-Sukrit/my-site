"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { fromBangkokInputValue, thaiMonthLabel } from "@/lib/date";
import { getCurrentRound, getRoundByMonth } from "@/lib/runs";
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


// ---------------------------------------------------------------------------
//  เกมตั้งเป้า (supabase/migrations/20260925000006_targets.sql)
// ---------------------------------------------------------------------------

/**
 * แก้ช่วงเวลาตั้งเป้าของรอบเดือนปัจจุบัน
 *
 * update ตาราง rounds ตรงๆ ได้เลย ไม่ต้องมี RPC เพราะ policy
 * rounds_update_admin จาก supabase/migrations/20260925000003_runs.sql เปิดให้แอดมินแก้อยู่แล้ว
 *
 * ค่าที่รับมาจาก <input type="datetime-local"> ไม่มีโซนเวลาติดมา
 * ต้องตีความเป็นเวลาไทยเสมอ ไม่ใช่เวลาของเครื่องที่แอดมินเปิดอยู่
 */
export async function setRoundWindowAction(formData: FormData) {
  await requireAdmin();

  const opensAt = fromBangkokInputValue(String(formData.get("opens_at") ?? ""));
  const locksAt = fromBangkokInputValue(String(formData.get("locks_at") ?? ""));

  if (!opensAt || !locksAt) {
    backTo("รูปแบบวันเวลาไม่ถูกต้อง", true);
  }
  if (new Date(locksAt) <= new Date(opensAt)) {
    backTo("เวลาปิดต้องอยู่หลังเวลาเปิด", true);
  }

  const round = await getCurrentRound();
  if (!round) backTo("ไม่เจอรอบของเดือนนี้", true);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rounds")
    .update({ target_opens_at: opensAt, target_locks_at: locksAt })
    .eq("id", round.id);

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club");
  revalidatePath("/club/target");
  revalidatePath("/club/admin");
  backTo("อัปเดตช่วงเวลาตั้งเป้าแล้ว", false);
}

/** ลบเป้าและโหวตที่คนอื่นกดให้สมาชิกคนนี้ ในรอบเดือนปัจจุบัน */
export async function resetTargetAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) backTo("ไม่รู้ว่าจะรีเซ็ตของใคร", true);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_reset_target", { subject: id });

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club");
  revalidatePath("/club/target");
  revalidatePath("/club/admin");
  backTo("รีเซ็ตเป้าของสมาชิกคนนี้แล้ว", false);
}

/** ล้างเป้าและโหวตทั้งรอบ ไว้เคลียร์ข้อมูลทดสอบ ไม่ยุ่งกับผลวิ่ง */
export async function clearRoundTargetsAction(formData: FormData) {
  await requireAdmin();

  const round = await getCurrentRound();
  if (!round) backTo("ไม่เจอรอบของเดือนนี้", true);

  // ต้องพิมพ์ชื่อเดือนให้ตรงก่อน กันกดพลาดแล้วข้อมูลทั้งรอบหายไป
  const typed = String(formData.get("confirm") ?? "").trim();
  const expected = thaiMonthLabel(round.month);
  if (typed !== expected) {
    backTo(`ต้องพิมพ์ว่า "${expected}" ให้ตรงก่อนถึงจะล้างได้`, true);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_clear_round_targets");

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club");
  revalidatePath("/club/target");
  revalidatePath("/club/admin");
  backTo("ล้างเป้าและโหวตทั้งรอบแล้ว ผลวิ่งไม่ถูกแตะ", false);
}

/**
 * เลื่อนเวลาตัดสินผลของรอบหนึ่ง
 *
 * rounds.results_at คุมสี่อย่างพร้อมกัน การกรอกผลย้อนหลัง การแก้ผลวิ่ง
 * การพลิกรางวัลเป็น "ได้ไปแล้ว" และการตัดสินคำท้า
 * เลื่อนหลังจากตัดสินไปแล้วจึงทำให้ผลรางวัลกับคำท้ากลับมาเปลี่ยนได้อีก
 * ซึ่งตั้งใจให้เป็นแบบนั้น เผื่อมีคนกรอกผลไม่ทันจริงๆ
 *
 * ตัวบังคับว่าต้องอยู่หลังสิ้นเดือนอยู่ที่ trigger rounds_guard ในฐานข้อมูล
 */
export async function setResultsAtAction(formData: FormData) {
  await requireAdmin();

  const monthKey = String(formData.get("month") ?? "");
  const resultsAt = fromBangkokInputValue(
    String(formData.get("results_at") ?? ""),
  );

  if (!/^\d{4}-\d{2}$/.test(monthKey)) backTo("ไม่รู้ว่าจะแก้รอบเดือนไหน", true);
  if (!resultsAt) backTo("รูปแบบวันเวลาไม่ถูกต้อง", true);

  const round = await getRoundByMonth(monthKey);
  if (!round) backTo("ไม่เจอรอบของเดือนนั้น", true);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rounds")
    .update({ results_at: resultsAt })
    .eq("id", round.id);

  if (error) backTo(toThaiDbError(error), true);

  revalidatePath("/club");
  revalidatePath("/club/admin");
  revalidatePath("/club/run/new");
  backTo(
    `ตั้งเวลาตัดสินผลของเดือน${thaiMonthLabel(round.month)}แล้ว`,
    false,
  );
}
