import Link from "next/link";

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
          className="block rounded-3xl bg-accent-strong p-6 text-background transition-opacity hover:opacity-90 sm:p-8"
        >
          <p className="text-xs tracking-[0.2em]">CLUB</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            BEER NOW RUN LATER
          </h2>
          <p className="mt-2">ตารางแข่งวิ่งประจำเดือนของแก๊ง</p>
          <span className="mt-4 inline-block text-sm tracking-wide">
            ดูตาราง →
          </span>
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
