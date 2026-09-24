import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { requireSupabaseEnv } from "./env";

/**
 * ตัวเชื่อมสำหรับ proxy.ts โดยเฉพาะ
 *
 * ต่างจากฝั่ง Server Component ตรงที่ตรงนี้เขียนคุกกี้ได้จริง proxy จึงเป็น
 * ที่เดียวที่ต่ออายุ session ให้ได้ ถ้าไม่มีตัวนี้ คนที่ทิ้งแท็บไว้นานๆ
 * จะโดนเด้งออกเองแบบงงๆ
 *
 * คืน getResponse() มาเป็นฟังก์ชัน เพราะ response ถูกสร้างใหม่ทุกครั้งที่
 * supabase เขียนคุกกี้ ต้องหยิบตัวล่าสุดตอนจบเสมอ
 */
export function createSupabaseProxyClient(request: NextRequest) {
  const { url, anonKey } = requireSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // @supabase/ssr ส่ง header กัน cache มาให้ด้วย ต้องแปะไปกับ response
        // ไม่งั้น CDN อาจ cache หน้าที่มีคุกกี้ของคนหนึ่งไปเสิร์ฟให้อีกคน
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  return {
    supabase,
    getResponse: () => response,
  };
}

/**
 * ย้ายคุกกี้ที่ supabase เพิ่งเขียน ไปใส่ response ตัวใหม่
 * ต้องเรียกทุกครั้งที่จะ redirect ไม่งั้น session ที่เพิ่งต่ออายุจะหายไป
 */
export function withAuthCookies(
  target: NextResponse,
  source: NextResponse,
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}
