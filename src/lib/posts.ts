import { POST_BUCKET } from "./post-rules";
import { readSupabaseEnv } from "./supabase/env";
import { createSupabaseServerClient } from "./supabase/server";
import type {
  BlogContent,
  PostCard,
  PostDetail,
  PostSection,
} from "./supabase/types";

/**
 * ข้อมูลโพสต์ ดึงผ่าน RPC เท่านั้น
 *
 * ตาราง posts post_media post_sections ถูกถอนสิทธิ์จาก anon และ authenticated
 * ไปหมดแล้ว เพราะโพสต์แบบลิงก์ลับต้องไม่มีทางหลุดออกมาทางหน้ารวม
 * ฟังก์ชันฝั่งฐานข้อมูลเป็นคนกรองว่าคนที่กำลังดูอยู่เห็นอะไรได้บ้าง
 */

export async function getPostSections(): Promise<PostSection[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("post_sections_list");
  return (data ?? []) as PostSection[];
}

export async function getPostFeed(
  sectionSlug?: string | null,
  limit = 40,
): Promise<PostCard[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("post_feed", {
    p_section_slug: sectionSlug ?? null,
    p_limit: limit,
    p_offset: 0,
  });
  return (data ?? []) as PostCard[];
}

export async function getPostById(id: string): Promise<PostDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("post_by_id", { p_id: id });
  const rows = (data ?? []) as PostDetail[];
  return rows[0] ?? null;
}

/** ทางเดียวที่โพสต์ลิงก์ลับออกมาได้ ต้องรู้ token 32 ตัวที่เดาไม่ได้ */
export async function getPostByToken(
  token: string,
): Promise<PostDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("post_by_token", { p_token: token });
  const rows = (data ?? []) as PostDetail[];
  return rows[0] ?? null;
}

export async function getStorageUsed(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("post_storage_used");
  return Number(data ?? 0);
}

/**
 * URL สาธารณะของรูปในโพสต์
 *
 * บัคเก็ตเป็นแบบ public ใครรู้ที่อยู่ก็เปิดได้ ซึ่งจำเป็นเพราะโพสต์สาธารณะ
 * ต้องให้คนที่ยังไม่ล็อกอินเห็นรูป และ LINE กับ Facebook ต้องดึงรูปไปทำ preview
 * ความลับอยู่ที่ชื่อไฟล์ซึ่งเป็น uuid สุ่ม บวกกับที่ไม่มี policy ให้ใครไล่ list
 * ไฟล์ในบัคเก็ตนี้ได้เลยนอกจากแอดมิน
 *
 * ประกอบเองแทนการเรียก getPublicUrl() เพราะฟังก์ชันนั้นต้องสร้าง client ก่อน
 * ซึ่งเปลืองโดยไม่จำเป็นเวลาวนหลายสิบรูป
 */
export function postImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { url } = readSupabaseEnv();
  if (!url) return null;
  return `${url}/storage/v1/object/public/${POST_BUCKET}/${path}`;
}

/**
 * หัวข้อหน้า BLOG
 *
 * อยู่ไฟล์นี้เพราะเป็นข้อความของหน้า BLOG เหมือนกัน ไม่ได้แยกเป็น blog.ts
 * ใหม่ให้มีไฟล์ที่มีฟังก์ชันเดียว
 */
export async function getBlogContent(): Promise<BlogContent | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("blog_content_get");
  const rows = (data ?? []) as BlogContent[];
  return rows[0] ?? null;
}
