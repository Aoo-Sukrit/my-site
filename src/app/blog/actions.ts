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
import {
  SERIES_DESCRIPTION_MAX,
  SERIES_ORDER_MAX,
  SERIES_TITLE_MAX,
  SERIES_UNIT_MAX,
  isSeriesSlug,
} from "@/lib/series-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SeriesOption } from "@/lib/supabase/types";

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
  /** ซีรีส์ที่โพสต์นี้อยู่ ว่างคือโพสต์เดี่ยว */
  seriesId: string | null;
  /** เลขตอน เช่น 3 ของ Week 3 */
  seriesOrder: number | null;
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

  if (values.seriesId) {
    const order = values.seriesOrder;
    if (
      order === null ||
      !Number.isInteger(order) ||
      order < 1 ||
      order > SERIES_ORDER_MAX
    ) {
      return `ใส่เลขตอนเป็นเลข 1–${SERIES_ORDER_MAX}`;
    }
  }

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
    p_series_id: values.seriesId || null,
    p_series_order: values.seriesId ? values.seriesOrder : null,
  });

  if (error) return { ok: false, id: null, error: toThaiDbError(error) };

  const result = (data ?? {}) as { id?: string; removed?: unknown };
  await removeFiles(result.removed);

  refresh();
  return { ok: true, id: result.id ?? values.id, error: null };
}

export type SeriesFormValues = {
  /** ซีรีส์ใหม่ก็ตั้ง id มาจากเบราว์เซอร์ เพื่อให้โฟลเดอร์รูปปกชื่อตรงกัน */
  id: string;
  /** ว่างได้ ฐานข้อมูลสร้างจากชื่อให้ */
  slug: string;
  title: string;
  description: string;
  unitLabel: string;
  coverUrl: string | null;
};

export type SeriesActionResult =
  | { ok: true; series: SeriesOption; error: null }
  | { ok: false; series: null; error: string };

/**
 * สร้างหรือแก้ซีรีส์จากหน้าเขียนโพสต์
 * คืนแถวที่บันทึกแล้วกลับไปให้ dropdown ใช้ต่อทันทีโดยไม่ต้องโหลดหน้าใหม่
 */
export async function saveSeriesAction(
  values: SeriesFormValues,
): Promise<SeriesActionResult> {
  await requireAdmin();

  const title = values.title.trim();
  const slug = values.slug.trim().toLowerCase();
  const unit = values.unitLabel.trim();

  if (!title) return { ok: false, series: null, error: "ใส่ชื่อซีรีส์ด้วย" };
  if (title.length > SERIES_TITLE_MAX) {
    return { ok: false, series: null, error: `ชื่อซีรีส์ยาวเกิน ${SERIES_TITLE_MAX} ตัวอักษร` };
  }
  if (slug && !isSeriesSlug(slug)) {
    return {
      ok: false,
      series: null,
      error: "slug ใช้ได้แค่ a-z 0-9 กับขีด - ยาว 2–60 ตัว เช่น quant-trading",
    };
  }
  if (values.description.length > SERIES_DESCRIPTION_MAX) {
    return { ok: false, series: null, error: `คำอธิบายยาวเกิน ${SERIES_DESCRIPTION_MAX} ตัวอักษร` };
  }
  if (unit.length > SERIES_UNIT_MAX) {
    return { ok: false, series: null, error: `คำเรียกตอนยาวเกิน ${SERIES_UNIT_MAX} ตัวอักษร` };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_save_series", {
    p_id: values.id,
    p_slug: slug,
    p_title: title,
    p_description: values.description,
    p_unit_label: unit,
    p_cover_url: values.coverUrl,
  });

  if (error) return { ok: false, series: null, error: toThaiDbError(error) };

  const saved = (data ?? {}) as { id?: string; slug?: string; removed?: unknown };
  await removeFiles(saved.removed);

  // อ่านกลับจากรายการจริง จะได้จำนวนตอนกับเลขตอนสูงสุดที่ถูกต้อง
  const { data: list } = await supabase.rpc("post_series_list");
  const row = ((list ?? []) as SeriesOption[]).find(
    (item) => item.id === (saved.id ?? values.id),
  );

  refresh();

  if (!row) {
    return { ok: false, series: null, error: "บันทึกแล้วแต่โหลดซีรีส์กลับมาไม่ได้ ลองรีเฟรชหน้า" };
  }
  return { ok: true, series: row, error: null };
}

/** ลบซีรีส์ โพสต์ข้างในยังอยู่ครบ แค่กลายเป็นโพสต์เดี่ยว */
export async function deleteSeriesAction(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delete_series", { p_id: id });

  if (error) return { ok: false, error: toThaiDbError(error) };

  await removeFiles((data as { removed?: unknown } | null)?.removed);

  refresh();
  return { ok: true, error: null };
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
