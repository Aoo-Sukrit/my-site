import Link from "next/link";

import Avatar from "@/components/club/avatar";
import ConfirmSubmit from "@/components/club/confirm-submit";
import { formatBottles } from "@/lib/beer-split";
import {
  CHALLENGE_STATUS_LABEL,
  SIDE_LABEL,
  challengePayouts,
  isChallengeStatus,
  isDormant,
  isJoinOpen,
  isSettled,
  progressPercent,
  remainingKm,
  type ChallengeSide,
  type ChallengeStatus,
} from "@/lib/challenge-rules";
import {
  getRoundChallengeStakes,
  getRoundChallenges,
  stakesByChallenge,
} from "@/lib/challenges";
import {
  bangkokDayOfMonth,
  bangkokMonthEnd,
  daysLeftUntil,
  formatKm,
  thaiDateTimeLong,
} from "@/lib/date";
import type { ChallengeRow, ChallengeStakeRow, Round } from "@/lib/supabase/types";

import {
  acceptChallengeAction,
  cancelChallengeAction,
  declineChallengeAction,
} from "./challenges/actions";
import JoinStake from "./challenges/join-stake";

const ADD_BUTTON =
  "flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft";

const BACK = "/club?board=rewards";

/** สถานะที่ฐานข้อมูลส่งมาเป็นสตริง แปลงให้เป็นชนิดที่รู้จัก */
function statusOf(row: ChallengeRow): ChallengeStatus {
  return isChallengeStatus(row.status) ? row.status : "pending";
}

function MemberChip({
  id,
  nickname,
  avatarUrl,
  size = 28,
}: {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  size?: number;
}) {
  return (
    <Link
      href={`/club/member/${id}`}
      title={nickname}
      className="shrink-0 transition-opacity hover:opacity-80"
    >
      <Avatar src={avatarUrl} nickname={nickname} size={size} />
    </Link>
  );
}

/** หัวการ์ด รูปคนท้า ลูกศร รูปคนถูกท้า แล้วตามด้วยชื่อ */
function Matchup({ row }: { row: ChallengeRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberChip
        id={row.challenger_id}
        nickname={row.challenger_nickname}
        avatarUrl={row.challenger_avatar_url}
      />
      <span aria-hidden className="shrink-0 text-sm text-muted">
        →
      </span>
      <MemberChip
        id={row.runner_id}
        nickname={row.runner_nickname}
        avatarUrl={row.runner_avatar_url}
      />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {row.challenger_nickname}{" "}
        <span className="text-muted">ท้า</span> {row.runner_nickname}
      </p>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "live" | "win" | "lose" | "quiet";
}) {
  const style = {
    live: "bg-accent-soft text-accent-strong",
    win: "bg-accent-strong text-background",
    lose: "bg-border text-muted",
    quiet: "bg-border text-muted",
  }[tone];

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

function ProgressBar({
  totalKm,
  targetKm,
  done,
}: {
  totalKm: number;
  targetKm: number;
  done: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progressPercent(totalKm, targetKm))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`วิ่งไปแล้ว ${formatKm(totalKm)} จาก ${formatKm(targetKm)} กม.`}
      className="h-2.5 w-full overflow-hidden rounded-full bg-border"
    >
      <span
        className={`block h-full rounded-full ${done ? "bg-accent-strong" : "bg-club-line"}`}
        style={{ width: `${progressPercent(totalKm, targetKm)}%` }}
      />
    </div>
  );
}

/** กล่องข้างหนึ่ง มีจำนวนรวม รูปคนที่ลง และปุ่มลงเพิ่มถ้ายังลงได้ */
function SideBox({
  side,
  bottles,
  stakes,
  canJoin,
  row,
}: {
  side: ChallengeSide;
  bottles: number;
  stakes: ChallengeStakeRow[];
  canJoin: boolean;
  row: ChallengeRow;
}) {
  const mine = row.my_side === side;

  return (
    <div
      className={`space-y-2 rounded-xl border p-3 ${
        mine ? "border-club-line bg-accent-soft" : "border-border bg-background"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">{SIDE_LABEL[side]}</span>
        <span className="font-display text-sm font-semibold tabular-nums text-accent-strong">
          {bottles} ขวด
        </span>
      </div>

      {stakes.length === 0 ? (
        <p className="text-[11px] text-muted">ยังไม่มีใคร</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {stakes.map((stake) => (
            <span
              key={stake.profile_id}
              title={`${stake.nickname} ${stake.bottles} ขวด`}
              className="relative block"
            >
              <Avatar
                src={stake.avatar_url}
                nickname={stake.nickname}
                size={26}
              />
              <span className="absolute -right-1 -bottom-1 min-w-4 rounded-full bg-club-line px-1 text-center text-[10px] font-medium tabular-nums text-background">
                {stake.bottles}
              </span>
            </span>
          ))}
        </div>
      )}

      {mine ? (
        <p className="text-[11px] text-accent-strong">คุณลงข้างนี้</p>
      ) : canJoin ? (
        <JoinStake
          challengeId={row.challenge_id}
          side={side}
          runnerNickname={row.runner_nickname}
          targetKm={formatKm(row.target_km)}
        />
      ) : null}
    </div>
  );
}

/** ใครได้ใครเสียหลังตัดสิน */
function PayoutLine({
  status,
  stakes,
}: {
  status: ChallengeStatus;
  stakes: ChallengeStakeRow[];
}) {
  const split = challengePayouts(status, stakes);
  if (split.pot === 0) return null;

  const nameOf = new Map(stakes.map((s) => [s.profile_id, s.nickname]));

  return (
    <div className="space-y-1 border-t border-border pt-3">
      <p className="text-[11px] text-muted">
        ฝั่ง{status === "reached" ? SIDE_LABEL.reach : SIDE_LABEL.miss}ชนะ ·
        เบียร์ที่เปลี่ยนมือ {formatBottles(split.pot)}
      </p>
      <p className="text-xs leading-relaxed">
        {split.winners.map((payout, index) => (
          <span key={payout.id}>
            {index > 0 ? " · " : ""}
            <span className="font-medium">{nameOf.get(payout.id)}</span> ได้{" "}
            <span className="tabular-nums text-accent-strong">
              {formatBottles(payout.bottles)}
            </span>
          </span>
        ))}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        {split.losers.map((payout, index) => (
          <span key={payout.id}>
            {index > 0 ? " · " : ""}
            {nameOf.get(payout.id)} จ่าย{" "}
            <span className="tabular-nums">{formatBottles(payout.bottles)}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

/** ใบที่ไม่ได้เกิดขึ้นจริง ปฏิเสธ ยกเลิก หรือตกไป แสดงจางๆ ไว้เป็นประวัติ */
function QuietCard({
  row,
  status,
}: {
  row: ChallengeRow;
  status: ChallengeStatus;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 opacity-60">
      <Avatar
        src={row.challenger_avatar_url}
        nickname={row.challenger_nickname}
        size={22}
      />
      <span aria-hidden className="text-xs text-muted">
        →
      </span>
      <Avatar
        src={row.runner_avatar_url}
        nickname={row.runner_nickname}
        size={22}
      />
      <p className="min-w-0 flex-1 truncate text-xs text-muted">
        {row.challenger_nickname} ท้า {row.runner_nickname} ถึง{" "}
        {formatKm(row.target_km)} กม.
      </p>
      <StatusBadge label={CHALLENGE_STATUS_LABEL[status]} tone="quiet" />
    </li>
  );
}

function ChallengeCard({
  row,
  stakes,
  monthEnd,
}: {
  row: ChallengeRow;
  stakes: ChallengeStakeRow[];
  monthEnd: string;
}) {
  const status = statusOf(row);
  const totalKm = Number(row.runner_total_km);
  const targetKm = Number(row.target_km);
  const reachedTarget = totalKm >= targetKm;
  const settleDay = bangkokDayOfMonth(row.settle_at);
  const daysLeft = daysLeftUntil(monthEnd);
  const joinOpen = isJoinOpen(row.lock_at);

  // คู่กรณีสองคนวางเบียร์ไว้ตั้งแต่กดรับแล้ว ลงเพิ่มไม่ได้
  const bystander =
    row.my_side === null && !row.i_am_challenger && !row.i_am_runner;
  const canJoin = status === "running" && joinOpen && bystander;
  // คนนอกที่ยังไม่ได้ลง แต่หมดเวลาแล้ว ควรรู้ว่าทำไมไม่มีปุ่ม
  const missedTheWindow = status === "running" && !joinOpen && bystander;

  const badge = (() => {
    if (status === "reached") {
      return { label: "ถึงแล้ว ✓", tone: "win" as const };
    }
    if (status === "missed") {
      return { label: "ไม่ถึง", tone: "lose" as const };
    }
    if (reachedTarget) {
      return {
        label: `ถึงแล้ว รอตัดสินวันที่ ${settleDay}`,
        tone: "win" as const,
      };
    }
    return { label: CHALLENGE_STATUS_LABEL.running, tone: "live" as const };
  })();

  const reachStakes = stakes.filter((stake) => stake.side === "reach");
  const missStakes = stakes.filter((stake) => stake.side === "miss");

  return (
    <li className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Matchup row={row} />
        <StatusBadge label={badge.label} tone={badge.tone} />
      </div>

      <p className="font-display text-base font-medium">
        ระยะรวมเดือนนี้ถึง {formatKm(row.target_km)} กม.
      </p>

      <div className="space-y-1.5">
        <ProgressBar
          totalKm={totalKm}
          targetKm={targetKm}
          done={reachedTarget}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-medium tabular-nums">
            {formatKm(totalKm)}{" "}
            <span className="text-xs font-normal text-muted">
              / {formatKm(targetKm)} กม.
            </span>
          </span>
          <span className="text-xs text-muted">
            {isSettled(status)
              ? `ตัดสินวันที่ ${settleDay} แล้ว`
              : reachedTarget
                ? `รอผลวิ่งย้อนหลัง ตัดสินวันที่ ${settleDay}`
                : `เหลือ ${formatKm(remainingKm(totalKm, targetKm))} กม. · อีก ${daysLeft} วัน`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SideBox
          side="reach"
          bottles={row.reach_bottles}
          stakes={reachStakes}
          canJoin={canJoin}
          row={row}
        />
        <SideBox
          side="miss"
          bottles={row.miss_bottles}
          stakes={missStakes}
          canJoin={canJoin}
          row={row}
        />
      </div>

      {isSettled(status) ? (
        <PayoutLine status={status} stakes={stakes} />
      ) : null}

      {missedTheWindow ? (
        <p className="text-[11px] text-muted">
          ปิดรับลงเพิ่มไปแล้วเมื่อ {thaiDateTimeLong(row.lock_at)}
        </p>
      ) : null}
    </li>
  );
}

/** ใบที่ยังรอคนถูกท้ากดรับ */
function PendingCard({ row }: { row: ChallengeRow }) {
  return (
    <li className="space-y-3 rounded-2xl border border-dashed border-club-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Matchup row={row} />
        <StatusBadge label={CHALLENGE_STATUS_LABEL.pending} tone="live" />
      </div>

      <p className="font-display text-base font-medium">
        ระยะรวมเดือนนี้ถึง {formatKm(row.target_km)} กม.
      </p>
      <p className="text-xs text-muted">
        วางไว้ข้างละ {row.bottles} ขวด · ตอนท้า {row.runner_nickname} วิ่งไปแล้ว{" "}
        {formatKm(row.baseline_km)} กม. · ถ้าไม่มีใครกดถึง{" "}
        {thaiDateTimeLong(row.lock_at)} คำท้านี้ตกไป
      </p>

      {row.i_am_runner ? (
        <div className="flex flex-wrap gap-2">
          <form action={acceptChallengeAction}>
            <input type="hidden" name="challenge_id" value={row.challenge_id} />
            <input type="hidden" name="back" value={BACK} />
            <ConfirmSubmit
              label="รับคำท้า"
              question={`รับคำท้าว่าเดือนนี้จะวิ่งให้ถึง ${formatKm(row.target_km)} กม. และวาง ${row.bottles} ขวดข้าง${SIDE_LABEL.reach} ใช่ไหม รับแล้วถอนไม่ได้`}
              confirmLabel="รับเลย"
              pendingLabel="กำลังรับ…"
            />
          </form>
          <form action={declineChallengeAction}>
            <input type="hidden" name="challenge_id" value={row.challenge_id} />
            <input type="hidden" name="back" value={BACK} />
            <ConfirmSubmit
              label="ไม่รับ"
              question={`ปฏิเสธคำท้าของ ${row.challenger_nickname} ใช่ไหม`}
              confirmLabel="ใช่ ไม่รับ"
              pendingLabel="กำลังปฏิเสธ…"
            />
          </form>
        </div>
      ) : row.i_am_challenger ? (
        <form action={cancelChallengeAction}>
          <input type="hidden" name="challenge_id" value={row.challenge_id} />
          <input type="hidden" name="back" value={BACK} />
          <ConfirmSubmit
            label="ยกเลิกคำท้า"
            question={`ถอนคำท้าที่ท้า ${row.runner_nickname} ใช่ไหม`}
            confirmLabel="ใช่ ถอนเลย"
            pendingLabel="กำลังถอน…"
          />
        </form>
      ) : (
        <p className="text-xs text-muted">รอ {row.runner_nickname} กดรับอยู่</p>
      )}
    </li>
  );
}

export default async function ChallengeBoard({ round }: { round: Round }) {
  const [challenges, stakeRows] = await Promise.all([
    getRoundChallenges(),
    getRoundChallengeStakes(),
  ]);

  const grouped = stakesByChallenge(stakeRows);
  const monthEnd = bangkokMonthEnd(round.month).toISOString();

  // ฐานข้อมูลเรียงมาให้แล้ว กำลังแข่ง → รอรับ → ตัดสินแล้ว → ที่ไม่ได้เกิดขึ้น
  const live = challenges.filter((row) => !isDormant(statusOf(row)));
  const quiet = challenges.filter((row) => isDormant(statusOf(row)));

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">คำท้า</h2>
        <p className="text-sm text-muted">
          ท้าแล้วถอนไม่ได้ ใครจะลงเพิ่มก็ได้ จบเดือนตัดสินจากระยะจริง
        </p>
      </div>

      {challenges.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-8 text-center">
          <p className="font-display text-base font-medium">
            ยังไม่มีใครท้าใคร
          </p>
          <p className="text-sm text-muted">เปิดประเดิมเลย</p>
          <Link href="/club/challenges/new" className={ADD_BUTTON}>
            + ท้าเพื่อน
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {live.map((row) =>
              statusOf(row) === "pending" ? (
                <PendingCard key={row.challenge_id} row={row} />
              ) : (
                <ChallengeCard
                  key={row.challenge_id}
                  row={row}
                  stakes={grouped.get(row.challenge_id) ?? []}
                  monthEnd={monthEnd}
                />
              ),
            )}
          </ul>

          {quiet.length > 0 ? (
            <ul className="space-y-2">
              {quiet.map((row) => (
                <QuietCard
                  key={row.challenge_id}
                  row={row}
                  status={statusOf(row)}
                />
              ))}
            </ul>
          ) : null}

          <Link href="/club/challenges/new" className={ADD_BUTTON}>
            + ท้าเพื่อน
          </Link>
        </>
      )}
    </section>
  );
}
