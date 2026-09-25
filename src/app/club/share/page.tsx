import type { Metadata } from "next";
import Link from "next/link";

import { requireApproved } from "@/lib/auth";

export const metadata: Metadata = {
  title: "รูปลงสตอรี่",
};

export default async function SharePage() {
  await requireApproved();

  // ไม่ต่อ timestamp ท้าย URL เพราะ React ห้ามเรียกฟังก์ชันที่ให้ผลไม่คงที่
  // อย่าง Date.now() ตอน render อยู่แล้ว และไม่จำเป็นด้วย เพราะ route ของรูป
  // ส่ง Cache-Control: no-store กลับมา เบราว์เซอร์จึงไม่เก็บรูปเก่าไว้
  const imageUrl = "/club/share/image";

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <section className="space-y-2 text-center">
        <p className="text-sm tracking-[0.2em] text-accent-strong">SHARE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          รูปลงสตอรี่
        </h1>
      </section>

      <div className="rounded-2xl border border-club-line bg-club-cream p-4 text-club-ink">
        <p className="text-sm font-medium">วิธีเซฟ</p>
        <p className="mt-1 text-sm">
          กดค้างที่รูปแล้วเลือกบันทึกภาพ จากนั้นเปิด Instagram แล้วลงสตอรี่ได้เลย
        </p>
      </div>

      {/* ใช้ <img> ธรรมดา ไม่ใช่ next/image เพราะการกดค้างเพื่อบันทึกภาพ
          ต้องได้ไฟล์รูปตรงๆ และรูปนี้ถูกวาดสดทุกครั้ง ไม่ต้องให้ใคร optimize
          ซ้ำ ส่วนปุ่มดาวน์โหลดตั้งใจไม่ทำ เพราะบน iOS Safari มักไม่ทำงาน
          แต่กดค้างใช้ได้เสมอ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="กระดานระยะรวมของเดือนนี้ กดค้างที่รูปเพื่อบันทึก"
        width={1080}
        height={1920}
        className="w-full rounded-2xl border border-border"
      />

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/club"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          ← กลับกระดาน
        </Link>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          เปิดรูปเต็มจอ
        </a>
      </div>
    </div>
  );
}
