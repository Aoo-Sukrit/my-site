import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ปลายทางของลิงก์ยืนยันอีเมลที่ Supabase ส่งไปให้คนสมัคร
 *
 * Supabase ส่ง code กลับมาทาง query string เราต้องเอาไปแลกเป็น session
 * ตรงนี้ Route Handler เขียนคุกกี้ได้ จึงทำที่นี่ได้ (Server Component ทำไม่ได้)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    const errorDescription =
      searchParams.get("error_description") ?? "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ";
    return NextResponse.redirect(
      `${origin}/club/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/club/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/club/pending`);
}
