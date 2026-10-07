import type { Metadata } from "next";
import Link from "next/link";

import LinkPending from "@/components/link-pending";
import { requireApproved } from "@/lib/auth";
import { thaiDateTimeLong } from "@/lib/date";
import { getCurrentRound, getRoundByMonth, getRoundMonths } from "@/lib/runs";
import { thaiMonthLabel } from "@/lib/date";
import { roundPhase } from "@/lib/target-rules";

import StoryImage from "./story-image";

export const metadata: Metadata = {
  title: "รูปลงสตอรี่",
};

function ShareTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm tracking-wide transition active:scale-[0.97] ${
        active
          ? "bg-club-line font-medium text-background"
          : "text-muted hover:text-foreground has-[[data-pending]]:animate-pulse has-[[data-pending]]:bg-accent-soft has-[[data-pending]]:text-foreground"
      }`}
    >
      {children}
      <LinkPending />
    </Link>
  );
}

export default async function SharePage(props: PageProps<"/club/share">) {
  await requireApproved();
  const params = await props.searchParams;

  const showPercent = params.board === "percent";

  // รับ month มาด้วย จะได้เซฟรูปสรุปของเดือนที่แล้วได้
  // ใส่เดือนมั่วๆ ให้กลับมาเดือนปัจจุบันเงียบๆ เหมือนหน้ากระดาน
  const months = await getRoundMonths();
  const currentMonthKey = months.find((row) => row.is_current)?.month.slice(0, 7);
  const asked = typeof params.month === "string" ? params.month : null;
  const selectedMonth =
    asked && asked !== currentMonthKey &&
    months.some((row) => row.month.slice(0, 7) === asked)
      ? asked
      : null;

  const round = selectedMonth
    ? await getRoundByMonth(selectedMonth)
    : await getCurrentRound();
  const phase = round
    ? roundPhase(round.target_opens_at, round.target_locks_at)
    : "before";

  /** ลิงก์ที่พาเดือนที่เลือกไปด้วย */
  const withMonth = (base: string, extra?: string) => {
    const parts = [extra, selectedMonth ? `month=${selectedMonth}` : null].filter(
      Boolean,
    );
    return parts.length > 0 ? `${base}?${parts.join("&")}` : base;
  };

  // รูป % ต้องรอถึงเวลาเปิดผลก่อน route ของรูปก็ปฏิเสธเองอีกชั้น
  const percentReady = showPercent && phase === "revealed";
  const imageUrl = withMonth(
    "/club/share/image",
    showPercent ? "board=percent" : undefined,
  );

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <section className="space-y-2 text-center">
        <p className="text-sm tracking-[0.2em] text-accent-strong">SHARE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          รูปลงสตอรี่
        </h1>
        {round ? (
          <p className="text-sm text-muted">เดือน{thaiMonthLabel(round.month)}</p>
        ) : null}
      </section>

      {/* สวิตช์หน้าตาเดียวกับบนกระดาน สลับด้วย query string ไม่ต้องใช้ JS */}
      <nav className="flex gap-1 rounded-full border border-border p-1">
        <ShareTab href={withMonth("/club/share")} active={!showPercent}>
          ระยะรวม
        </ShareTab>
        <ShareTab
          href={withMonth("/club/share", "board=percent")}
          active={showPercent}
        >
          % ของเป้า
        </ShareTab>
      </nav>

      {showPercent && !percentReady ? (
        <div className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
          <p className="font-display text-base font-medium">
            รูป % ยังเซฟไม่ได้
          </p>
          <p className="mt-2 text-sm text-muted">
            {round
              ? `จะเซฟได้หลังเปิดผล ${thaiDateTimeLong(round.target_locks_at)}`
              : "ยังไม่มีรอบของเดือนนี้"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-club-line bg-club-cream p-4 text-club-ink">
            <p className="text-sm font-medium">วิธีเซฟ</p>
            <p className="mt-1 text-sm">
              กดค้างที่รูปแล้วเลือกบันทึกภาพ จากนั้นเปิด Instagram
              แล้วลงสตอรี่ได้เลย
            </p>
          </div>

          {/* รูปถูกวาดสดทุกครั้ง ใช้เวลาสองสามวินาที StoryImage เลยโชว์
              "กำลังสร้างรูป…" คั่นไว้ก่อน ส่วนปุ่มดาวน์โหลดตั้งใจไม่ทำ
              เพราะบน iOS Safari มักไม่ทำงาน แต่กดค้างใช้ได้เสมอ */}
          <StoryImage
            key={imageUrl}
            src={imageUrl}
            alt={
              showPercent
                ? "กระดาน % ของเป้า กดค้างที่รูปเพื่อบันทึก"
                : "กระดานระยะรวม กดค้างที่รูปเพื่อบันทึก"
            }
          />
        </>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={selectedMonth ? `/club?month=${selectedMonth}` : "/club"}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          ← กลับกระดาน
        </Link>
        {!showPercent || percentReady ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            เปิดรูปเต็มจอ
          </a>
        ) : null}
      </div>
    </div>
  );
}
