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

export function clubChips(userId: string): ClubChip[] {
  return [
    { href: "/club", label: "กระดาน", exact: true },
    { href: "/club/target", label: "เป้าเดือนนี้", exact: false },
    { href: "/club/share", label: "รูปลงสตอรี่", exact: false },
    { href: `/club/member/${userId}`, label: "โปรไฟล์ของฉัน", exact: false },
  ];
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
