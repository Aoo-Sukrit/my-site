import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import Avatar from "@/components/club/avatar";
import { requireApproved } from "@/lib/auth";
import { formatKm, thaiDateTimeLong, thaiMonthLabel } from "@/lib/date";
import { getCurrentRound } from "@/lib/runs";
import { PHASE_LABEL, roundPhase } from "@/lib/target-rules";
import {
  getMyTargetState,
  getMyVotes,
  getRoundTargets,
  getVotableMembers,
} from "@/lib/targets";

import TargetForm from "./target-form";
import VoteCard, { signedDelta } from "./vote-card";

export const metadata: Metadata = {
  title: "เป้าเดือนนี้",
};

export default async function TargetPage() {
  await requireApproved();
  const round = await getCurrentRound();

  if (!round) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          เป้าเดือนนี้
        </h1>
        <Alert tone="error">
          ยังไม่มีรอบของเดือนนี้ ถ้าเพิ่งรัน supabase/006_targets.sql
          ลองรีเฟรชอีกครั้ง
        </Alert>
      </div>
    );
  }

  const phase = roundPhase(round.target_opens_at, round.target_locks_at);
  const monthLabel = thaiMonthLabel(round.month);

  return (
    <div className="space-y-8 pb-10">
      <header className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">TARGET</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          เป้าเดือน{monthLabel}
        </h1>
        <p className="text-sm text-muted">
          {PHASE_LABEL[phase]} ·{" "}
          {phase === "revealed"
            ? `เปิดผลตั้งแต่ ${thaiDateTimeLong(round.target_locks_at)}`
            : phase === "open"
              ? `ปิดรับ ${thaiDateTimeLong(round.target_locks_at)}`
              : `เปิด ${thaiDateTimeLong(round.target_opens_at)}`}
        </p>
      </header>

      {phase === "before" ? <BeforePhase opensAt={round.target_opens_at} /> : null}
      {phase === "open" ? <OpenPhase /> : null}
      {phase === "revealed" ? <RevealedPhase /> : null}

      <Link
        href="/club"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับกระดาน
      </Link>
    </div>
  );
}

function BeforePhase({ opensAt }: { opensAt: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
      <p className="font-display text-lg font-medium">ยังไม่เปิดให้ตั้งเป้า</p>
      <p className="mt-2 text-sm text-muted">
        เปิด {thaiDateTimeLong(opensAt)} แล้วค่อยกลับมาใหม่
      </p>
    </section>
  );
}

async function OpenPhase() {
  const [mine, votable, myVotes] = await Promise.all([
    getMyTargetState(),
    getVotableMembers(),
    getMyVotes(),
  ]);

  return (
    <>
      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">เป้าของคุณ</h2>

        {mine?.has_target ? (
          <div className="space-y-2 rounded-2xl border border-border bg-surface p-5">
            <p className="font-display text-3xl font-semibold text-accent-strong">
              {formatKm(mine.base_km ?? 0)}{" "}
              <span className="text-base font-normal text-muted">กม.</span>
            </p>
            <p className="text-sm">
              มี {mine.vote_count} คนปรับเป้าคุณแล้ว
            </p>
            <p className="text-sm text-muted">
              ยังไม่รู้ว่าบวกหรือลบ ต้องรอถึงเวลาเปิดผลถึงจะเห็น
            </p>
          </div>
        ) : (
          <TargetForm />
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-medium">
            ปรับเป้าเพื่อน{" "}
            {mine?.has_target ? (
              <span className="text-muted">({votable.length})</span>
            ) : null}
          </h2>
          <p className="text-sm text-muted">
            คนละหนึ่งครั้งต่อหนึ่งคน ไม่โหวตก็ได้ ถือว่าเป้านั้นเหมาะสมแล้ว
            ทุกคนมองไม่เห็นเป้าของกันและกันจนกว่าจะเปิดผล
          </p>
        </div>

        {/* ยังไม่ลงเดิมพันของตัวเอง ก็ยังไม่มีสิทธิ์ขยับของคนอื่น
            ฐานข้อมูลกันไว้แล้วทั้งใน vote_on_target() และ votable_members()
            ตรงนี้แค่บอกให้รู้ว่าทำไมยังไม่เห็นใคร แทนที่จะโชว์รายชื่อว่างๆ */}
        {!mine?.has_target ? (
          <div className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-8 text-center">
            <p className="font-display text-base font-medium">
              ตั้งเป้าของตัวเองก่อน
            </p>
            <p className="mt-1 text-sm text-muted">
              ล็อกเป้าด้านบนแล้วจะปลดล็อกการปรับเป้าเพื่อน
            </p>
          </div>
        ) : votable.length === 0 ? (
          <p className="text-sm text-muted">
            ตอนนี้ยังไม่มีใครให้โหวต รอเพื่อนตั้งเป้าก่อน
          </p>
        ) : (
          <ul className="space-y-3">
            {votable.map((member) => (
              <VoteCard key={member.member_id} member={member} />
            ))}
          </ul>
        )}
      </section>

      {myVotes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-medium">
            โหวตไปแล้ว <span className="text-muted">({myVotes.length})</span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {myVotes.map((vote) => (
              <li
                key={vote.subject_id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Avatar
                  src={vote.avatar_url}
                  nickname={vote.nickname}
                  size={36}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {vote.nickname}
                </span>
                <span className="font-display text-sm font-semibold tabular-nums text-accent-strong">
                  {signedDelta(vote.delta)} กม.
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

async function RevealedPhase() {
  const rows = await getRoundTargets();

  if (rows.length === 0) {
    return (
      <Alert tone="info">
        รอบนี้ไม่มีใครตั้งเป้าไว้เลย
      </Alert>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">
          เป้าจริงของทุกคน <span className="text-muted">({rows.length})</span>
        </h2>
        <p className="text-sm text-muted">
          ไม่บอกว่าใครโหวตใคร ให้เดากันเอง สนุกกว่า
        </p>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((row) => (
          <li key={row.member_id} className="flex items-center gap-3 px-4 py-3">
            <Avatar src={row.avatar_url} nickname={row.nickname} size={40} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.nickname}</p>
              <p className="truncate text-xs text-muted">
                ตั้งไว้ {formatKm(row.base_km)} · เพื่อนปรับ{" "}
                {signedDelta(row.total_delta)} · {row.vote_count} คนโหวต
              </p>
            </div>

            <span className="shrink-0 font-display text-base font-semibold text-accent-strong">
              {formatKm(row.final_km)}
              <span className="text-xs font-normal text-muted"> กม.</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
