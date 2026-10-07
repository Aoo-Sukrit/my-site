import Link from "next/link";

import LinkPending from "@/components/link-pending";
import { thaiMonthLabel } from "@/lib/date";
import type { RoundMonth } from "@/lib/supabase/types";

/**
 * ตัวเลือกเดือนใต้หัวคลับ
 *
 * เลือกได้เฉพาะเดือนที่มีรอบอยู่จริง และไม่เลยเดือนปัจจุบัน รายชื่อเดือนมาจาก
 * round_months() ฝั่งฐานข้อมูล ไม่ได้เดาเอาจากปฏิทิน เพราะคลับเพิ่งเริ่มเดือนไหน
 * ก็มีรอบตั้งแต่เดือนนั้น
 *
 * เป็นลิงก์ธรรมดาสองอัน ไม่ใช่ dropdown เพราะเดือนติดกันคือสิ่งที่คนกดบ่อยที่สุด
 * และทำงานได้แม้ JS ยังโหลดไม่เสร็จ
 *
 * เดือนปัจจุบันไม่ต้องใส่ month ใน URL เพื่อให้ลิงก์ /club ธรรมดายังเป็นหน้าหลัก
 */
export default function MonthPicker({
  months,
  selected,
  currentMonthKey,
  board,
}: {
  /** ใหม่ไปเก่า ตรงตามที่ round_months() ส่งมา */
  months: RoundMonth[];
  selected: string;
  currentMonthKey: string;
  board: string | null;
}) {
  if (months.length <= 1) return null;

  const keys = months.map((row) => row.month.slice(0, 7));
  const at = keys.indexOf(selected);

  // รายการเรียงใหม่ไปเก่า ตัวถัดไปในอาร์เรย์จึงเป็นเดือนที่เก่ากว่า
  const older = at >= 0 && at + 1 < keys.length ? keys[at + 1] : null;
  const newer = at > 0 ? keys[at - 1] : null;

  const href = (monthKey: string | null) => {
    const parts: string[] = [];
    if (monthKey && monthKey !== currentMonthKey) parts.push(`month=${monthKey}`);
    if (board) parts.push(`board=${board}`);
    return parts.length > 0 ? `/club?${parts.join("&")}` : "/club";
  };

  return (
    <nav className="flex items-center justify-center gap-1">
      <Arrow href={older ? href(older) : null} label="เดือนก่อนหน้า">
        ‹
      </Arrow>

      <span className="min-w-40 text-center text-sm font-medium">
        {thaiMonthLabel(selected + "-01")}
        {selected !== currentMonthKey ? (
          <span className="ml-1.5 rounded-full bg-border px-2 py-0.5 text-[11px] font-normal text-muted">
            ดูย้อนหลัง
          </span>
        ) : null}
      </span>

      <Arrow href={newer ? href(newer) : null} label="เดือนถัดไป">
        ›
      </Arrow>
    </nav>
  );
}

function Arrow({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const base =
    "flex h-11 w-11 items-center justify-center rounded-full text-lg leading-none";

  if (!href) {
    return (
      <span aria-hidden className={`${base} text-border`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${base} text-muted transition hover:bg-accent-soft hover:text-foreground active:scale-90 has-[[data-pending]]:animate-pulse has-[[data-pending]]:bg-accent-soft`}
    >
      {children}
      <LinkPending />
    </Link>
  );
}
