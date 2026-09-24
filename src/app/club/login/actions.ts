"use server";

import { redirect } from "next/navigation";

import { toThaiAuthError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/** รับได้เฉพาะเส้นทางภายใน /club กัน open redirect */
function safeNext(value: string) {
  return value.startsWith("/club") && !value.startsWith("//")
    ? value
    : "/club";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "กรอกอีเมลและรหัสผ่านให้ครบก่อน" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: toThaiAuthError(error) };
  }

  // redirect() ทำงานด้วยการ throw ต้องอยู่นอก try/catch เสมอ
  redirect(next);
}
