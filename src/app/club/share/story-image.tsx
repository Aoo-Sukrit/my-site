"use client";

import { useState } from "react";

/**
 * รูปสตอรี่พร้อมสถานะกำลังสร้าง
 *
 * เซิร์ฟเวอร์ต้องดึงรูปโปรไฟล์ทุกคนมาวาดใหม่ทุกครั้ง ไม่ได้แคชไว้เพราะกระดาน
 * เปลี่ยนตลอด ระหว่างนั้นเบราว์เซอร์จะโชว์กรอบว่างเปล่า ซึ่งดูเหมือนเว็บค้าง
 * ตรงนี้เลยวางโครงรูปคั่นไว้ก่อน แล้วสลับเป็นรูปจริงตอน onLoad
 *
 * ต้องเป็น client component เพราะ onLoad กับ onError เป็น event ฝั่งเบราว์เซอร์
 * ตัวรูปยังเป็น <img> ธรรมดา ไม่ใช่ next/image เพราะคนใช้ต้องกดค้างเพื่อบันทึก
 * ซึ่งต้องได้ไฟล์รูปตรงๆ
 *
 * ฝั่งที่เรียกต้องใส่ key={src} ด้วย เปลี่ยนแท็บหรือเปลี่ยนเดือนคือรูปคนละใบ
 * React จะได้สร้าง component ใหม่แล้วกลับไปสถานะกำลังโหลดเอง
 * ไม่ต้องมี effect คอยรีเซ็ต state ซึ่งทำให้เกิดการ render ซ้อน
 */
export default function StoryImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  return (
    <div className="relative">
      {/* aspect-[9/16] จองที่ไว้เท่ารูปจริงตั้งแต่แรก หน้าจะได้ไม่กระโดด
          ตอนรูปโหลดเสร็จ */}
      {state !== "ready" ? (
        <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-club-line bg-accent-soft text-center">
          {state === "loading" ? (
            <>
              <span
                aria-hidden
                className="h-8 w-8 animate-spin rounded-full border-2 border-club-line border-t-transparent"
              />
              <p className="text-sm text-muted">กำลังสร้างรูป…</p>
              <p className="px-6 text-xs text-muted">
                วาดใหม่ทุกครั้งพร้อมรูปโปรไฟล์ทุกคน ใช้เวลาสักครู่
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">สร้างรูปไม่สำเร็จ</p>
              <p className="px-6 text-xs text-muted">
                ลองรีเฟรชหน้านี้อีกครั้ง ถ้ายังไม่ได้ให้ทักแอดมิน
              </p>
            </>
          )}
        </div>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={1080}
        height={1920}
        onLoad={() => setState("ready")}
        onError={() => setState("failed")}
        className={
          state === "ready"
            ? "w-full rounded-2xl border border-border"
            : "pointer-events-none absolute inset-0 h-full w-full opacity-0"
        }
      />
    </div>
  );
}
