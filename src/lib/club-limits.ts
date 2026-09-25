/**
 * ข้อจำกัดของฟอร์มต่างๆ
 *
 * แยกมาไว้ไฟล์นี้เพราะไฟล์ที่ขึ้นต้นด้วย "use server" จะ export ได้แค่
 * async function เท่านั้น ค่าคงที่แบบนี้เลยอยู่ในนั้นไม่ได้
 * แต่ต้องใช้ร่วมกันทั้งฝั่ง action และฝั่งฟอร์ม
 */
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 24;
export const PASSWORD_MIN = 8;

/** ต้องตรงกับ constraint ใน supabase/004_profile_fields.sql */
export const CAPTION_MAX = 60;
export const ABOUT_MAX = 500;
