import Link from "next/link";

import Avatar from "@/components/club/avatar";
import ConfirmSubmit from "@/components/club/confirm-submit";
import { formatBottles } from "@/lib/beer-split";
import {
  CHALLENGE_STATUS_LABEL,
  SHARE_CAP,
  SIDE_LABEL,
  challengePayouts,
  isChallengeStatus,
  isDormant,
  isJoinOpen,
  isSettled,
  maxAddFor,
  potOf,
  previewIfWins,
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
  bangkokMonthEnd,
  daysLeftUntil,
  formatKm,
  thaiDateTimeLong,
} from "@/lib/date";
import type {
  ChallengeRow,
  ChallengeStakeRow,
  Round,
} from "@/lib/supabase/types";

import {
  acceptChallengeAction,
  cancelChallengeAction,
  declineChallengeAction,
} from "./challenges/actions";
import JoinStake from "./challenges/join-stake";
import RuleSuggestions from "./rule-suggestions/rule-suggestions";

const ADD_BUTTON =
  "flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft";

const BACK = "/club?board=challenges";

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
        {row.challenger_nickname} <span className="text-muted">ท้า</span>{" "}
        {row.runner_nickname}
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

/**
 * กล่องฝั่งหนึ่ง มีจำนวนคน รูปคนที่อยู่ฝั่งนี้ และปุ่มเข้าร่วมถ้ายังเข้าได้
 *
 * ป้ายเลขบนรูปคือเบียร์ที่คนนั้นใส่กอง คนท้าใส่กองตั้งต้น เพื่อนขึ้น +1 ถึง +3
 * คนถูกท้ากับเพื่อนที่ร่วมหุ้น +0 ไม่มีป้าย เพราะไม่ได้ทำให้กองโต
 */
function SideBox({
  side,
  sideStakes,
  allStakes,
  canJoin,
  row,
}: {
  side: ChallengeSide;
  sideStakes: ChallengeStakeRow[];
  allStakes: ChallengeStakeRow[];
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
        <span className="text-xs font-medium tabular-nums text-accent-strong">
          {sideStakes.length} คน
        </span>
      </div>

      {sideStakes.length === 0 ? (
        <p className="text-[11px] text-muted">ยังไม่มีใคร</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {sideStakes.map((stake) => (
            <span
              key={stake.profile_id}
              title={
                stake.profile_id === row.challenger_id
                  ? `${stake.nickname} ตั้งกอง ${stake.bottles} ขวด`
                  : stake.profile_id === row.runner_id
                    ? `${stake.nickname} คนถูกท้า`
                    : `${stake.nickname} เติม +${stake.bottles}`
              }
              className="relative block"
            >
              <Avatar
                src={stake.avatar_url}
                nickname={stake.nickname}
                size={26}
              />
              {stake.bottles > 0 ? (
                <span className="absolute -right-1.5 -bottom-1 min-w-4 rounded-full bg-club-line px-1 text-center text-[10px] font-medium tabular-nums text-background">
                  {stake.profile_id === row.challenger_id
                    ? stake.bottles
                    : `+${stake.bottles}`}
                </span>
              ) : null}
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
          maxAdd={maxAddFor(allStakes, side)}
          back={BACK}
        />
      ) : null}
    </div>
  );
}

/**
 * กองกลางของคำท้าหนึ่งใบ: ขนาดกอง สองฝั่ง และพรีวิวว่าใครจะได้เสียคนละเท่าไหร่
 * ใช้ทั้งใบที่รอรับและใบที่กำลังแข่ง เพราะเพื่อนเข้าร่วมได้ตั้งแต่ตอนรอรับ
 */
function PotPanel({
  row,
  stakes,
  canJoin,
  showPreview,
}: {
  row: ChallengeRow;
  stakes: ChallengeStakeRow[];
  canJoin: boolean;
  showPreview: boolean;
}) {
  const pot = potOf(stakes);
  const ifReach = previewIfWins(stakes, "reach");
  const ifMiss = previewIfWins(stakes, "miss");

  return (
    <div className="space-y-2">
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">กองกลาง</span>
        <span className="font-display text-base font-semibold tabular-nums text-accent-strong">
          {formatBottles(pot)}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        <SideBox
          side="reach"
          sideStakes={stakes.filter((stake) => stake.side === "reach")}
          allStakes={stakes}
          canJoin={canJoin}
          row={row}
        />
        <SideBox
          side="miss"
          sideStakes={stakes.filter((stake) => stake.side === "miss")}
          allStakes={stakes}
          canJoin={canJoin}
          row={row}
        />
      </div>

      {/* พรีวิวสองกรณี คนจะได้รู้ตั้งแต่ตอนนี้ว่าเข้าฝั่งไหนแล้วได้เสียเท่าไหร่
          หารเท่ากันทั้งกอง ไม่ปัดเศษ */}
      {showPreview && pot > 0 ? (
        <div className="space-y-0.5 rounded-xl bg-background px-3 py-2 text-[11px] leading-relaxed text-muted">
          <p>
            ถ้าถึง: ฝั่ง{SIDE_LABEL.reach}ได้คนละ{" "}
            <span className="font-medium tabular-nums text-accent-strong">
              +{formatBottles(ifReach.gain)}
            </span>{" "}
            · ฝั่ง{SIDE_LABEL.miss}จ่ายคนละ{" "}
            <span className="tabular-nums">{formatBottles(ifReach.loss)}</span>
          </p>
          <p>
            ถ้าไม่ถึง: ฝั่ง{SIDE_LABEL.miss}ได้คนละ{" "}
            <span className="font-medium tabular-nums text-accent-strong">
              +{formatBottles(ifMiss.gain)}
            </span>{" "}
            · ฝั่ง{SIDE_LABEL.reach}จ่ายคนละ{" "}
            <span className="tabular-nums">{formatBottles(ifMiss.loss)}</span>
          </p>
        </div>
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
        ทั้งกอง {formatBottles(split.pot)} หารเท่ากันทั้งสองฝั่ง
      </p>
      <p className="text-xs leading-relaxed">
        {split.winners.map((payout, index) => (
          <span key={payout.id}>
            {index > 0 ? " · " : ""}
            <span className="font-medium">
              {nameOf.get(payout.id)}
            </span> ได้{" "}
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
            <span className="tabular-nums">
              {formatBottles(payout.bottles)}
            </span>
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
  readOnly,
}: {
  row: ChallengeRow;
  stakes: ChallengeStakeRow[];
  monthEnd: string;
  readOnly: boolean;
}) {
  const status = statusOf(row);
  const totalKm = Number(row.runner_total_km);
  const targetKm = Number(row.target_km);
  const reachedTarget = totalKm >= targetKm;
  const settleLabel = thaiDateTimeLong(row.settle_at);
  const daysLeft = daysLeftUntil(monthEnd);
  const joinOpen = isJoinOpen(row.lock_at);

  // คู่ท้าเติมกองเองไม่ได้ เพื่อนที่ยังไม่ได้ลงเท่านั้นที่เข้าร่วมได้
  const bystander =
    row.my_side === null && !row.i_am_challenger && !row.i_am_runner;
  const canJoin = !readOnly && status === "running" && joinOpen && bystander;
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
        label: "ถึงแล้ว รอตัดสิน",
        tone: "win" as const,
      };
    }
    return { label: CHALLENGE_STATUS_LABEL.running, tone: "live" as const };
  })();

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
              ? `ตัดสินแล้ว ${settleLabel}`
              : daysLeft === 0
                ? // เดือนจบแล้วแต่ยังกรอกผลย้อนหลังได้ ตัวเลขยังขยับได้อยู่
                  `รอผลวิ่งย้อนหลัง ตัดสิน ${settleLabel}`
                : reachedTarget
                  ? `ถึงเป้าแล้ว · อีก ${daysLeft} วันจบเดือน`
                  : `เหลือ ${formatKm(remainingKm(totalKm, targetKm))} กม. · อีก ${daysLeft} วัน`}
          </span>
        </div>
      </div>

      <PotPanel
        row={row}
        stakes={stakes}
        canJoin={canJoin}
        showPreview={!isSettled(status)}
      />

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

/** ใบที่ยังรอคนถูกท้ากดรับ เพื่อนเข้าร่วมได้แล้วตั้งแต่ตอนนี้ */
function PendingCard({
  row,
  stakes,
  readOnly,
}: {
  row: ChallengeRow;
  stakes: ChallengeStakeRow[];
  readOnly: boolean;
}) {
  const bystander =
    row.my_side === null && !row.i_am_challenger && !row.i_am_runner;
  const canJoin = !readOnly && isJoinOpen(row.lock_at) && bystander;
  const ifReach = previewIfWins(stakes, "reach");
  const ifMiss = previewIfWins(stakes, "miss");

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
        {row.challenger_nickname} ตั้งกอง {row.bottles} ขวด · ตอนท้า{" "}
        {row.runner_nickname} วิ่งไปแล้ว {formatKm(row.baseline_km)} กม. ·
        ถ้าไม่กดรับถึง {thaiDateTimeLong(row.lock_at)} คำท้านี้ตกไป
        และทุกคนที่ลงไว้ถือว่าโมฆะ
      </p>

      <PotPanel row={row} stakes={stakes} canJoin={canJoin} showPreview />

      {readOnly ? (
        <p className="text-xs text-muted">เดือนนี้ผ่านไปแล้ว กดอะไรไม่ได้</p>
      ) : row.i_am_runner ? (
        <div className="flex flex-wrap gap-2">
          <form action={acceptChallengeAction}>
            <input type="hidden" name="challenge_id" value={row.challenge_id} />
            <input type="hidden" name="back" value={BACK} />
            <ConfirmSubmit
              label="รับคำท้า"
              question={`รับคำท้าว่าเดือนนี้จะวิ่งให้ถึง ${formatKm(row.target_km)} กม. ใช่ไหม ตอนนี้กองกลาง ${formatBottles(potOf(stakes))} ถ้าถึงฝั่งคุณได้คนละ ${formatBottles(ifReach.gain)} ถ้าไม่ถึงจ่ายคนละ ${formatBottles(ifMiss.loss)} เพื่อนยังเข้าร่วมเพิ่มได้ถึงวันที่ 20 แต่ไม่มีใครจ่ายเกิน ${SHARE_CAP} ขวดต่อคน รับแล้วถอนไม่ได้`}
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

export default async function ChallengeBoard({
  round,
  monthKey,
  readOnly = false,
}: {
  round: Round;
  monthKey?: string;
  readOnly?: boolean;
}) {
  const [challenges, stakeRows] = await Promise.all([
    getRoundChallenges(monthKey),
    getRoundChallengeStakes(monthKey),
  ]);

  const grouped = stakesByChallenge(stakeRows);
  const monthEnd = bangkokMonthEnd(round.month).toISOString();

  // ฐานข้อมูลเรียงมาให้แล้ว กำลังแข่ง → รอรับ → ตัดสินแล้ว → ที่ไม่ได้เกิดขึ้น
  const live = challenges.filter((row) => !isDormant(statusOf(row)));
  const quiet = challenges.filter((row) => isDormant(statusOf(row)));

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-medium">คำท้า</h2>
          <p className="text-sm text-muted">
            กองกลางเดียว เพื่อนเข้าร่วมฝั่งไหนก็ได้ เติม +0 ถึง +3 ขวด
            จบเดือนฝั่งแพ้จ่ายทั้งกอง ฝั่งชนะรับทั้งกอง หารเท่ากัน
            ไม่มีใครจ่ายเกิน {SHARE_CAP} ขวดต่อคน
          </p>
        </div>

        {challenges.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-8 text-center">
            <p className="font-display text-base font-medium">
              ยังไม่มีใครท้าใคร
            </p>
            <p className="text-sm text-muted">เปิดประเดิมเลย</p>
            {readOnly ? null : (
              <Link href="/club/challenges/new" className={ADD_BUTTON}>
                + ท้าเพื่อน
              </Link>
            )}
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {live.map((row) =>
                statusOf(row) === "pending" ? (
                  <PendingCard
                    key={row.challenge_id}
                    row={row}
                    stakes={grouped.get(row.challenge_id) ?? []}
                    readOnly={readOnly}
                  />
                ) : (
                  <ChallengeCard
                    key={row.challenge_id}
                    row={row}
                    stakes={grouped.get(row.challenge_id) ?? []}
                    monthEnd={monthEnd}
                    readOnly={readOnly}
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

            {readOnly ? null : (
              <Link href="/club/challenges/new" className={ADD_BUTTON}>
                + ท้าเพื่อน
              </Link>
            )}
          </>
        )}
      </section>

      {/* เสนอแก้กติกาได้เฉพาะเดือนปัจจุบัน ย้อนดูเดือนเก่าไม่ต้องโชว์ */}
      {readOnly ? null : <RuleSuggestions />}
    </div>
  );
}
