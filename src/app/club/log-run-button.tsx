"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * ปุ่มลอย "+ กรอกผลวิ่ง" มุมขวาล่างของหน้ากระดาน
 *
 * เลื่อนจอลงเพื่ออ่านรายชื่อ ปุ่มหดเหลือวงกลม "+" จะได้ไม่บังแถวในรายการ
 * เลื่อนขึ้นเมื่อไหร่กลับมาเต็มเหมือนเดิม เหมือนแอปทั่วไปที่คนคุ้นมือ
 *
 * ตอนหดตัวหนังสือหายไปจากจอ aria-label จึงติดอยู่ที่ลิงก์ตลอด
 * โปรแกรมอ่านจอจะยังพูดว่า "กรอกผลวิ่ง" ทั้งสองแบบ
 *
 * ย้ายออกมาจาก board.tsx ซึ่งเป็น Server Component เพราะต้องฟังการเลื่อนจอ
 */

/** ต้องเลื่อนลงมาเกินเท่านี้ก่อนถึงจะหด ตอนอยู่บนสุดของหน้าปุ่มเต็มเสมอ */
const COLLAPSE_AFTER = 120;
/** ขยับนิ้วนิดเดียวไม่นับ กันปุ่มกระพริบหดๆ ขยายๆ ตอนนิ้วสั่น */
const JITTER = 6;

export default function LogRunButton() {
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    function onScroll() {
      // รวบหลาย event ให้คิดครั้งเดียวต่อเฟรม การเลื่อนจะได้ไม่หน่วง
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (Math.abs(delta) < JITTER) return;
        setCompact(delta > 0 && y > COLLAPSE_AFTER);
        lastY.current = y;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Link
      href="/club/run/new"
      aria-label="กรอกผลวิ่ง"
      // เผื่อแถบ home indicator ของ iPhone ไม่ให้ปุ่มไปทับ
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      className={`fixed right-5 z-30 flex h-14 items-center justify-center rounded-full bg-club-line text-base font-medium tracking-wide text-background shadow-lg transition-all duration-300 ease-out hover:opacity-90 active:scale-95 motion-reduce:transition-none ${
        compact ? "w-14 px-0" : "gap-2 px-6"
      }`}
    >
      <span aria-hidden className="text-2xl leading-none">
        +
      </span>
      {/* ซ่อนด้วยความกว้าง ไม่ใช่ถอดออก ตัวหนังสือจะได้ค่อยๆ หุบไปพร้อมปุ่ม */}
      <span
        aria-hidden
        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out motion-reduce:transition-none ${
          compact ? "max-w-0 opacity-0" : "max-w-32 opacity-100"
        }`}
      >
        กรอกผลวิ่ง
      </span>
    </Link>
  );
}
