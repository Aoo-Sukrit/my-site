import type { Metadata } from "next";
import Link from "next/link";

import { requireApproved } from "@/lib/auth";
import { thaiDateTimeLong } from "@/lib/date";
import { getCurrentRound } from "@/lib/runs";
import { roundPhase } from "@/lib/target-rules";

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
      className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm tracking-wide transition-colors ${
        active
          ? "bg-club-line font-medium text-background"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function SharePage(props: PageProps<"/club/share">) {
  await requireApproved();
  const params = await props.searchParams;

  const showPercent = params.board === "percent";
  const round = await getCurrentRound();
  const phase = round
    ? roundPhase(round.target_opens_at, round.target_locks_at)
    : "before";

  // รูป % ต้องรอถึงเวลาเปิดผลก่อน route ของรูปก็ปฏิเสธเองอีกชั้น
  const percentReady = showPercent && phase === "revealed";
  const imageUrl = showPercent
    ? "/club/share/image?board=percent"
    : "/club/share/image";

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <section className="space-y-2 text-center">
        <p className="text-sm tracking-[0.2em] text-accent-strong">SHARE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          รูปลงสตอรี่
        </h1>
      </section>

      {/* สวิตช์หน้าตาเดียวกับบนกระดาน สลับด้วย query string ไม่ต้องใช้ JS */}
      <nav className="flex gap-1 rounded-full border border-border p-1">
        <ShareTab href="/club/share" active={!showPercent}>
          ระยะรวม
        </ShareTab>
        <ShareTab href="/club/share?board=percent" active={showPercent}>
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

          {/* ใช้ <img> ธรรมดา ไม่ใช่ next/image เพราะการกดค้างเพื่อบันทึกภาพ
              ต้องได้ไฟล์รูปตรงๆ และรูปนี้ถูกวาดสดทุกครั้ง ไม่ต้องให้ใคร optimize
              ซ้ำ ส่วนปุ่มดาวน์โหลดตั้งใจไม่ทำ เพราะบน iOS Safari มักไม่ทำงาน
              แต่กดค้างใช้ได้เสมอ */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={
              showPercent
                ? "กระดาน % ของเป้าเดือนนี้ กดค้างที่รูปเพื่อบันทึก"
                : "กระดานระยะรวมของเดือนนี้ กดค้างที่รูปเพื่อบันทึก"
            }
            width={1080}
            height={1920}
            className="w-full rounded-2xl border border-border"
          />
        </>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/club"
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
