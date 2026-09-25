import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import ClubLogo from "@/components/club-logo";
import { SubmitButton } from "@/components/club/form-controls";
import { requireApproved } from "@/lib/auth";
import { thaiDateTimeLong, thaiMonthLabel } from "@/lib/date";
import { monthRange } from "@/lib/run-rules";
import { getCurrentRound, getLeaderboard } from "@/lib/runs";
import { roundPhase } from "@/lib/target-rules";
import { getPercentBoard } from "@/lib/targets";

import { logoutAction } from "./actions";
import {
  LogRunButton,
  PercentList,
  PercentPodium,
  Podium,
  RankList,
  TotalBar,
} from "./board";

export const metadata: Metadata = {
  title: "BEER NOW RUN LATER",
};

/** "1–31 ตุลาคม 2569" */
function periodLabel(month: string) {
  const lastDay = Number(monthRange(month.slice(0, 7)).max.slice(8, 10));
  return `1–${lastDay} ${thaiMonthLabel(month)}`;
}

export default async function ClubPage(props: PageProps<"/club">) {
  const viewer = await requireApproved();
  const params = await props.searchParams;

  const showPercent = params.board === "percent";

  const round = await getCurrentRound();
  const board = await getLeaderboard();
  const phase = round
    ? roundPhase(round.target_opens_at, round.target_locks_at)
    : "before";

  // เรียกเฉพาะตอนดูกระดาน % จะได้ไม่ยิง RPC ทิ้งทุกครั้งที่เปิดหน้าแรก
  const percentRows =
    showPercent && phase === "revealed" ? await getPercentBoard() : [];

  const ranked = board.filter((row) => Number(row.total_km) > 0);
  const idle = board.filter((row) => Number(row.total_km) <= 0);
  const groupTotal = ranked.reduce((sum, row) => sum + Number(row.total_km), 0);

  return (
    // pb เผื่อที่ให้ปุ่มลอย ไม่ให้ไปบังเนื้อหาบรรทัดสุดท้าย
    <div className="space-y-8 pb-28">
      {params.saved ? <Alert tone="success">บันทึกผลวิ่งแล้ว</Alert> : null}

      <header className="space-y-3 text-center">
        <ClubLogo
          className="mx-auto w-24 rounded-2xl sm:w-28"
          sizes="(min-width: 640px) 112px, 96px"
          eager
        />
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          BEER NOW RUN LATER
        </h1>
        <p className="text-xs text-muted sm:text-sm">
          {round ? periodLabel(round.month) : "ยังไม่มีรอบของเดือนนี้"} ·{" "}
          {board.length} คน
        </p>
      </header>

      {round && phase === "open" ? (
        <Link
          href="/club/target"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-club-line bg-club-cream px-5 py-4 text-club-ink transition hover:opacity-90"
        >
          <span>
            <span className="block font-display text-base font-semibold">
              ตั้งเป้าเดือนนี้ได้แล้ว
            </span>
            <span className="block text-sm">
              ปิดรับ {thaiDateTimeLong(round.target_locks_at)}
            </span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </Link>
      ) : null}

      {/* สลับกระดานด้วย query string ไม่ต้องใช้ JS ฝั่งเบราว์เซอร์เลย */}
      <nav className="flex gap-2 rounded-full border border-border p-1">
        <BoardTab href="/club" active={!showPercent}>
          ระยะรวม
        </BoardTab>
        <BoardTab href="/club?board=percent" active={showPercent}>
          % ของเป้า
        </BoardTab>
      </nav>

      {showPercent ? (
        phase !== "revealed" && round ? (
          <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
            <p className="font-display text-lg font-medium">เป้ายังไม่เปิด</p>
            <p className="mt-2 text-sm text-muted">
              รอ {thaiDateTimeLong(round.target_locks_at)}
            </p>
          </section>
        ) : percentRows.length === 0 ? (
          <p className="text-sm text-muted">รอบนี้ยังไม่มีใครตั้งเป้าไว้</p>
        ) : (
          <>
            <PercentPodium top={percentRows.slice(0, 3)} />
            <PercentList rows={percentRows.slice(3)} />
          </>
        )
      ) : (
        <>
          {ranked.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
              <p className="font-display text-lg font-medium">
                ยังไม่มีใครกรอกผลเลย
              </p>
              <p className="mt-1 text-sm text-muted">เป็นคนแรกสิ</p>
            </section>
          ) : (
            <section>
              <Podium top={ranked.slice(0, 3)} />
            </section>
          )}

          <RankList ranked={ranked.slice(3)} idle={idle} />

          <TotalBar totalKm={groupTotal} />
        </>
      )}

      <p className="text-center text-[11px] tracking-[0.2em] text-muted sm:text-xs">
        GOOD PACE · GOOD PLACE · GOOD PEOPLE
      </p>

      <section className="flex flex-wrap justify-center gap-3 border-t border-border pt-6">
        <Link
          href="/club/target"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          เป้าเดือนนี้
        </Link>
        <Link
          href={`/club/member/${viewer.userId}`}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          ผลวิ่งของฉัน
        </Link>
        <Link
          href="/club/share"
          className="inline-flex min-h-11 items-center rounded-full border border-club-line px-4 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
        >
          รูปลงสตอรี่
        </Link>
        <Link
          href="/club/me"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          โปรไฟล์ของฉัน
        </Link>
        {viewer.profile.is_admin ? (
          <Link
            href="/club/admin"
            className="inline-flex min-h-11 items-center rounded-full border border-club-line px-4 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            จัดการสมาชิก
          </Link>
        ) : null}
        <form action={logoutAction}>
          <SubmitButton variant="ghost" pendingLabel="กำลังออก…">
            ออกจากระบบ
          </SubmitButton>
        </form>
      </section>

      <LogRunButton />
    </div>
  );
}

function BoardTab({
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
