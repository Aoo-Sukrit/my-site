"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HomeValues = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  nowLine: string;
  clubBlurb: string;
};

export type HomeActionResult = { ok: boolean; error: string | null };

export async function saveHomeContentAction(
  values: HomeValues,
): Promise<HomeActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_home_content", {
    p_eyebrow: values.eyebrow,
    p_title: values.title,
    p_subtitle: values.subtitle,
    p_intro: values.intro,
    p_now_line: values.nowLine,
    p_club_blurb: values.clubBlurb,
  });

  if (error) return { ok: false, error: toThaiDbError(error) };

  revalidatePath("/");
  return { ok: true, error: null };
}
