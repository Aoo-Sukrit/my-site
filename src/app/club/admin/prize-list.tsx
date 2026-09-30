import Avatar from "@/components/club/avatar";
import ConfirmSubmit from "@/components/club/confirm-submit";
import { slotLabel, type PrizeBoard } from "@/lib/prize-rules";
import { getRoundPrizes } from "@/lib/prizes";
import { thaiMonthLabel } from "@/lib/date";
import type { Round } from "@/lib/supabase/types";

import { deletePrizeAction } from "../prizes/actions";

/**
 * รายการรางวัลของเดือนนี้สำหรับแอดมิน พร้อมปุ่มลบ
 *
 * แอดมินเห็นข้อมูลชุดเดียวกับคนอื่น ของที่ปิดอุบก็ยังปิดอยู่
 * เพราะ round_prizes() ไม่ได้ยกเว้นให้แอดมิน แอดมินก็เล่นเกมนี้ด้วย
 * ปุ่มลบมีไว้เผื่อมีของไม่เหมาะสม ซึ่งลบได้โดยไม่ต้องเห็นว่าข้างในคืออะไร
 */
export default async function PrizeList({ round }: { round: Round }) {
  const prizes = await getRoundPrizes();

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">
          รางวัลเดือน{thaiMonthLabel(round.month)}{" "}
          <span className="text-muted">({prizes.length})</span>
        </h2>
        <p className="text-sm text-muted">
          ลบได้ตลอดในฐานะแอดมิน ของที่ปิดอุบแอดมินก็ไม่เห็นเหมือนกัน
        </p>
      </div>

      {prizes.length === 0 ? (
        <p className="text-sm text-muted">เดือนนี้ยังไม่มีใครตั้งรางวัล</p>
      ) : (
        <ul className="space-y-3">
          {prizes.map((prize) => {
            const hidden = prize.is_secret && !prize.is_mine;

            return (
              <li
                key={prize.prize_id}
                className="space-y-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-strong">
                    {slotLabel(
                      prize.board as PrizeBoard,
                      prize.rank_no,
                      prize.is_booby,
                    )}
                  </span>
                  <p className="text-sm font-medium">
                    {hidden ? "ของขวัญปิดอุบ" : prize.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">สปอนเซอร์โดย</span>
                    <Avatar
                      src={prize.sponsor_avatar_url}
                      nickname={prize.sponsor_nickname}
                      size={20}
                    />
                    <span className="truncate text-xs">
                      {prize.sponsor_nickname}
                    </span>
                  </div>
                </div>

                <form action={deletePrizeAction}>
                  <input
                    type="hidden"
                    name="prize_id"
                    value={prize.prize_id}
                  />
                  <input type="hidden" name="back" value="/club/admin" />
                  <ConfirmSubmit
                    label="ลบรางวัลนี้"
                    question={`ลบรางวัลของ ${prize.sponsor_nickname} ใช่ไหม กู้คืนไม่ได้`}
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
