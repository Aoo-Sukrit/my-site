import Link from "next/link";

import Avatar from "@/components/club/avatar";
import ClubLogo from "@/components/club-logo";
import { bangkokMonthEnd, daysLeftUntil, formatKm } from "@/lib/date";
import type { ClubSummary } from "@/lib/supabase/types";

/**
 * การ์ดคลับบนหน้าแรก พร้อมตัวเลขสดของเดือนปัจจุบัน
 *
 * แยกเป็น component ที่รับทุกอย่างทางพรอพ ไม่ได้ไปดึงข้อมูลเอง เผื่อวันหลัง
 * มีคลับที่สอง จะได้วางการ์ดใบที่สองต่อได้เลยโดยไม่ต้องรื้อหน้าแรก
 * (ตอนนี้ยังไม่มีระบบหลายคลับ แค่เตรียมรูปร่างไว้)
 *
 * ชื่อ รูป และระยะของคนที่นำอยู่ จะมาเฉพาะตอนคนที่กำลังดูเป็นสมาชิกที่อนุมัติแล้ว
 * ฟังก์ชัน home_club_summary() ฝั่งฐานข้อมูลเป็นคนตัดให้ ที่นี่ไม่ได้เช็กซ้ำ
 * เพราะถ้าเช็กสองที่แล้ววันหลังแก้ที่เดียว จะกลายเป็นว่าไม่รู้ว่าที่ไหนคุมจริง
 * ที่นี่แค่ถามว่า "ได้ชื่อคนนำมาไหม" ถ้าไม่ได้ก็ไม่ต้องวางแถวนั้น
 */
export default function ClubCard({
  href,
  eyebrow,
  blurb,
  summary,
  logo,
}: {
  href: string;
  eyebrow: string;
  blurb: string | null;
  /** null เมื่อยังไม่มีรอบของเดือนนี้ */
  summary: ClubSummary | null;
  logo?: React.ReactNode;
}) {
  const daysLeft = summary
    ? daysLeftUntil(bangkokMonthEnd(summary.round_month).toISOString())
    : 0;

  // ยังไม่มีใครกรอกผลเลย ตัวเลขทุกตัวเป็นศูนย์ ขึ้นคำชวนดีกว่าขึ้น 0.00 กม.
  const started = summary !== null && Number(summary.total_km) > 0;

  return (
    <Link
      href={href}
      className="group flex flex-col gap-5 rounded-3xl border-2 border-club-line bg-club-cream p-6 text-club-ink transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:gap-7 sm:p-7"
    >
      {logo ?? (
        <ClubLogo
          className="w-full max-w-56 self-center rounded-2xl sm:w-40 sm:max-w-none sm:shrink-0"
          sizes="(min-width: 640px) 160px, 224px"
          eager
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-[0.2em] text-club-line">{eyebrow}</p>
        {blurb ? (
          <p className="mt-2 whitespace-pre-line text-lg">{blurb}</p>
        ) : null}

        {started && summary ? (
          <div className="mt-4 space-y-2.5">
            {summary.leader_nickname ? (
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={summary.leader_avatar_url}
                  nickname={summary.leader_nickname}
                  size={32}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="text-club-line">นำอยู่ </span>
                  <span className="font-medium">{summary.leader_nickname}</span>
                </span>
                <span className="shrink-0 font-display text-sm font-semibold">
                  {formatKm(summary.leader_km ?? 0)} กม.
                </span>
              </div>
            ) : null}

            <p className="text-sm text-club-line">
              แก๊ง {summary.member_count} คน · วิ่งรวมกัน{" "}
              {formatKm(summary.total_km)} กม.
              {daysLeft > 0 ? ` · เหลืออีก ${daysLeft} วัน` : " · เดือนนี้จบแล้ว"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-club-line">
            เดือนนี้ยังไม่มีใครกรอกผลเลย เป็นคนแรกสิ
          </p>
        )}

        <span className="mt-3 inline-block text-sm tracking-wide transition-transform duration-200 group-hover:translate-x-1">
          ดูตาราง →
        </span>
      </div>
    </Link>
  );
}
