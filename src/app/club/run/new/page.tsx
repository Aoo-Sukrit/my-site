import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import {
  bangkokToday,
  hasPassed,
  thaiDateTimeLong,
  thaiMonthLabel,
} from "@/lib/date";
import { monthKeyOf, previousMonthKey, type ResultsAtByMonth } from "@/lib/run-rules";
import { getCurrentRound, getRoundByMonth } from "@/lib/runs";

import RunForm from "../run-form";

export const metadata: Metadata = {
  title: "กรอกผลวิ่ง",
};

export default async function NewRunPage() {
  const viewer = await requireApproved();
  const round = await getCurrentRound();
  const today = bangkokToday();

  // เดือนที่แล้วยังกรอกได้อยู่ไหม ขึ้นกับ results_at ของรอบนั้น ซึ่งแอดมินเลื่อนได้
  // จึงต้องไปถามฐานข้อมูล ไม่ใช่เดาจากวันที่วันนี้
  const lastMonthKey = previousMonthKey(monthKeyOf(today));
  const lastRound = await getRoundByMonth(lastMonthKey);
  const lastStillOpen = lastRound !== null && !hasPassed(lastRound.results_at);

  const resultsAt: ResultsAtByMonth = {};
  if (round) resultsAt[monthKeyOf(round.month)] = round.results_at;
  if (lastRound) resultsAt[lastMonthKey] = lastRound.results_at;

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">NEW RUN</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          กรอกผลวิ่ง
        </h1>
      </section>

      {!round ? (
        <Alert tone="error">
          ยังไม่มีรอบของเดือนนี้ ลองรีเฟรชอีกครั้ง ถ้ายังไม่หายแปลว่ายังไม่ได้รัน
          supabase/migrations/20260925000003_runs.sql
        </Alert>
      ) : round.status !== "open" ? (
        <Alert tone="info">
          รอบเดือน{thaiMonthLabel(round.month)}ปิดรับผลแล้ว ทักแอดมินได้ถ้าต้องเพิ่ม
        </Alert>
      ) : (
        <>
          {lastStillOpen && lastRound ? (
            <Alert tone="info">
              ผลของเดือน{thaiMonthLabel(lastRound.month)}กรอกได้ถึง{" "}
              {thaiDateTimeLong(lastRound.results_at)}{" "}
              เลือกวันที่ให้ตรงกับวันที่วิ่งจริง แล้วระบบจะเอาไปนับในรอบของเดือนนั้นให้เอง
            </Alert>
          ) : null}

          <RunForm
            mode="new"
            memberId={viewer.userId}
            today={today}
            resultsAt={resultsAt}
            defaults={{
              ranOn: today,
              distanceKm: "",
              source: "Garmin",
              note: "",
            }}
          />
        </>
      )}

      <Link
        href="/club"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับกระดาน
      </Link>
    </div>
  );
}
