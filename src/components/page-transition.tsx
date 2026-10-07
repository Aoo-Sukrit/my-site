"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

/**
 * ครอบเนื้อหาของทุกหน้าให้จางออกแล้วลอยเข้าตอนเปลี่ยนหน้า
 *
 * key เป็น pathname ทำให้ React มองว่าหน้าใหม่คือของชิ้นใหม่ หน้าเก่าจึงได้
 * ท่าขาออก (page-exit) หน้าใหม่ได้ท่าขาเข้า (page-enter) หน้าตาของท่าอยู่ใน
 * globals.css
 *
 * ตั้งใจใช้แค่ pathname ไม่รวม query string เพราะการสลับแท็บกระดาน เลือกเดือน
 * หรือส่งฟอร์มแล้วเด้งกลับมาพร้อม ?msg= ยังเป็นหน้าเดิม ถ้าทั้งหน้าจางออก
 * แล้วลอยเข้าใหม่ทุกครั้งจะดูวุ่นวายเกินไป
 *
 * default="none" กันไม่ให้มันขยับเองตอนมีการอัปเดตอื่นๆ ในหน้า เช่น
 * router.refresh() หรือปุ่มที่กำลังส่งฟอร์ม
 *
 * ห่อด้วย div อีกชั้นเพราะ ViewTransition ตั้งชื่อทรานซิชันให้ element ชั้นนอกสุด
 * ของลูกทุกตัว ถ้าไม่ห่อ แถบเมนูคลับซึ่งเป็นลูกชั้นนอกสุดในหน้าคลับจะโดน
 * ทับชื่อ club-nav ของมันเอง แล้วกระพริบไปพร้อมเนื้อหา
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      enter="page-enter"
      exit="page-exit"
      default="none"
    >
      <div>{children}</div>
    </ViewTransition>
  );
}
