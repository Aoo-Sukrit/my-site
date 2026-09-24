import { NextResponse, type NextRequest } from "next/server";

import {
  createSupabaseProxyClient,
  withAuthCookies,
} from "@/lib/supabase/proxy";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { isProfileStatus, type ProfileStatus } from "@/lib/supabase/types";

// Next.js 16 เปลี่ยนชื่อ middleware เป็น proxy ไฟล์นี้คือตัวเดียวกัน
// เอกสาร: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

/** หน้าที่เข้าได้โดยไม่ต้องล็อกอิน */
const PUBLIC_PATHS = new Set([
  "/club/login",
  "/club/signup",
  "/club/auth/callback",
]);

/** หน้าที่คนล็อกอินแล้วไม่ควรเห็นอีก */
const AUTH_PAGES = new Set(["/club/login", "/club/signup"]);

function landingFor(status: ProfileStatus) {
  return status === "approved" ? "/club" : "/club/pending";
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ยังไม่ได้ตั้งค่า Supabase ปล่อยผ่านไปให้หน้าเว็บอธิบายเองว่าต้องทำอะไร
  // ดีกว่าเด้ง 500 ใส่หน้าทุกหน้าโดยไม่บอกสาเหตุ
  if (readSupabaseEnv().missing.length > 0) {
    return NextResponse.next();
  }

  const { supabase, getResponse } = createSupabaseProxyClient(request);

  // เรียก getUser() ทุก request เพื่อให้ token ถูกต่ออายุและเขียนคุกกี้ใหม่
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = (to: string) =>
    withAuthCookies(
      NextResponse.redirect(new URL(to, request.nextUrl)),
      getResponse(),
    );

  // ---- ยังไม่ล็อกอิน --------------------------------------------------------
  if (!user) {
    if (PUBLIC_PATHS.has(path)) return getResponse();

    const target = new URL("/club/login", request.nextUrl);
    // จำไว้ว่าจะไปไหน ล็อกอินเสร็จจะได้ส่งกลับไปที่เดิม
    target.searchParams.set("next", path);
    return withAuthCookies(NextResponse.redirect(target), getResponse());
  }

  // ---- ล็อกอินแล้ว ---------------------------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const status: ProfileStatus = isProfileStatus(profile?.status)
    ? profile.status
    : "pending";
  const isAdmin = profile?.is_admin === true;

  if (AUTH_PAGES.has(path)) return redirectTo(landingFor(status));

  if (status !== "approved") {
    // คนที่ยังไม่ผ่านการอนุมัติ เห็นได้หน้าเดียว
    return path === "/club/pending" ? getResponse() : redirectTo("/club/pending");
  }

  // อนุมัติแล้ว ไม่ต้องมาค้างที่หน้ารออนุมัติอีก
  if (path === "/club/pending") return redirectTo("/club");

  if (path.startsWith("/club/admin") && !isAdmin) return redirectTo("/club");

  return getResponse();
}

export const config = {
  // ทำงานเฉพาะใต้ /club ส่วนหน้าแรก about blog ยังเปิดได้โดยไม่ต้องล็อกอิน
  matcher: ["/club/:path*"],
};
