import Link from "next/link";

import Avatar from "@/components/club/avatar";
import ConfirmSubmit from "@/components/club/confirm-submit";
import { thaiDateTime, thaiDateTimeLong } from "@/lib/date";
import {
  findHolders,
  holderPhase,
  hoursLeftToEditPrize,
  slotLabel,
  toDistanceHolders,
  toPercentHolders,
  withinPrizeEditWindow,
  type HolderPhase,
  type HolderRow,
  type PrizeBoard as BoardKind,
} from "@/lib/prize-rules";
import { getRoundDeadlines } from "@/lib/challenges";
import { getRoundPrizes, signPrizeImages } from "@/lib/prizes";
import { getLeaderboard } from "@/lib/runs";
import { roundPhase } from "@/lib/target-rules";
import { getPercentBoard } from "@/lib/targets";
import type { PrizeRow, Round } from "@/lib/supabase/types";

import { deletePrizeAction, revealPrizeAction } from "./prizes/actions";

const ADD_BUTTON =
  "flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft";

/** รูปของรางวัล ของที่ปิดอุบใช้กล่องมีเครื่องหมายคำถามแทน */
function PrizeImage({
  url,
  secret,
}: {
  url: string | null;
  secret: boolean;
}) {
  if (secret) {
    return (
      <span
        aria-hidden
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-display text-2xl font-semibold text-accent-strong"
      >
        ?
      </span>
    );
  }

  if (!url) {
    return (
      <span
        aria-hidden
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-display text-xl text-accent-strong"
      >
        ของ
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover"
    />
  );
}

function HolderLine({
  holders,
  phase,
  settleLabel,
  pendingNote,
}: {
  holders: HolderRow[];
  phase: HolderPhase;
  settleLabel: string | null;
  pendingNote: string | null;
}) {
  // ช่วงรอผลวิ่งย้อนหลัง ยังบอกว่าใครนำอยู่ แต่บอกด้วยว่ายังไม่จบ
  const label =
    phase === "final"
      ? "ได้ไปแล้ว"
      : phase === "waiting"
        ? `รอผลวิ่งย้อนหลัง ตัดสิน ${settleLabel ?? "เร็วๆ นี้"}`
        : "ตอนนี้เป็นของ";

  if (pendingNote) {
    return (
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted">{pendingNote}</p>
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted">{label} · ยังไม่มีใคร</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      {holders.map((holder) => (
        <Link
          key={holder.memberId}
          href={`/club/member/${holder.memberId}`}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Avatar
            src={holder.avatarUrl}
            nickname={holder.nickname}
            size={28}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {holder.nickname}
          </span>
          <span className="shrink-0 font-display text-sm font-semibold text-accent-strong">
            {holder.valueLabel}
          </span>
        </Link>
      ))}
    </div>
  );
}

function PrizeCard({
  prize,
  imageUrl,
  holders,
  phase,
  settleLabel,
  pendingNote,
  readOnly,
}: {
  prize: PrizeRow;
  imageUrl: string | null;
  holders: HolderRow[];
  phase: HolderPhase;
  settleLabel: string | null;
  pendingNote: string | null;
  readOnly: boolean;
}) {
  const secretToOthers = prize.is_secret;
  const hiddenFromMe = secretToOthers && !prize.is_mine;
  const canEdit =
    !readOnly && prize.is_mine && withinPrizeEditWindow(prize.created_at);

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex gap-3 p-4">
        <PrizeImage url={imageUrl} secret={hiddenFromMe} />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-strong">
              {slotLabel(prize.board as BoardKind, prize.rank_no, prize.is_booby)}
            </span>
            {prize.is_mine ? (
              <span className="rounded-full bg-club-line px-2.5 py-0.5 text-xs text-background">
                ของคุณ
              </span>
            ) : null}
          </div>

          <p className="font-display text-base font-medium">
            {hiddenFromMe ? "ของขวัญปิดอุบ" : prize.title}
          </p>

          {hiddenFromMe ? (
            <p className="text-xs text-muted">เปิดตอนจบเดือน</p>
          ) : prize.detail ? (
            <p className="text-xs text-muted">{prize.detail}</p>
          ) : null}

          {prize.is_mine && secretToOthers ? (
            <p className="text-xs text-accent-strong">คนอื่นยังไม่เห็น</p>
          ) : null}

          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-xs text-muted">สปอนเซอร์โดย</span>
            <Avatar
              src={prize.sponsor_avatar_url}
              nickname={prize.sponsor_nickname}
              size={20}
            />
            <span className="truncate text-xs">{prize.sponsor_nickname}</span>
          </div>
        </div>
      </div>

      {prize.is_mine && !readOnly ? (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {secretToOthers ? (
            <form action={revealPrizeAction}>
              <input type="hidden" name="prize_id" value={prize.prize_id} />
              <ConfirmSubmit
                label="เปิดให้ทุกคนเห็น"
                question={`เปิดให้ทุกคนเห็น "${prize.title}" เลยไหม เปิดแล้วปิดกลับไม่ได้`}
                confirmLabel="เปิดเลย"
                pendingLabel="กำลังเปิด…"
              />
            </form>
          ) : null}

          {canEdit ? (
            <>
              <Link
                href={`/club/prizes/${prize.prize_id}/edit`}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
              >
                แก้
              </Link>
              <form action={deletePrizeAction}>
                <input type="hidden" name="prize_id" value={prize.prize_id} />
                <input type="hidden" name="back" value="/club?board=rewards" />
                <ConfirmSubmit
                  label="ลบ"
                  question={`ลบรางวัล "${prize.title}" ใช่ไหม`}
                  confirmLabel="ใช่ ลบเลย"
                  pendingLabel="กำลังลบ…"
                />
              </form>
              <span className="inline-flex min-h-11 items-center text-xs text-muted">
                แก้ได้อีก {hoursLeftToEditPrize(prize.created_at)} ชม.
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      <HolderLine
        holders={holders}
        phase={phase}
        settleLabel={settleLabel}
        pendingNote={pendingNote}
      />
    </li>
  );
}

export default async function PrizeBoard({
  round,
  monthKey,
  readOnly = false,
}: {
  round: Round;
  monthKey?: string;
  readOnly?: boolean;
}) {
  const targetPhase = roundPhase(round.target_opens_at, round.target_locks_at);

  const [prizes, distanceRows, percentRows, deadlines] = await Promise.all([
    getRoundPrizes(monthKey),
    getLeaderboard(monthKey),
    // ก่อนเปิดผลเป้า ฝั่งฐานข้อมูลคืน 0 แถวอยู่แล้ว ไม่ต้องเรียกให้เปลือง
    targetPhase === "revealed" ? getPercentBoard(monthKey) : Promise.resolve([]),
    getRoundDeadlines(monthKey),
  ]);

  // ของจะเป็นของใครแน่ ต้องรอพ้นช่วงกรอกผลวิ่งย้อนหลังก่อน
  // ไม่ใช่แค่หมดเดือน เวลาตัดสินมาจากฐานข้อมูล ไม่ได้เขียนวันที่ไว้ตรงนี้
  const phase = deadlines
    ? holderPhase(deadlines.month_end, deadlines.settle_at)
    : "live";
  const settleLabel = deadlines
    ? thaiDateTimeLong(deadlines.settle_at)
    : null;

  const signed = await signPrizeImages(
    prizes
      .map((prize) => prize.image_path)
      .filter((path): path is string => path !== null),
  );

  const distanceHolders = toDistanceHolders(distanceRows);
  const percentHolders = toPercentHolders(percentRows);

  // กระดาน % ยังไม่เปิดผล ก็ยังไม่รู้ว่าใครครองอันดับไหน
  const percentPending =
    targetPhase === "revealed"
      ? null
      : `รู้ผลหลังเปิดเป้า ${thaiDateTime(round.target_locks_at)}`;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">รางวัลเดือนนี้</h2>
        <p className="text-sm text-muted">
          ใครอยู่อันดับนั้นตอนจบเดือน ได้ไปเลย
        </p>
      </div>

      {prizes.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-8 text-center">
          <p className="font-display text-base font-medium">
            เดือนนี้ยังไม่มีใครตั้งรางวัล
          </p>
          <p className="text-sm text-muted">เป็นคนแรกเลย</p>
          {readOnly ? null : (
            <Link href="/club/prizes/new" className={ADD_BUTTON}>
              + ตั้งรางวัล
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {prizes.map((prize) => {
              const isDistance = prize.board === "distance";
              const holders = findHolders(
                isDistance ? distanceHolders : percentHolders,
                prize.rank_no,
                prize.is_booby,
              );

              return (
                <PrizeCard
                  key={prize.prize_id}
                  prize={prize}
                  imageUrl={
                    prize.image_path
                      ? (signed.get(prize.image_path) ?? null)
                      : null
                  }
                  holders={holders}
                  phase={phase}
                  settleLabel={settleLabel}
                  pendingNote={isDistance ? null : percentPending}
                  readOnly={readOnly}
                />
              );
            })}
          </ul>

          {readOnly ? null : (
            <Link href="/club/prizes/new" className={ADD_BUTTON}>
              + ตั้งรางวัล
            </Link>
          )}
        </>
      )}
    </section>
  );
}
