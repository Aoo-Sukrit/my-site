"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { ABOUT_STATS_MAX } from "@/lib/about-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AboutStat } from "@/lib/supabase/types";

export type AboutProfileValues = {
  displayName: string;
  tagline: string;
  story: string;
  /** ที่อยู่ไฟล์ที่เพิ่งอัป หรือ null เมื่อไม่ได้เปลี่ยนรูป */
  avatarPath: string | null;
  chips: string[];
  lineUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  stravaUrl: string;
  email: string;
  stats: AboutStat[];
};

export type SectionValues = {
  slug: string;
  title: string;
  intro: string;
  /** ที่อยู่ไฟล์ที่เพิ่งอัป หรือ null เมื่อไม่ได้เปลี่ยนรูปปก */
  coverPath: string | null;
  hidden: boolean;
};

export type AboutActionResult = { ok: boolean; error: string | null };

function refresh() {
  revalidatePath("/about");
  revalidatePath("/blog");
}

export async function saveAboutProfileAction(
  values: AboutProfileValues,
): Promise<AboutActionResult> {
  await requireAdmin();

  if (values.stats.length > ABOUT_STATS_MAX) {
    return { ok: false, error: `ตัวเลขเด่นใส่ได้ไม่เกิน ${ABOUT_STATS_MAX} ช่อง` };
  }

  // ช่องที่กรอกไม่ครบคู่ (มีแต่ตัวเลขหรือมีแต่คำอธิบาย) ตัดทิ้งไปเลย
  const stats = values.stats.filter(
    (stat) => stat.value.trim() !== "" && stat.label.trim() !== "",
  );
  const chips = values.chips.map((chip) => chip.trim()).filter(Boolean);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_about_profile", {
    p_display_name: values.displayName,
    p_tagline: values.tagline,
    p_story: values.story,
    p_avatar_url: values.avatarPath,
    p_chips: chips,
    p_line_url: values.lineUrl,
    p_instagram_url: values.instagramUrl,
    p_facebook_url: values.facebookUrl,
    p_strava_url: values.stravaUrl,
    p_email: values.email,
    p_stats: stats,
  });

  if (error) return { ok: false, error: toThaiDbError(error) };

  refresh();
  return { ok: true, error: null };
}

/**
 * บันทึกหมวดงานอดิเรกทั้งชุด
 *
 * ส่งไปทั้งรายการเสมอ เพราะลำดับต้องเรียงใหม่ทั้งชุดอยู่แล้ว
 * ฐานข้อมูลเป็นคนตั้งเลขลำดับให้ตามลำดับที่ส่งมา
 */
export async function saveSectionsAction(
  sections: SectionValues[],
): Promise<AboutActionResult> {
  await requireAdmin();

  const seen = new Set<string>();
  for (const row of sections) {
    if (!/^[a-z0-9-]{2,40}$/.test(row.slug)) {
      return {
        ok: false,
        error: `ชื่อย่อ "${row.slug}" ใช้ไม่ได้ ใช้ได้แค่ a-z 0-9 และขีดกลาง 2 ถึง 40 ตัว`,
      };
    }
    if (seen.has(row.slug)) {
      return { ok: false, error: `ชื่อย่อ "${row.slug}" ซ้ำกัน` };
    }
    seen.add(row.slug);

    if (row.title.trim() === "") {
      return { ok: false, error: `หมวด "${row.slug}" ยังไม่มีชื่อ` };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_sections", {
    p_sections: sections.map((row) => ({
      slug: row.slug,
      title: row.title,
      kind: "hobby",
      intro: row.intro,
      cover_url: row.coverPath,
      hidden: row.hidden,
    })),
  });

  if (error) return { ok: false, error: toThaiDbError(error) };

  refresh();
  return { ok: true, error: null };
}

/** ปักหมุดหรือถอนหมุดโพสต์ ใช้เป็น form action บนหน้าโพสต์ */
export async function togglePinnedAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("post_id") ?? "");
  const pinned = String(formData.get("pinned") ?? "") === "true";
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("admin_set_post_pinned", {
    p_id: id,
    p_pinned: pinned,
  });

  refresh();
  revalidatePath(`/blog/${id}`);
}
