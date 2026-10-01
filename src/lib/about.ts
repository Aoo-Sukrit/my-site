import { createSupabaseServerClient } from "./supabase/server";
import type {
  AboutProfile,
  GalleryImage,
  RunningStats,
} from "./supabase/types";

/**
 * ข้อมูลหน้า ABOUT ดึงผ่าน RPC เท่านั้น
 * ตาราง about_profile ถูกปิดสิทธิ์ไว้ ฟังก์ชันฝั่งฐานข้อมูลเป็นคนกรองให้
 */

export async function getAboutProfile(): Promise<AboutProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("about_profile_get");
  const rows = (data ?? []) as AboutProfile[];
  return rows[0] ?? null;
}

export async function getSectionGallery(
  slug: string,
  limit = 60,
): Promise<GalleryImage[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("section_gallery", {
    p_slug: slug,
    p_limit: limit,
  });
  return (data ?? []) as GalleryImage[];
}

/** สถิติวิ่งของเจ้าของเว็บ ดึงจากข้อมูลคลับ ไม่ต้องกรอกเอง */
export async function getRunningStats(): Promise<RunningStats | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("about_running_stats");
  const rows = (data ?? []) as RunningStats[];
  return rows[0] ?? null;
}
