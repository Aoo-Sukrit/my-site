import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import ClubLogo from "@/components/club-logo";
import { SubmitButton } from "@/components/club/form-controls";
import { requireApproved } from "@/lib/auth";
import { thaiMonthLabel } from "@/lib/date";
import { monthRange } from "@/lib/run-rules";
import { getCurrentRound, getLeaderboard } from "@/lib/runs";

import { logoutAction } from "./actions";
import { LogRunButton, Podium, RankList, TotalBar } from "./board";

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

  const round = await getCurrentRound();
  const board = await getLeaderboard();

  // แถวเรียงมาจากฐานข้อมูลแล้ว ระยะมากไปน้อย ตามด้วยชื่อ
  const ranked = board.filter((row) => Number(row.total_km) > 0);
  const idle = board.filter((row) => Number(row.total_km) <= 0);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
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

      {podium.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
          <p className="font-display text-lg font-medium">
            ยังไม่มีใครกรอกผลเลย
          </p>
          <p className="mt-1 text-sm text-muted">เป็นคนแรกสิ</p>
        </section>
      ) : (
        <section>
          <Podium top={podium} />
        </section>
      )}

      <RankList ranked={rest} idle={idle} />

      <TotalBar totalKm={groupTotal} />

      <p className="text-center text-[11px] tracking-[0.2em] text-muted sm:text-xs">
        GOOD PACE · GOOD PLACE · GOOD PEOPLE
      </p>

      <section className="flex flex-wrap justify-center gap-3 border-t border-border pt-6">
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
