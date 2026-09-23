import Link from "next/link";

import ClubLogo from "@/components/club-logo";

const secondaryLinks = [
  { href: "/about", label: "ABOUT" },
  { href: "/blog", label: "BLOG" },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="text-sm tracking-[0.2em] text-accent-strong">
          WELCOME ABOARD
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          AOOOKULELE &amp; CO.
        </h1>
        <p className="text-muted">
          anything about aoookulele
          <br />— made for fun, forever under construction
        </p>
        <p className="text-muted">
          ตอนนี้หน้าอื่นยังว่างอยู่ กำลังทยอยเติม ถ้าเป็นทีม Beer Now Run Later
          กดที่ CLUB ไปดูผลวิ่งเดือนนี้ได้เลย
        </p>
      </section>

      <section className="space-y-4">
        <Link
          href="/club"
          className="group flex flex-col gap-5 rounded-3xl border-2 border-club-line bg-club-cream p-6 text-club-ink transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:gap-7 sm:p-7"
        >
          <ClubLogo
            className="w-full max-w-56 self-center rounded-2xl sm:w-40 sm:max-w-none sm:shrink-0"
            sizes="(min-width: 640px) 160px, 224px"
            eager
          />
          <div>
            <p className="text-xs tracking-[0.2em] text-club-line">CLUB</p>
            <p className="mt-2 text-lg">ตารางแข่งวิ่งประจำเดือนของแก๊ง</p>
            <span className="mt-3 inline-block text-sm tracking-wide transition-transform duration-200 group-hover:translate-x-1">
              ดูตาราง →
            </span>
          </div>
        </Link>

        <div className="flex flex-wrap gap-3">
          {secondaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-border px-4 py-2 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
