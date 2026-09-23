import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เกี่ยวกับผม",
};

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          เกี่ยวกับผม
        </h1>
        <p className="text-muted">
          (ข้อความตัวอย่าง) ย่อหน้านี้ไว้เล่าว่าเราเป็นใคร อยู่ที่ไหน
          ทำงานอะไร และชอบใช้เวลาว่างไปกับเรื่องอะไร
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">สิ่งที่ชอบ</h2>
        <ul className="space-y-2 text-muted">
          <li>· (ข้อความตัวอย่าง) เรื่องที่หนึ่ง</li>
          <li>· (ข้อความตัวอย่าง) เรื่องที่สอง</li>
          <li>· (ข้อความตัวอย่าง) เรื่องที่สาม</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">ติดต่อ</h2>
        <p className="text-muted">
          (ข้อความตัวอย่าง) ใส่ช่องทางติดต่อที่สะดวกไว้ตรงนี้
        </p>
      </section>
    </div>
  );
}
