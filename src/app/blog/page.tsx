import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BLOG",
};

// โพสต์ตัวอย่างไว้ดูหน้าตาก่อน ของจริงค่อยมาแทนทีหลัง
const placeholderPosts = [
  { title: "(ข้อความตัวอย่าง) ชื่อเรื่องแรก", date: "เร็วๆ นี้" },
  { title: "(ข้อความตัวอย่าง) ชื่อเรื่องที่สอง", date: "เร็วๆ นี้" },
  { title: "(ข้อความตัวอย่าง) ชื่อเรื่องที่สาม", date: "เร็วๆ นี้" },
];

export default function BlogPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          บล็อก
        </h1>
        <p className="text-muted">
          (ข้อความตัวอย่าง) ที่เก็บบันทึกยาวๆ ที่อยากเล่าให้ฟัง
          ยังไม่มีของจริง รอก่อนนะ
        </p>
      </section>

      <ul className="space-y-3">
        {placeholderPosts.map((post) => (
          <li
            key={post.title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <p className="text-xs text-accent">{post.date}</p>
            <h2 className="mt-1 font-display text-lg font-medium">
              {post.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              (ข้อความตัวอย่าง) เกริ่นสั้นๆ ว่าเรื่องนี้เกี่ยวกับอะไร
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
