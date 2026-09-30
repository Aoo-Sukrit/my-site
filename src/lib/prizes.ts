import { createSupabaseServerClient } from "./supabase/server";
import type { PrizeRow } from "./supabase/types";

export const PRIZE_BUCKET = "prizes";

/**
 * รายการรางวัลของรอบเดือนปัจจุบัน
 *
 * เรียกผ่าน RPC เท่านั้น ตาราง prizes ถูกถอนสิทธิ์จาก anon และ authenticated
 * ไปหมดแล้ว ของที่ยังปิดอุบอยู่จะได้ title / detail / image_path เป็น null
 * กลับมาเอง เว้นแต่คนเรียกเป็นคนให้
 */
export async function getRoundPrizes(
  monthKey?: string,
): Promise<PrizeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_prizes", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as PrizeRow[];
}

/**
 * ลิงก์ชั่วคราวของรูปของรางวัล
 *
 * บัคเก็ต prizes เป็นแบบส่วนตัว และ policy อ่านไปถาม prize_image_visible()
 * อีกชั้นว่ารางวัลที่ใช้รูปนั้นเปิดให้คนนี้เห็นแล้วหรือยัง
 * รูปของที่ยังปิดอุบจึงขอลิงก์ไม่ได้เลย แม้จะเดา path ถูก
 */
export async function signPrizeImages(
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return signed;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(PRIZE_BUCKET)
    .createSignedUrls(unique, 60 * 60);

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }

  return signed;
}

/** รางวัลชิ้นเดียว ใช้ในหน้าแก้ไข หาจากรายการของรอบปัจจุบัน */
export async function getMyPrize(prizeId: string): Promise<PrizeRow | null> {
  const prizes = await getRoundPrizes();
  return prizes.find((prize) => prize.prize_id === prizeId) ?? null;
}
