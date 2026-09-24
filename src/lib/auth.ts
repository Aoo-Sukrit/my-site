import { redirect } from "next/navigation";

import { readSupabaseEnv } from "./supabase/env";
import { createSupabaseServerClient } from "./supabase/server";
import { PROFILE_COLUMNS, type Profile } from "./supabase/types";

export type Viewer = {
  userId: string;
  email: string | null;
  profile: Profile;
};

export const CLUB_ROUTES = {
  home: "/club",
  login: "/club/login",
  signup: "/club/signup",
  pending: "/club/pending",
  me: "/club/me",
  admin: "/club/admin",
} as const;

/**
 * อ่านว่าใครกำลังเปิดหน้าอยู่ คืน null ถ้ายังไม่ล็อกอิน
 *
 * ใช้ getUser() ไม่ใช่ getSession() เพราะ getUser() ไปถาม Supabase จริงว่า
 * token ยังใช้ได้ไหม ส่วน getSession() เชื่อคุกกี้ในเครื่องซึ่งปลอมได้
 */
export async function getViewer(): Promise<Viewer | null> {
  // ยังไม่ได้ตั้งค่า Supabase ถือว่ายังไม่ล็อกอิน จะได้เด้งไปหน้าล็อกอิน
  // ซึ่งอธิบายปัญหาได้ แทนที่จะโยน 500 ใส่หน้าเปล่าๆ
  if (readSupabaseEnv().missing.length > 0) return null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle<Profile>();

  // ล็อกอินได้แต่ยังไม่มีแถวใน profiles แปลว่า trigger ใน schema.sql
  // ยังไม่ได้รัน หรือรันไม่ผ่าน
  if (!profile) return null;

  return { userId: user.id, email: user.email ?? null, profile };
}

/** ต้องล็อกอินแล้ว ไม่งั้นเด้งไปหน้าล็อกอิน */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(CLUB_ROUTES.login);
  return viewer;
}

/** ต้องเป็นสมาชิกที่อนุมัติแล้ว */
export async function requireApproved(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.profile.status !== "approved") redirect(CLUB_ROUTES.pending);
  return viewer;
}

/**
 * ต้องเป็นแอดมิน
 *
 * proxy เช็กให้ชั้นหนึ่งแล้ว แต่ต้องเช็กซ้ำตรงนี้ด้วยเสมอ เพราะ Server Action
 * ถูกยิงตรงด้วย POST ได้โดยไม่ผ่านหน้าเว็บ proxy เป็นแค่ด่านกันคนหลงทาง
 * ไม่ใช่ด่านความปลอดภัย
 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireApproved();
  if (!viewer.profile.is_admin) redirect(CLUB_ROUTES.home);
  return viewer;
}
