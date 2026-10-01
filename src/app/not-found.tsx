import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ไม่เจอหน้านี้",
};

/**
 * หน้า 404
 *
 * โผล่ทั้งตอนพิมพ์ที่อยู่ผิด และตอนเรียก notFound() จากหน้าโพสต์ซึ่งใช้ทั้งกับ
 * โพสต์ที่ไม่มีอยู่จริงและโพสต์ที่คนดูไม่มีสิทธิ์เห็น ข้อความจึงพูดกว้างๆ ว่า
 * "ไม่เจอ" เฉยๆ ไม่ไปบอกใบ้ว่าของชิ้นนั้นมีอยู่จริงแต่เข้าไม่ได้
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <p className="font-display text-6xl font-semibold tracking-tight text-accent-strong sm:text-7xl">
        404
      </p>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          ไม่เจอหน้านี้
        </h1>
        <p className="text-muted">
          วิ่งเลยเป้าไปหน่อย ตรงนี้ไม่มีอะไรเลยสักอย่าง
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-full bg-club-line px-6 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
