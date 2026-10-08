"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth";
import { RULE_SUGGESTION_MAX } from "@/lib/rule-suggestion-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ข้อเสนอแก้กติกาเดือนหน้า
 *
 * ไม่รับ id ของคนเขียนจากเบราว์เซอร์ ฐานข้อมูลหยิบจาก auth.uid() เองและเช็ก
 * สิทธิ์ซ้ำข้างใน ที่นี่แค่แปลง error เป็นภาษาคนแล้วสั่งให้หน้ารีเฟรช
 */

export type SuggestionResult = { ok: boolean; error: string | null };

function refresh() {
  revalidatePath("/club");
}

export async function addRuleSuggestionAction(
  body: string,
): Promise<SuggestionResult> {
  await requireApproved();

  const clean = body.trim();
  if (!clean) return { ok: false, error: "พิมพ์ข้อเสนอก่อนนะ" };
  if (clean.length > RULE_SUGGESTION_MAX) {
    return {
      ok: false,
      error: `ข้อเสนอยาวเกิน ${RULE_SUGGESTION_MAX} ตัวอักษร`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("rule_suggestion_add", {
    p_body: clean,
  });

  if (error) return { ok: false, error: toThaiDbError(error) };

  refresh();
  return { ok: true, error: null };
}

export async function deleteRuleSuggestionAction(formData: FormData) {
  await requireApproved();

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("rule_suggestion_delete", {
    p_id: String(formData.get("suggestion_id") ?? ""),
  });

  refresh();
}

/** on = "true" คือกด 👍 "false" คือเอาออก ส่งค่าที่อยากให้เป็น ไม่ใช่สั่งสลับ */
export async function voteRuleSuggestionAction(formData: FormData) {
  await requireApproved();

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("rule_suggestion_vote", {
    p_id: String(formData.get("suggestion_id") ?? ""),
    p_on: formData.get("on") === "true",
  });

  refresh();
}
