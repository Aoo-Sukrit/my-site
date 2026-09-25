import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import { bangkokToday, thaiMonthLabel } from "@/lib/date";
import { hoursLeftToEdit, signProofUrls, withinEditWindow } from "@/lib/runs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Round, Run } from "@/lib/supabase/types";

import RunForm from "../../run-form";

export const metadata: Metadata = {
  title: "แก้ผลวิ่ง",
};

export default async function EditRunPage(
  props: PageProps<"/club/run/[id]/edit">,
) {
  const viewer = await requireApproved();
  const { id } = await props.params;

  const supabase = await createSupabaseServerClient();
  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("id", id)
    .maybeSingle<Run>();

  if (!run) notFound();

  const isOwner = run.profile_id === viewer.userId;
  const isAdmin = viewer.profile.is_admin;

  // ด่านจริงอยู่ที่ trigger ในฐานข้อมูล ตรงนี้แค่กันไม่ให้เปิดหน้าที่กดแล้ว
  // ยังไงก็ไม่ผ่าน จะได้ไม่เสียเวลากรอก
  if (!isAdmin && (!isOwner || !withinEditWindow(run))) {
    redirect(`/club/member/${run.profile_id}`);
  }

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", run.round_id)
    .maybeSingle<Round>();

  if (!round) notFound();

  const signed = await signProofUrls([run.proof_url]);

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">EDIT RUN</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          แก้ผลวิ่ง
        </h1>
        <p className="text-sm text-muted">
          รอบเดือน{thaiMonthLabel(round.month)} ·{" "}
          {isOwner
            ? `แก้ได้อีก ${hoursLeftToEdit(run)} ชั่วโมง`
            : "กำลังแก้ในฐานะแอดมิน"}{" "}
          · การแก้ทุกครั้งจะขึ้นในประวัติให้ทุกคนเห็น
        </p>
      </section>

      {!isOwner && isAdmin ? (
        <Alert tone="info">
          นี่เป็นผลวิ่งของคนอื่น แก้ในฐานะแอดมิน ชื่อคุณจะไปอยู่ในประวัติการแก้
        </Alert>
      ) : null}

      <RunForm
        mode="edit"
        runId={run.id}
        memberId={run.profile_id}
        today={bangkokToday()}
        lockedMonth={round.month}
        existingProofUrl={signed.get(run.proof_url) ?? null}
        defaults={{
          ranOn: run.ran_on,
          distanceKm: String(Number(run.distance_km)),
          source: run.source,
          note: run.note ?? "",
        }}
      />

      <Link
        href={`/club/member/${run.profile_id}`}
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← ยกเลิก กลับหน้าสมาชิก
      </Link>
    </div>
  );
}
