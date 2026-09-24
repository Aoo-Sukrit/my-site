import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabaseEnv } from "./env";

/**
 * ตัวเชื่อมสำหรับโค้ดที่รันบนเซิร์ฟเวอร์ (Server Component, Route Handler,
 * Server Action) ต้องสร้างใหม่ทุก request ห้ามเก็บไว้ใช้ข้าม request
 * เพราะมันผูกกับคุกกี้ของ request นั้นๆ
 */
export async function createSupabaseServerClient() {
  // เรียกก่อนเช็ก env เพื่อให้ Next รู้ตั้งแต่แรกว่าหน้านี้ต้องเรนเดอร์ตอน
  // request ไม่ใช่ตอน build
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component เขียนคุกกี้ไม่ได้ ตรงนี้จึงพังเป็นปกติ
          // ตอนทำ auth จริงต้องมี middleware คอยรีเฟรช session ให้อีกที
        }
      },
    },
  });
}
