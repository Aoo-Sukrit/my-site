/**
 * กติกาของแถบเมนูคลับ ฝั่งที่ไม่ต้องคุยกับฐานข้อมูล
 *
 * แยกออกมาจาก club-nav.tsx ซึ่งเป็นไฟล์ "use client" เพราะกฎของโปรเจกต์นี้
 * ห้าม Server Component ไป import ของที่ไม่ใช่ component จากไฟล์ "use client"
 * และแยกแบบนี้ทำให้เขียนเทสตรรกะได้โดยไม่ต้องเปิดเบราว์เซอร์
 */

export type ClubChip = {
  href: string;
  label: string;
  /** true = ต้องตรงเป๊ะ ใช้กับหน้ากระดานซึ่ง href เป็น /club เฉยๆ */
  exact: boolean;
};

/** หน้าที่ไม่ต้องมีแถบเมนู ยังไม่ผ่านประตูเข้าคลับ */
export const CLUB_NAV_HIDE_ON = [
  "/club/login",
  "/club/signup",
  "/club/pending",
  "/club/auth",
];

/**
 * ชิปในแถบเมนู
 *
 * ไม่มีชิป "โปรไฟล์ของฉัน" เพราะซ้ำกับเมนูที่อยู่หลังรูปโปรไฟล์มุมขวา
 * และสามใบพอดีจอ 375px โดยไม่ต้องปัดเลื่อน ซึ่งอ่านง่ายกว่าสี่ใบที่ต้องเลื่อน
 * ไม่ได้รับ userId แล้ว แต่คงพารามิเตอร์ไว้ไม่ได้ จึงตัดทิ้งไปเลย
 */
export function clubChips(): ClubChip[] {
  return [
    { href: "/club", label: "กระดาน", exact: true },
    { href: "/club/target", label: "เป้าเดือนนี้", exact: false },
    { href: "/club/share", label: "รูปลงสตอรี่", exact: false },
  ];
}

/**
 * ตอนนี้อยู่หน้าของตัวเองไหม (หน้าแก้โปรไฟล์ หรือหน้าโปรไฟล์ตัวเอง)
 *
 * ใช้ใส่วงแหวนรอบรูปโปรไฟล์มุมขวาแทนการไฮไลต์ชิป เพราะสองหน้านี้ไม่มีชิป
 * ของตัวเองแล้ว ถ้าไม่มีอะไรสว่างเลยคนจะไม่รู้ว่าตอนนี้อยู่ตรงไหน
 */
export function isAccountActive(pathname: string, userId: string): boolean {
  // เทียบ "/club/me" แบบเป๊ะหรือตามด้วยขีด ไม่ใช่ startsWith เฉยๆ
  // เพราะ "/club/member/..." ก็ขึ้นต้นด้วย "/club/me" เหมือนกัน
  // ถ้าใช้ startsWith เฉยๆ เปิดดูโปรไฟล์เพื่อนก็จะมีวงแหวนขึ้นด้วย
  const isMePage = pathname === "/club/me" || pathname.startsWith("/club/me/");
  const mine = `/club/member/${userId}`;
  const isMyProfile = pathname === mine || pathname.startsWith(`${mine}/`);

  return isMePage || isMyProfile;
}

export function hideClubNav(pathname: string): boolean {
  return CLUB_NAV_HIDE_ON.some((path) => pathname.startsWith(path));
}

/**
 * ชิปใบนี้คือหน้าที่เปิดอยู่ไหม
 *
 * หน้ากระดานต้องตรงเป๊ะ เพราะ href เป็น /club ซึ่งเป็นคำนำหน้าของทุกหน้าในคลับ
 * ถ้าใช้ startsWith ชิปกระดานจะไฮไลต์ค้างอยู่ทุกหน้า
 *
 * ส่วนใบอื่นใช้คำนำหน้า เพื่อให้หน้าลูกไฮไลต์ชิปแม่ด้วย เช่นอยู่หน้าแก้ผลวิ่ง
 * ของตัวเอง ชิปโปรไฟล์ของฉันก็ยังสว่างอยู่
 */
export function isChipActive(pathname: string, chip: ClubChip): boolean {
  return chip.exact ? pathname === chip.href : pathname.startsWith(chip.href);
}
