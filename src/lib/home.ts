import { createSupabaseServerClient } from "./supabase/server";
import type { ClubSummary, HomeContent } from "./supabase/types";

/**
 * ข้อมูลหน้าแรก ดึงผ่าน RPC เท่านั้น
 * ตาราง home_content ถูกปิดสิทธิ์ไว้ ฟังก์ชันฝั่งฐานข้อมูลเป็นคนกรองให้
 */

export async function getHomeContent(): Promise<HomeContent | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("home_content_get");
  const rows = (data ?? []) as HomeContent[];
  return rows[0] ?? null;
}

/**
 * ตัวเลขสดของคลับเดือนปัจจุบัน
 *
 * มีฟังก์ชันของตัวเองแทนการใช้ month_leaderboard() เพราะการ์ดนี้อยู่บนหน้าแรก
 * ซึ่งคนที่ยังไม่ล็อกอินก็เห็น ส่วน month_leaderboard() กันไว้ให้เฉพาะสมาชิก
 */
export async function getClubSummary(): Promise<ClubSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("home_club_summary");
  const rows = (data ?? []) as ClubSummary[];
  return rows[0] ?? null;
}
