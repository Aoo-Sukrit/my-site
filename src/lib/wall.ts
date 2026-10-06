import { createSupabaseServerClient } from "./supabase/server";
import type { BestMonth, WallMessage } from "./supabase/types";

/**
 * กระดานแซว ดึงผ่าน RPC เท่านั้น
 *
 * ตาราง member_wall ถูกถอนสิทธิ์จาก anon และ authenticated ไปหมดแล้ว
 * ฟังก์ชันฝั่งฐานข้อมูลเป็นคนตรวจว่าคนที่กำลังดูเป็นสมาชิกที่อนุมัติแล้วหรือยัง
 * และเป็นคนตัดข้อความที่ถูกซ่อนออกก่อนส่งมาถึงที่นี่
 */

export async function getWall(
  ownerId: string,
  limit = 50,
): Promise<WallMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("member_wall_list", {
    p_owner: ownerId,
    p_limit: limit,
  });
  return (data ?? []) as WallMessage[];
}

export async function getWallCount(ownerId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("member_wall_count", {
    p_owner: ownerId,
  });
  return typeof data === "number" ? data : 0;
}

export async function getBestMonth(
  profileId: string,
): Promise<BestMonth | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("member_best_month", {
    p_profile: profileId,
  });
  const rows = (data ?? []) as BestMonth[];
  return rows[0] ?? null;
}
