export const SUPABASE_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/**
 * ต้องเขียน process.env.NEXT_PUBLIC_XXX เต็มๆ ตรงนี้เท่านั้น
 * Next.js แทนค่าตอน build ด้วยการค้นหาข้อความแบบตรงตัว ถ้าเขียนเป็น
 * process.env[ชื่อตัวแปร] โค้ดฝั่ง browser จะได้ undefined
 */
export function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const missing: string[] = [];
  if (!url.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey.trim()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return { url: url.trim(), anonKey: anonKey.trim(), missing };
}

export function requireSupabaseEnv() {
  const { url, anonKey, missing } = readSupabaseEnv();

  if (missing.length > 0) {
    throw new Error(
      `ยังไม่ได้ตั้งค่า ${missing.join(" และ ")} — กรอกค่าในไฟล์ .env.local ` +
        `แล้วรีสตาร์ท dev server (ค่าพวกนี้ถูกอ่านตอนเริ่มเซิร์ฟเวอร์เท่านั้น)`,
    );
  }

  return { url, anonKey };
}
