"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import {
  POST_BUCKET,
  isPostStatus,
  isPostVisibility,
  parseYouTubeId,
} from "@/lib/post-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MediaInput = {
  kind: "image" | "youtube";
  /** รูป: ที่อยู่ไฟล์ในบัคเก็ต · วิดีโอ: null */
  url: string | null;
  youtubeId: string | null;
  caption: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

export type PostFormValues = {
  id: string | null;
  title: string;
  body: string;
  section: string;
  visibility: string;
  status: string;
  media: MediaInput[];
};

export type PostActionResult = {
  ok: boolean;
  id: string | null;
  error: string | null;
};

function refresh() {
  revalidatePath("/blog");
  revalidatePath("/about");
}

/**
 * ลบไฟล์ที่หลุดออกจากโพสต์
 *
 * ฐานข้อมูลลบไฟล์ใน storage เองไม่ได้ ฟังก์ชันฝั่งนั้นจึงคืนรายชื่อไฟล์
 * ที่ไม่มีใครอ้างถึงแล้วกลับมา ให้ตรงนี้เป็นคนตามไปเก็บกวาด
 *
 * ถ้าลบไม่สำเร็จก็ไม่ล้มทั้งงาน เพราะโพสต์บันทึกไปแล้ว แค่เหลือไฟล์ค้าง
 * ซึ่งแย่กว่าถ้าไปบอกผู้ใช้ว่าบันทึกไม่สำเร็จทั้งที่บันทึกไปแล้ว
 */
async function removeFiles(paths: unknown) {
  const list = Array.isArray(paths)
    ? paths.filter((item): item is string => typeof item === "string" && !!item)
    : [];
  if (list.length === 0) return;

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.storage.from(POST_BUCKET).remove(list);
  } catch {
    // ปล่อยผ่าน ไฟล์ค้างไม่ได้ทำให้โพสต์ผิด
  }
}

function validate(values: PostFormValues): string | null {
  if (values.title.trim().length === 0) return "ใส่หัวเรื่องด้วย";
  if (!values.section) return "เลือกหมวดก่อน";
  if (!isPostVisibility(values.visibility)) return "เลือกว่าใครเห็นได้";
  if (!isPostStatus(values.status)) return "สถานะไม่ถูกต้อง";

  for (const item of values.media) {
    if (item.kind === "youtube" && !item.youtubeId) {
      return "ลิงก์ YouTube อันหนึ่งอ่านไม่ออก ลองวางใหม่";
    }
    if (item.kind === "image" && !item.url) {
      return "รูปอันหนึ่งยังอัปไม่เสร็จ";
    }
  }

  return null;
}

export async function savePostAction(
  values: PostFormValues,
): Promise<PostActionResult> {
  await requireAdmin();

  const problem = validate(values);
  if (problem) return { ok: false, id: null, error: problem };

  const media = values.media.map((item) => ({
    kind: item.kind,
    url: item.kind === "image" ? item.url : null,
    // กันไว้อีกชั้น เผื่อฝั่งเบราว์เซอร์ส่งลิงก์เต็มมาแทนรหัสคลิป
    youtube_id:
      item.kind === "youtube"
        ? (parseYouTubeId(item.youtubeId ?? "") ?? item.youtubeId)
        : null,
    caption: item.caption,
    width: item.width,
    height: item.height,
    bytes: item.bytes,
  }));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_save_post", {
    p_id: values.id,
    p_title: values.title,
    p_body: values.body,
    p_section: values.section,
    p_visibility: values.visibility,
    p_status: values.status,
    p_media: media,
  });

  if (error) return { ok: false, id: null, error: toThaiDbError(error) };

  const result = (data ?? {}) as { id?: string; removed?: unknown };
  await removeFiles(result.removed);

  refresh();
  return { ok: true, id: result.id ?? values.id, error: null };
}

/** ใช้เป็น form action คู่กับปุ่มยืนยันสองจังหวะ */
export async function deletePostAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("post_id") ?? "");
  if (!id) redirect("/blog?err=" + encodeURIComponent("ไม่รู้ว่าจะลบโพสต์ไหน"));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delete_post", {
    p_id: id,
  });

  if (error) {
    redirect("/blog?err=" + encodeURIComponent(toThaiDbError(error)));
  }

  await removeFiles((data as { removed?: unknown } | null)?.removed);

  refresh();
  redirect("/blog?msg=" + encodeURIComponent("ลบโพสต์แล้ว"));
}

/**
 * หัวข้อกับประโยคใต้หัวข้อของหน้า BLOG
 *
 * หัวข้อห้ามว่าง ดักทั้งสองฝั่ง ฝั่งนี้เพื่อไม่ต้องยิงไปถามฐานข้อมูลเปล่าๆ
 * ฝั่งฐานข้อมูลเพราะใครก็ยิง rpc เองได้ ไม่ได้ผ่านหน้านี้เสมอ
 */
export async function saveBlogContentAction(values: {
  title: string;
  subtitle: string;
}): Promise<{ ok: boolean; error: string | null }> {
  await requireAdmin();

  const title = values.title.trim();
  if (!title) return { ok: false, error: "หัวข้อใหญ่เว้นว่างไม่ได้" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_blog_content", {
    p_title: title,
    p_subtitle: values.subtitle,
  });

  if (error) return { ok: false, error: toThaiDbError(error) };

  revalidatePath("/blog");
  return { ok: true, error: null };
}
