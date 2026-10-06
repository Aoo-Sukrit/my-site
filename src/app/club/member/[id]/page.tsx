import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import {
  formatKm,
  formatPercent,
  thaiMonthLabel,
  thaiShortDate,
} from "@/lib/date";
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
import { getPercentBoard } from "@/lib/targets";
import { roundPhase } from "@/lib/target-rules";
import { getBestMonth, getWall, getWallCount } from "@/lib/wall";
import { relativeThai } from "@/lib/wall-rules";

import EditHistory from "./edit-history";
import ProfileHeader from "./profile-header";
import RunRow from "./run-row";
import RunsSection from "./runs-section";
import StatsRow from "./stats-row";
import WallBoard from "./wall-board";

export const metadata: Metadata = {
  title: "สมาชิก",
};

function firstParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

/** "2026-09-01" -> "ก.ย." สั้นพอให้ลงช่องตัวเลขที่แคบ */
function shortMonth(monthStart: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    month: "short",
  }).format(new Date(`${monthStart}T00:00:00+07:00`));
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
  // ผลวิ่งในหน้านี้เป็นของรอบเดือนปัจจุบันทั้งหมด จึงใช้เวลาตัดสินตัวเดียวกันได้
  const roundResultsAt = round?.results_at ?? null;

  const [board, runs, edits, wall, wallCount, bestMonth, percentBoard] =
    await Promise.all([
      getLeaderboard(),
      round ? getMemberRuns(id, round.id) : Promise.resolve([]),
      getMemberEdits(id),
      getWall(id),
      getWallCount(id),
      getBestMonth(id),
      getPercentBoard(),
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

  // เวลาแบบ "3 ชม." คิดฝั่งเซิร์ฟเวอร์แล้วส่งเป็นข้อความสำเร็จรูปลงไปให้
  // component เพราะเรียก Date.now() ตอน render ไม่ได้ (react-hooks/purity)
  const messages = wall.map((message) => ({
    ...message,
    timeLabel: relativeThai(message.created_at),
  }));

  // ป้ายอันดับขึ้นเฉพาะตอนเดือนนี้มีระยะจริง
  // ถ้ายังไม่ได้วิ่ง ทุกคนจะได้ 0 เท่ากันหมดแล้วอันดับไม่ได้แปลว่าอะไร
  const hasDistance = Number(standing?.total_km ?? 0) > 0;

  // % ของเป้า ก่อนถึงเวลาเปิดผล ฐานข้อมูลคืน 0 แถวเสมอ จึงต้องดูเฟสของรอบ
  // เพื่อแยกว่า "ยังไม่เปิดผล" กับ "เปิดผลแล้วแต่คนนี้ไม่ได้ตั้งเป้า"
  const revealed = round
    ? roundPhase(round.target_opens_at, round.target_locks_at) === "revealed"
    : false;
  const percentRow = percentBoard.find((row) => row.member_id === id);

  const percentCell = !revealed
    ? { value: "รอเปิดผล", label: "% ของเป้า" }
    : percentRow?.percent
      ? {
          value: formatPercent(percentRow.percent),
          label: `ของเป้า ${percentRow.final_km ? formatKm(percentRow.final_km) : "—"}`,
        }
      : { value: "—", label: "ยังไม่ได้ตั้งเป้า" };

  return (
    <div className="space-y-8">
      {firstParam(params.err) ? (
        <Alert tone="error">{firstParam(params.err)}</Alert>
      ) : null}
      {firstParam(params.msg) ? (
        <Alert tone="success">{firstParam(params.msg)}</Alert>
      ) : null}

      {isSelf ? (
        <div className="flex justify-end">
          <Link
            href="/club/me"
            className="inline-flex min-h-10 items-center rounded-full border border-club-line px-4 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            แก้โปรไฟล์
          </Link>
        </div>
      ) : null}

      <ProfileHeader
        nickname={member.nickname}
        caption={member.caption}
        avatarUrl={member.avatar_url}
        rankNo={hasDistance ? (standing?.rank_no ?? null) : null}
        monthLabel={round ? thaiMonthLabel(round.month) : null}
        bubbles={messages.filter((message) => !message.hidden).slice(0, 3)}
      />

      <StatsRow
        items={[
          {
            value: formatKm(standing?.total_km ?? 0),
            unit: "กม.",
            label: "เดือนนี้",
          },
          percentCell,
          bestMonth
            ? {
                value: formatKm(bestMonth.best_km),
                unit: "กม.",
                label: `ดีสุด · ${shortMonth(bestMonth.best_month)}`,
              }
            : { value: "—", label: "ยังไม่มีสถิติ" },
        ]}
      />

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

      <RunsSection runs={runs} isSelf={isSelf}>
        <ul className="space-y-3">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              proofUrl={signed.get(run.proof_url) ?? null}
              dateLabel={thaiShortDate(run.ran_on)}
              canManage={
                canManage &&
                (viewer.profile.is_admin ||
                  withinEditWindow(run, roundResultsAt))
              }
              withinWindow={withinEditWindow(run, roundResultsAt)}
              hoursLeft={hoursLeftToEdit(run, roundResultsAt)}
              viewerIsAdmin={viewer.profile.is_admin}
            />
          ))}
        </ul>

        <EditHistory edits={edits} editorNames={editorNames} />
      </RunsSection>

      <WallBoard
        ownerId={id}
        ownerName={member.nickname}
        messages={messages}
        count={wallCount}
        viewerName={viewer.profile.nickname}
        viewerAvatar={viewer.profile.avatar_url}
        viewerIsOwner={isSelf}
      />

      <Link
        href="/club"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับกระดาน
      </Link>
    </div>
  );
}
