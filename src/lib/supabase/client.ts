import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./env";

/**
 * ตัวเชื่อมสำหรับโค้ดที่รันในเบราว์เซอร์ (Client Component)
 * เรียกใหม่ได้เรื่อยๆ @supabase/ssr จัดการ singleton ให้เอง
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseEnv();

  return createBrowserClient(url, anonKey);
}
