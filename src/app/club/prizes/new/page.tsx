import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import { thaiMonthLabel } from "@/lib/date";
import { getCurrentRound } from "@/lib/runs";

import PrizeForm from "../prize-form";

export const metadata: Metadata = {
  title: "ตั้งรางวัล",
};

export default async function NewPrizePage() {
  await requireApproved();
  const round = await getCurrentRound();

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">PRIZE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          ตั้งรางวัล
        </h1>
        <p className="text-sm text-muted">
          {round
            ? `ของรอบเดือน${thaiMonthLabel(round.month)} ใครครองอันดับนั้นตอนจบเดือนได้ไป`
            : "ยังไม่มีรอบของเดือนนี้"}
        </p>
      </section>

      {round ? (
        <PrizeForm
          mode="new"
          defaults={{
            board: "distance",
            rank: "1",
            title: "",
            detail: "",
            isHidden: false,
          }}
        />
      ) : (
        <Alert tone="error">
          ยังไม่มีรอบของเดือนนี้ ลองรีเฟรชอีกครั้ง
        </Alert>
      )}

      <Link
        href="/club?board=rewards"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับแท็บรางวัล
      </Link>
    </div>
  );
}
