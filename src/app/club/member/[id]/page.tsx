import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Alert from "@/components/club/alert";
import { PortraitAvatar } from "@/components/club/avatar";
import { requireApproved } from "@/lib/auth";
import { formatKm, thaiMonthLabel, thaiShortDate } from "@/lib/date";
import {
  getCurrentRound,
  getLeaderboard,
  getMemberEdits,
  getMemberRuns,
  hoursLeftToEdit,
  signProofUrls,
  withinEditWindow,
} from "@/lib/runs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS, type Profile } from "@/lib/supabase/types";

import EditHistory from "./edit-history";
import RunRow from "./run-row";

export const metadata: Metadata = {
  title: "สมาชิก",
};

function firstParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function MemberPage(props: PageProps<"/club/member/[id]">) {
  const viewer = await requireApproved();
  const { id } = await props.params;
  const params = await props.searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle<Profile>();

  if (!member) notFound();

  const round = await getCurrentRound();
  const [board, runs, edits] = await Promise.all([
    getLeaderboard(),
    round ? getMemberRuns(id, round.id) : Promise.resolve([]),
    getMemberEdits(id),
  ]);

  const standing = board.find((row) => row.member_id === id);
  const signed = await signProofUrls(runs.map((run) => run.proof_url));

  // ชื่อคนที่เป็นคนแก้ เอาไว้แสดงในประวัติ แทนที่จะโชว์ uuid ดิบๆ
  const editorIds = [
    ...new Set(edits.map((edit) => edit.edited_by).filter(Boolean)),
  ] as string[];
  const { data: editors } = editorIds.length
    ? await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", editorIds)
        .returns<{ id: string; nickname: string }[]>()
    : { data: [] };

  const editorNames = new Map(
    (editors ?? []).map((row) => [row.id, row.nickname]),
  );

  const isSelf = viewer.userId === id;
  const canManage = isSelf || viewer.profile.is_admin;

  return (
    <div className="space-y-10">
      {firstParam(params.err) ? (
        <Alert tone="error">{firstParam(params.err)}</Alert>
      ) : null}
      {firstParam(params.msg) ? (
        <Alert tone="success">{firstParam(params.msg)}</Alert>
      ) : null}

      <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="w-40 shrink-0 sm:w-48">
          <PortraitAvatar src={member.avatar_url} nickname={member.nickname} />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {member.nickname}
            {isSelf ? <span className="text-muted"> (คุณ)</span> : null}
          </h1>
          {member.caption ? (
            <p className="text-sm text-muted">{member.caption}</p>
          ) : null}
          <p className="text-3xl font-semibold text-accent-strong">
            {formatKm(standing?.total_km ?? 0)}{" "}
            <span className="text-base font-normal text-muted">กม.</span>
          </p>
          <p className="text-sm text-muted">
            อันดับ {standing?.rank_no ?? "—"} ·{" "}
            {round ? `เดือน${thaiMonthLabel(round.month)}` : "ยังไม่มีรอบเดือนนี้"}{" "}
            · วิ่งไป {runs.length} ครั้ง
          </p>
        </div>
      </section>

      {member.about ? (
        <section className="space-y-2 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-medium">เกี่ยวกับ</h2>
          {/* whitespace-pre-line เพื่อให้การขึ้นบรรทัดที่เจ้าตัวพิมพ์ไว้ยังอยู่ */}
          <p className="whitespace-pre-line text-muted">{member.about}</p>
        </section>
      ) : isSelf ? (
        <section className="rounded-2xl border border-dashed border-border p-5">
          <p className="text-sm text-muted">
            ยังไม่ได้เขียนอะไรเกี่ยวกับตัวเองเลย{" "}
            <Link href="/club/me" className="text-accent-strong underline">
              เขียนเลย
            </Link>
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">ผลวิ่งเดือนนี้</h2>

        {runs.length === 0 ? (
          <p className="text-sm text-muted">
            {isSelf ? "ยังไม่ได้กรอกผลวิ่งเดือนนี้เลย" : "ยังไม่มีผลวิ่งเดือนนี้"}
          </p>
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                proofUrl={signed.get(run.proof_url) ?? null}
                dateLabel={thaiShortDate(run.ran_on)}
                canManage={canManage && (viewer.profile.is_admin || withinEditWindow(run))}
                hoursLeft={hoursLeftToEdit(run)}
                isAdminEdit={!isSelf && viewer.profile.is_admin}
              />
            ))}
          </ul>
        )}

        {isSelf ? (
          <Link
            href="/club/run/new"
            className="inline-flex min-h-11 items-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
          >
            กรอกผลวิ่ง
          </Link>
        ) : null}
      </section>

      <EditHistory edits={edits} editorNames={editorNames} />

      <Link
        href="/club"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับกระดาน
      </Link>
    </div>
  );
}
