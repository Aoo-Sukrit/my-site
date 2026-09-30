import Avatar from "@/components/club/avatar";
import ConfirmSubmit from "@/components/club/confirm-submit";
import {
  CHALLENGE_STATUS_LABEL,
  isChallengeStatus,
} from "@/lib/challenge-rules";
import { getRoundChallenges } from "@/lib/challenges";
import { formatKm, thaiMonthLabel } from "@/lib/date";
import type { Round } from "@/lib/supabase/types";

import { adminDeleteChallengeAction } from "../challenges/actions";

/**
 * รายการคำท้าของเดือนนี้สำหรับแอดมิน พร้อมปุ่มลบ
 *
 * คำท้าไม่ได้ปิดอุบ แอดมินเห็นข้อมูลชุดเดียวกับทุกคนอยู่แล้ว
 * ปุ่มลบมีไว้เผื่อมีคำท้าที่ไม่เหมาะสม ลบแล้วเบียร์ที่วางไว้หายตามไปทั้งใบ
 */
export default async function ChallengeList({ round }: { round: Round }) {
  const challenges = await getRoundChallenges();

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">
          คำท้าเดือน{thaiMonthLabel(round.month)}{" "}
          <span className="text-muted">({challenges.length})</span>
        </h2>
        <p className="text-sm text-muted">
          ลบได้ตลอดในฐานะแอดมิน ลบแล้วเบียร์ที่ทุกคนวางไว้ในใบนั้นหายด้วย
          กู้คืนไม่ได้
        </p>
      </div>

      {challenges.length === 0 ? (
        <p className="text-sm text-muted">เดือนนี้ยังไม่มีใครท้าใคร</p>
      ) : (
        <ul className="space-y-3">
          {challenges.map((row) => {
            const status = isChallengeStatus(row.status)
              ? row.status
              : "pending";

            return (
              <li
                key={row.challenge_id}
                className="space-y-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    src={row.challenger_avatar_url}
                    nickname={row.challenger_nickname}
                    size={24}
                  />
                  <span aria-hidden className="text-xs text-muted">
                    →
                  </span>
                  <Avatar
                    src={row.runner_avatar_url}
                    nickname={row.runner_nickname}
                    size={24}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {row.challenger_nickname} ท้า {row.runner_nickname}
                  </p>
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-strong">
                    {CHALLENGE_STATUS_LABEL[status]}
                  </span>
                </div>

                <p className="text-xs text-muted">
                  เป้า {formatKm(row.target_km)} กม. · ตอนนี้{" "}
                  {formatKm(row.runner_total_km)} กม. · ข้างละ {row.bottles} ขวด
                  ตั้งต้น · รวมตอนนี้{" "}
                  {row.reach_bottles + row.miss_bottles} ขวด
                </p>

                <form action={adminDeleteChallengeAction}>
                  <input
                    type="hidden"
                    name="challenge_id"
                    value={row.challenge_id}
                  />
                  <input type="hidden" name="back" value="/club/admin" />
                  <ConfirmSubmit
                    label="ลบคำท้านี้"
                    question={`ลบคำท้าที่ ${row.challenger_nickname} ท้า ${row.runner_nickname} ใช่ไหม เบียร์ที่วางไว้ทั้งหมดหายด้วย กู้คืนไม่ได้`}
                    confirmLabel="ใช่ ลบเลย"
                    pendingLabel="กำลังลบ…"
                  />
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
