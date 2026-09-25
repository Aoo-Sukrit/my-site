import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { PortraitAvatar } from "@/components/club/avatar";
import ClubLogo from "@/components/club-logo";
import { SubmitButton } from "@/components/club/form-controls";
import { requireApproved } from "@/lib/auth";
import { formatKm, thaiMonthLabel } from "@/lib/date";
import { getCurrentRound, getLeaderboard } from "@/lib/runs";

import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "BEER NOW RUN LATER",
};

export default async function ClubPage(props: PageProps<"/club">) {
  const viewer = await requireApproved();
  const params = await props.searchParams;

  const round = await getCurrentRound();
  const board = await getLeaderboard();

  const groupTotal = board.reduce((sum, row) => sum + Number(row.total_km), 0);

  return (
    <div className="space-y-10">
      {params.saved ? <Alert tone="success">บันทึกผลวิ่งแล้ว</Alert> : null}

      <section className="space-y-4">
        <ClubLogo
          className="w-28 rounded-2xl sm:w-36"
          sizes="(min-width: 640px) 144px, 112px"
          eager
        />
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            กระดานระยะรวม
          </h1>
          <p className="text-muted">
            {round
              ? `เดือน${thaiMonthLabel(round.month)}`
              : "ยังไม่มีรอบของเดือนนี้"}{" "}
            · สวัสดี {viewer.profile.nickname}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-club-line bg-club-cream p-4 text-club-ink">
          <p className="text-xs tracking-[0.15em]">ระยะรวมทั้งกลุ่ม</p>
          <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            {formatKm(groupTotal)}
            <span className="ml-1 text-sm font-normal">กม.</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs tracking-[0.15em] text-muted">สมาชิก</p>
          <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            {board.length}
            <span className="ml-1 text-sm font-normal text-muted">คน</span>
          </p>
        </div>
      </section>

      <Link
        href="/club/run/new"
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-club-line px-6 text-base font-medium tracking-wide text-background transition hover:opacity-90"
      >
        กรอกผลวิ่ง
      </Link>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">
          อันดับ <span className="text-muted">({board.length})</span>
        </h2>

        {board.length === 0 ? (
          <p className="text-sm text-muted">
            ยังไม่มีข้อมูล ถ้าเพิ่งรัน supabase/003_runs.sql ลองรีเฟรชอีกครั้ง
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {board.map((row) => (
              <li key={row.member_id}>
                <Link
                  href={`/club/member/${row.member_id}`}
                  className="block space-y-2 rounded-2xl border border-border bg-surface p-2 transition-colors hover:border-accent"
                >
                  <div className="relative">
                    <PortraitAvatar
                      src={row.avatar_url}
                      nickname={row.nickname}
                    />
                    {/* เลขอันดับทับมุมรูป คนที่ระยะเท่ากันได้อันดับเดียวกัน */}
                    <span className="absolute top-2 left-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-club-line px-1.5 text-xs font-medium text-background">
                      {row.rank_no}
                    </span>
                    {row.is_admin ? (
                      <span className="absolute top-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] text-accent-strong">
                        แอดมิน
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-0.5 px-1 pb-1">
                    <p className="truncate text-sm font-medium">
                      {row.nickname}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatKm(row.total_km)} กม. · {row.run_count} ครั้ง
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href={`/club/member/${viewer.userId}`}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          ผลวิ่งของฉัน
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
    </div>
  );
}
