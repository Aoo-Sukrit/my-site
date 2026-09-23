import Link from "next/link";

import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="text-sm text-accent">ยินดีต้อนรับ</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          สวัสดี เข้ามานั่งเล่นได้เลย
        </h1>
        <p className="text-muted">
          (ข้อความตัวอย่าง) ตรงนี้ไว้แนะนำตัวสั้นๆ ว่าเราเป็นใคร ทำอะไรอยู่
          และเว็บนี้มีอะไรให้ดูบ้าง — {site.tagline}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/about"
          className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent"
        >
          <h2 className="font-display text-lg font-medium">เกี่ยวกับผม</h2>
          <p className="mt-1 text-sm text-muted">
            (ข้อความตัวอย่าง) เรื่องของเรา แบบย่อๆ
          </p>
        </Link>

        <Link
          href="/blog"
          className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent"
        >
          <h2 className="font-display text-lg font-medium">บล็อก</h2>
          <p className="mt-1 text-sm text-muted">
            (ข้อความตัวอย่าง) บันทึกที่เขียนไว้เรื่อยๆ
          </p>
        </Link>
      </section>
    </div>
  );
}
