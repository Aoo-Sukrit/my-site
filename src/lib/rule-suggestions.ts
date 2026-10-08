import { createSupabaseServerClient } from "./supabase/server";
import type { RuleSuggestion } from "./supabase/types";

/**
 * ข้อเสนอแก้กติกาเดือนหน้า ท้ายแท็บคำท้า
 *
 * ดึงผ่าน RPC เท่านั้น ตารางถูกปิดสิทธิ์ไว้เหมือนตารางอื่น ฐานข้อมูลคืนมาเฉพาะ
 * ของเดือนปัจจุบัน เรียง 👍 เยอะสุดไว้บนแล้ว
 *
 * ระบบแค่เก็บข้อเสนอกับนับ 👍 ไม่ได้เปลี่ยนกติกาอะไรเอง เจ้าของเว็บดูแล้วไปแก้เอง
 */

export async function getRuleSuggestions(): Promise<RuleSuggestion[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("rule_suggestions_list");
  return (data ?? []) as RuleSuggestion[];
}
