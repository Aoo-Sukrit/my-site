"use client";

import { useLinkStatus } from "next/link";

/**
 * จุดบอกสถานะ "กำลังไป" ใส่ไว้ข้างใน <Link> ที่ต้องการให้ตอบสนองทันทีที่แตะ
 *
 * แท็บกระดาน ปุ่มเลือกเดือน และชิปหมวดบล็อกเปลี่ยนแค่ query string
 * หน้าเดิมจึงไม่มีหน้าโครงคั่น (loading.tsx ทำงานเฉพาะตอนเปลี่ยน path)
 * ระหว่างรอเซิร์ฟเวอร์ตอบ จอนิ่งสนิทจนคนกดซ้ำเพราะคิดว่าไม่ติด
 *
 * ตัวนี้ไม่ได้วาดอะไรให้เห็น แค่ติด data-pending ไว้ตอนลิงก์กำลังโหลด
 * ลิงก์ที่ครอบอยู่เลือกเองว่าจะเปลี่ยนหน้าตายังไงด้วยคลาส
 * has-[[data-pending]]:... ของ Tailwind ลิงก์จึงยังเป็น Server Component ได้
 * ไม่ต้องย้ายทั้งก้อนมาฝั่งเบราว์เซอร์
 */
export default function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden data-pending={pending ? "" : undefined} hidden />;
}
