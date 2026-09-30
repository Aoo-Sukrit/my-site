/**
 * รูปทรงแก้วเบียร์ของโพเดียม
 *
 * path ทุกเส้นลอกมาจาก docs/mockups/beer-mug.svg ตรงๆ ไม่ได้วาดใหม่
 * ไฟล์นี้เป็นค่าคงที่ล้วน ไม่มี JSX และไม่แตะ DOM จึง import ได้ทั้งจาก
 * Server Component, ไฟล์ "use client" และจากตัววาดรูปสตอรี่
 *
 * มีสองตัววาดที่ใช้ค่าชุดนี้
 *   src/components/club/beer-mug.tsx   วาดเป็น <svg> จริงบนหน้าเว็บ
 *   src/app/club/share/story-card.tsx  วาดลงรูปสตอรี่ผ่าน satori
 *
 * ทำไมไม่ใช้ component เดียวกันทั้งสองที่
 * satori วาด path, g, clipPath, image และ circle ใน svg ได้หมด แต่พอมี
 * <text> อยู่ใน svg มันพังทั้งรูป (TypeError: Cannot read properties of
 * undefined) ฝั่งรูปสตอรี่จึงต้องเอาตัวหนังสือออกมาเป็น div วางทับข้างนอก svg
 * ส่วนฝั่งเว็บใช้ <text> ได้ตามปกติและดีกว่าเพราะย่อขยายตามแก้วเอง
 * ทรงแก้วเลยอยู่ที่นี่ที่เดียว แล้วสองฝั่งไปประกอบเอง
 */

/**
 * กรอบวาด
 *
 * ต้นฉบับใช้ 128 x 166 แต่เงาของหูจับซึ่งเลื่อนไปขวา 5 หน่วยยื่นถึงราว 131
 * เลยโดนขอบขวาตัดหายไปครึ่งเส้น ที่นี่ขยายความกว้างเป็น 134 โดยไม่ขยับ
 * พิกัดใน path สักเส้น ทรงแก้วจึงเหมือนเดิมเป๊ะ แค่มีที่ว่างให้เงาครบ
 */
export const MUG_VIEW = { width: 134, height: 166 } as const;

/** ตัวแก้ว สอบลงเล็กน้อย ก้นมนนิดหน่อย */
export const MUG_BODY_PATH =
  "M16,32 L104,32 L95,149 Q94.5,156 88,156 L32,156 Q25.5,156 25,149 Z";

/** ฟองเบียร์ด้านบน */
export const MUG_FOAM_PATH =
  "M16,32 C12,20 19,11 29,13 C33,4 45,2 52,8 C60,1 72,3 76,11 C87,5 99,10 100,19 C107,22 109,30 104,32 Z";

/** หูจับด้านขวา วาดก่อนตัวแก้วเสมอ จะได้ดูเหมือนอยู่ข้างหลัง */
export const MUG_HANDLE_PATH =
  "M105,56 C121,55 124,74 121,87 C118,101 110,107 100,106";

/**
 * กล่องที่รูปคนต้องเต็ม
 * ใหญ่กว่าตัวแก้วนิดหน่อยทุกด้าน กันไม่ให้เห็นขอบว่างตรงมุมหลังตัดด้วย clipPath
 */
export const MUG_PHOTO_BOX = { x: 15, y: 28, width: 91, height: 131 } as const;

/** กรอบในตัวแก้ว ใช้จัดตัวอักษรแรกให้อยู่กลางแก้วตอนไม่มีรูป */
export const MUG_INNER = { x: 16, y: 32, width: 88, height: 124 } as const;

/** เงาเลื่อนไปขวาและลงล่างเท่านี้ */
export const MUG_SHADOW_OFFSET = 5;

export const MUG_STROKE = 4;
export const MUG_HANDLE_STROKE = 9;

/** วงกลมเลขอันดับ ติดมุมซ้ายบนคร่อมขอบฟอง */
export const MUG_BADGE = { cx: 12, cy: 11, r: 11 } as const;

/** ขนาดตัวอักษรในกรอบวาด ฝั่งไหนจะย่อขยายก็คูณสเกลของตัวเองเอา */
export const MUG_BADGE_FONT = 13;
export const MUG_INITIAL_FONT = 46;

/**
 * สีของแก้วในรูปสตอรี่ ตรึงค่าไว้ไม่อ่านโหมดมืดของเครื่อง
 * พื้นรูปสตอรี่เป็นครีมอยู่แล้ว จึงใช้สีตามต้นแบบใน beer-mug.svg ได้ตรงๆ
 * ฝั่งเว็บไม่ได้ใช้ชุดนี้ เพราะต้องสลับตามธีมผ่าน token ใน globals.css
 */
export const MUG_PRINT = {
  outline: "#141210",
  foam: "#fffdf6",
  goldShadow: "#d8890c",
  inkShadow: "#141210",
  emptyFill: "#f0e4d4",
  emptyText: "#9c4a25",
  badgeText: "#fffdf6",
} as const;
