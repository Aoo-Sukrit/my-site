import Link from "next/link";

import { formatKm, thaiShortDate } from "@/lib/date";
import type { Run } from "@/lib/supabase/types";

/**
 * ผลวิ่งเดือนนี้
 *
 * แถวบางๆ สองอันล่าสุดตาม mockup แล้วกาง "ดูทั้งหมด" เพื่อดูรายละเอียดครบ
 * ของเดิมไม่มีอะไรหายไป ปุ่มแก้ ปุ่มลบ ลิงก์ดูรูปหลักฐาน และประวัติการแก้
 * ย้ายไปอยู่ในส่วนที่กางออกมาทั้งหมด
 *
 * ใช้ <details> ของเบราว์เซอร์แทนการทำ state เอง เพราะถ้าเป็น client component
 * จะส่ง RunRow ซึ่งเป็น server component เข้าไปข้างในไม่ได้ (ปุ่มลบในนั้น
 * เป็นฟอร์มที่ยิง server action ตรงๆ) วิธีนี้จึงไม่ต้องใช้ JS สักบรรทัด
 * และกดด้วยคีย์บอร์ดได้เองอยู่แล้ว
 */
export default function RunsSection({
  runs,
  isSelf,
  children,
}: {
  runs: Run[];
  isSelf: boolean;
  /** รายละเอียดเต็มของทุกครั้ง + ประวัติการแก้ ที่จะโผล่ตอนกางออก */
  children: React.ReactNode;
}) {
  const preview = runs.slice(0, 2);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium">ผลวิ่งเดือนนี้</h2>
        {runs.length > 0 ? (
          <span className="text-sm text-muted">{runs.length} ครั้ง</span>
        ) : null}
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-muted">
          {isSelf ? "ยังไม่ได้กรอกผลวิ่งเดือนนี้เลย" : "ยังไม่มีผลวิ่งเดือนนี้"}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border border-y border-border">
            {preview.map((run) => (
              <li
                key={run.id}
                className="flex items-baseline justify-between gap-3 py-3"
              >
                <span className="font-display text-lg font-semibold">
                  {formatKm(run.distance_km)}
                  <span className="ml-1 text-sm font-normal text-muted">
                    กม.
                  </span>
                </span>
                <span className="truncate text-sm text-muted">
                  {thaiShortDate(run.ran_on)} · {run.source}
                </span>
              </li>
            ))}
          </ul>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-center py-2 text-sm font-medium text-accent-strong transition-opacity hover:opacity-80">
              <span className="group-open:hidden">ดูทั้งหมด</span>
              <span className="hidden group-open:inline">ย่อกลับ</span>
            </summary>

            <div className="space-y-6 pt-3">{children}</div>
          </details>
        </>
      )}

      {isSelf ? (
        <Link
          href="/club/run/new"
          className="inline-flex min-h-11 items-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
        >
          กรอกผลวิ่ง
        </Link>
      ) : null}
    </section>
  );
}
