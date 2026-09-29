import Link from "next/link";

import Avatar from "@/components/club/avatar";
import { formatKm, thaiDateTime } from "@/lib/date";
import {
  heaviestHand,
  kindestHeart,
  mostPiledOn,
  votesBySubject,
  type AwardWinner,
} from "@/lib/reward-rules";
import { roundPhase, signedDelta } from "@/lib/target-rules";
import { getRoundTargets, getVoteBreakdown } from "@/lib/targets";
import type { Round, VoteBreakdownRow } from "@/lib/supabase/types";

/** สีป้ายตามเครื่องหมาย ใช้ token เดิมทั้งหมด บวกสีลบที่เพิ่งเพิ่มหนึ่งตัว */
function badgeClass(delta: number) {
  if (delta > 0) return "bg-accent-strong text-background";
  if (delta < 0) return "bg-negative text-background";
  return "bg-border text-muted";
}

function AwardCard({
  title,
  winner,
  line,
}: {
  title: string;
  winner: AwardWinner;
  line: string;
}) {
  return (
    <li className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface p-3 text-center">
      <span className="text-[11px] tracking-wide text-accent-strong">
        {title}
      </span>
      <Avatar src={winner.avatarUrl} nickname={winner.nickname} size={40} />
      <span className="w-full truncate text-xs font-medium">
        {winner.nickname}
      </span>
      <span className="text-[11px] leading-snug text-muted">{line}</span>
    </li>
  );
}

function VoterChip({ vote }: { vote: VoteBreakdownRow }) {
  return (
    <Link
      href={`/club/member/${vote.voter_id}`}
      title={`${vote.voter_nickname} ${signedDelta(vote.delta)}`}
      className="relative block shrink-0 transition-opacity hover:opacity-80"
    >
      <Avatar src={vote.voter_avatar_url} nickname={vote.voter_nickname} size={40} />
      <span
        className={`absolute -right-1 -bottom-1 min-w-6 rounded-full px-1.5 text-center text-[11px] font-medium tabular-nums ${badgeClass(vote.delta)}`}
      >
        {signedDelta(vote.delta)}
      </span>
    </Link>
  );
}

export default async function RewardsTab({ round }: { round: Round }) {
  const phase = roundPhase(round.target_opens_at, round.target_locks_at);

  // ก่อนเวลาเปิดผลไม่ต้องยิง RPC เลย และถึงยิงไปฐานข้อมูลก็คืน 0 แถวอยู่ดี
  if (phase !== "revealed") {
    return (
      <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
        <p className="font-display text-lg font-medium">ใครปรับเป้าใคร</p>
        <p className="mt-2 text-sm text-muted">
          จะเปิด {thaiDateTime(round.target_locks_at)}
        </p>
      </section>
    );
  }

  const [targets, breakdown] = await Promise.all([
    getRoundTargets(),
    getVoteBreakdown(),
  ]);

  if (targets.length === 0) {
    return (
      <p className="text-sm text-muted">เดือนนี้ยังไม่มีใครตั้งเป้า</p>
    );
  }

  const heaviest = heaviestHand(breakdown);
  const kindest = kindestHeart(breakdown);
  const piledOn = mostPiledOn(breakdown);
  const grouped = votesBySubject(breakdown);

  // โดนบวกมากสุดอยู่บน ไล่ลงไปหาคนที่โดนลบมากสุด
  const ordered = [...targets].sort(
    (a, b) => b.total_delta - a.total_delta || a.nickname.localeCompare(b.nickname, "th"),
  );

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">ใครปรับเป้าใคร</h2>
        <p className="text-sm text-muted">
          เปิดผลแล้ว {thaiDateTime(round.target_locks_at)} · จำไว้
          เดือนหน้าเอาคืนได้
        </p>
      </div>

      {/* การ์ดรางวัลขำๆ ใบไหนไม่มีข้อมูลเข้าเงื่อนไขก็ไม่ต้องโผล่ */}
      {heaviest || kindest || piledOn ? (
        <ul className="grid grid-cols-3 gap-2">
          {heaviest ? (
            <AwardCard
              title="มือหนักสุด"
              winner={heaviest}
              line={`บวกใส่เพื่อน รวม ${signedDelta(heaviest.total)}`}
            />
          ) : null}
          {kindest ? (
            <AwardCard
              title="ใจดีสุด"
              winner={kindest}
              line={`ลบให้เพื่อน รวม ${signedDelta(kindest.total)}`}
            />
          ) : null}
          {piledOn ? (
            <AwardCard
              title="โดนรุมสุด"
              winner={piledOn}
              line={`โดน ${signedDelta(piledOn.total)} จาก ${piledOn.voteCount} คน`}
            />
          ) : null}
        </ul>
      ) : null}

      <ul className="space-y-3">
        {ordered.map((row) => {
          const votes = grouped.get(row.member_id) ?? [];
          const cancelledOut = row.total_delta === 0 && votes.length > 0;

          return (
            <li
              key={row.member_id}
              className="space-y-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={row.avatar_url}
                  nickname={row.nickname}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.nickname}</p>
                  <p className="truncate text-xs text-muted">
                    ตั้ง {formatKm(row.base_km)} → เป้าจริง{" "}
                    {formatKm(row.final_km)} กม.
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium tabular-nums ${badgeClass(row.total_delta)}`}
                >
                  {row.total_delta === 0 ? "±0" : signedDelta(row.total_delta)}
                </span>
              </div>

              {votes.length === 0 ? (
                <p className="text-xs text-muted">ไม่มีใครแตะ</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-3 pr-2 pb-1">
                    {votes.map((vote) => (
                      <VoterChip key={vote.voter_id} vote={vote} />
                    ))}
                  </div>
                  {cancelledOut ? (
                    <p className="text-xs text-muted">
                      โดนบวกกับโดนลบหักล้างกันพอดี
                    </p>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
