import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import { bangkokToday, thaiMonthLabel } from "@/lib/date";
import { BACKDATE_GRACE_DAYS } from "@/lib/run-rules";
import { getCurrentRound } from "@/lib/runs";

import RunForm from "../run-form";

export const metadata: Metadata = {
  title: "กรอกผลวิ่ง",
};

export default async function NewRunPage() {
  const viewer = await requireApproved();
  const round = await getCurrentRound();
  const today = bangkokToday();
  const inGracePeriod = Number(today.slice(8, 10)) <= BACKDATE_GRACE_DAYS;

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
          supabase/003_runs.sql
        </Alert>
      ) : round.status !== "open" ? (
        <Alert tone="info">
          รอบเดือน{thaiMonthLabel(round.month)}ปิดรับผลแล้ว ทักแอดมินได้ถ้าต้องเพิ่ม
        </Alert>
      ) : (
        <>
          {inGracePeriod ? (
            <Alert tone="info">
              ช่วง {BACKDATE_GRACE_DAYS} วันแรกของเดือน
              ยังกรอกผลวิ่งของเดือนที่แล้วได้อยู่ เลือกวันที่ให้ตรงกับวันที่วิ่งจริง
              แล้วระบบจะเอาไปนับในรอบของเดือนนั้นให้เอง
            </Alert>
          ) : null}

          <RunForm
            mode="new"
            memberId={viewer.userId}
            today={today}
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
