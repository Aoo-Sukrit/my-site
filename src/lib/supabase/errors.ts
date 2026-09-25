/**
 * แปลง error ของ Supabase เป็นข้อความไทยที่คนอ่านรู้เรื่อง
 * ตัวไหนไม่รู้จักก็ส่งข้อความเดิมกลับไป จะได้ยังเดาปัญหาได้อยู่
 */
export function toThaiAuthError(error: { message: string; code?: string }) {
  const message = error.message.toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (code === "email_not_confirmed" || message.includes("not confirmed")) {
    return "ยังไม่ได้ยืนยันอีเมล ลองเช็กกล่องจดหมาย (รวมถึงเมลขยะ) แล้วกดลิงก์ยืนยันก่อน";
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "อีเมลนี้สมัครไว้แล้ว ลองไปหน้าเข้าสู่ระบบแทน";
  }
  if (code === "weak_password" || message.includes("password should be")) {
    return "รหัสผ่านสั้นเกินไป ใส่อย่างน้อย 8 ตัวอักษร";
  }
  if (message.includes("email rate limit") || code === "over_email_send_rate_limit") {
    return "ส่งอีเมลถี่เกินไป รอสักครู่แล้วลองใหม่";
  }
  if (message.includes("database error saving new user")) {
    return "สมัครไม่สำเร็จ มักเกิดจากชื่อซ้ำ ลองเปลี่ยนชื่อแล้วลองใหม่ (ถ้ายังไม่ได้ แปลว่า supabase/schema.sql ยังไม่ถูกรัน)";
  }
  if (message.includes("fetch failed")) {
    return "ต่อกับ Supabase ไม่ได้ ลองเช็กค่าใน .env.local";
  }
  return error.message;
}

/** ข้อความมีตัวอักษรไทยอยู่แล้วไหม */
function isThai(text: string) {
  return /[฀-๿]/.test(text);
}

/** error จากฝั่งฐานข้อมูล (PostgREST) */
export function toThaiDbError(error: { message: string; code?: string }) {
  const code = error.code ?? "";

  // trigger กับฟังก์ชันของเราโยนข้อความไทยที่อธิบายเหตุผลมาเองอยู่แล้ว
  // ถ้าทับด้วยข้อความกลางๆ ตามรหัส ผู้ใช้จะไม่รู้ว่าติดกติกาข้อไหน
  if (isThai(error.message)) return error.message;

  if (code === "23505") {
    return "ชื่อนี้มีคนใช้แล้ว ลองตั้งใหม่";
  }
  if (code === "42501") {
    return "ไม่มีสิทธิ์แก้ข้อมูลส่วนนี้";
  }
  if (code === "PGRST205" || code === "42P01") {
    return "ยังไม่มีตาราง profiles ในฐานข้อมูล ต้องรัน supabase/schema.sql ก่อน";
  }
  return error.message;
}
