/**
 * รูปโปรไฟล์ขนาดเล็กสำหรับรูปสตอรี่
 *
 * ทำไมต้องมี
 * รูปโปรไฟล์ที่เก็บจริงเป็น JPEG ทรงสูง 9:16 หนักได้ถึง 450KB ซึ่งพอดีสำหรับหน้าเว็บ
 * แต่ในรูปสตอรี่ รูปบนโพเดียมกว้างจริงราว 245px และรูปในรายการกว้าง 30–54px
 * การฝังไฟล์เต็มทั้ง 14 คนแล้วให้ resvg ถอดรหัสภาพรวมกว่า 20 ล้านพิกเซล
 * คือส่วนที่กินเวลาที่สุดของการสร้างรูป
 *
 * เคยลองใช้ Supabase image transformation ย่อให้ตอนขอ แต่ฟีเจอร์นั้นไม่มีใน
 * แพ็กเกจ Free ที่คลับใช้อยู่ เลยเปลี่ยนมาย่อในเบราว์เซอร์ตอนอัปโหลดแทน
 * แล้วเก็บไฟล์เล็กไว้ข้างไฟล์เต็มในบัคเก็ตเดียวกัน
 *
 * ที่อยู่ไฟล์เดาได้จากกันและกัน จึงไม่ต้องเพิ่มคอลัมน์ในฐานข้อมูล
 *   เต็ม  <user id>/avatar.jpg
 *   เล็ก  <user id>/avatar-320.jpg
 *
 * ไฟล์นี้เป็นค่าคงที่กับฟังก์ชันล้วน ไม่แตะ DOM และไม่แตะฐานข้อมูล
 * จึง import ได้ทั้งจาก Server Component และไฟล์ "use client"
 */

export const AVATAR_BUCKET = "avatars";

/** กว้างเท่านี้พอสำหรับแก้วบนโพเดียมซึ่งกว้างจริงราว 210px ในรูป 1080 */
export const AVATAR_THUMB_WIDTH = 320;

/** ไฟล์เล็กควรจบใต้เพดานนี้ ไม่งั้นก็ยังไม่ได้ช่วยอะไร */
export const AVATAR_THUMB_MAX_BYTES = 60_000;

export const AVATAR_FILE = "avatar.jpg";
export const AVATAR_THUMB_FILE = "avatar-320.jpg";

export function avatarPath(userId: string): string {
  return `${userId}/${AVATAR_FILE}`;
}

export function avatarThumbPath(userId: string): string {
  return `${userId}/${AVATAR_THUMB_FILE}`;
}

/** ที่อยู่ไฟล์ในบัคเก็ตที่แกะออกมาจาก URL สาธารณะที่เก็บไว้ในตาราง */
const PUBLIC_MARKER = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

/**
 * URL ของรูปเล็ก จาก URL ของรูปเต็ม
 *
 * คืน null เมื่อ URL ไม่ใช่ของบัคเก็ต avatars หรือไม่ได้ชื่อไฟล์ตามแบบที่
 * ตัวอัปโหลดตั้งให้ ฝั่งเรียกจะได้ถอยไปใช้รูปเต็มแทน
 */
export function avatarThumbUrl(url: string | null): string | null {
  if (!url) return null;

  const at = url.indexOf(PUBLIC_MARKER);
  if (at < 0) return null;

  const origin = url.slice(0, at);
  // ตัด ?v=... ที่ใช้ไล่แคชออก เหลือแต่ที่อยู่ไฟล์จริง
  const path = url.slice(at + PUBLIC_MARKER.length).split("?")[0];
  if (!path.endsWith(`/${AVATAR_FILE}`)) return null;

  const thumb = path.slice(0, -AVATAR_FILE.length) + AVATAR_THUMB_FILE;
  return `${origin}${PUBLIC_MARKER}${thumb}`;
}
