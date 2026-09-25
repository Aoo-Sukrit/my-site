import TypeToConfirm from "@/components/club/type-to-confirm";
import { SubmitButton } from "@/components/club/form-controls";
import { thaiDateTimeLong, thaiMonthLabel, toBangkokInputValue } from "@/lib/date";
import { PHASE_LABEL, roundPhase } from "@/lib/target-rules";
import type { Round } from "@/lib/supabase/types";

import { clearRoundTargetsAction, setRoundWindowAction } from "./actions";

const FIELD_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-accent";

/**
 * กล่องตั้งช่วงเวลาของเกมตั้งเป้า
 *
 * ช่วงเวลาเป็นข้อมูลในตาราง rounds ไม่ใช่เลขฝังในโค้ด แอดมินจึงเลื่อนเปิด
 * เลื่อนปิดได้เองโดยไม่ต้อง deploy ใหม่ ซึ่งจำเป็นทั้งตอนเทสและตอนใช้จริง
 * ที่เพื่อนโหวตไม่ครบแล้วอยากต่อเวลา
 */
export default function RoundWindow({ round }: { round: Round }) {
  const phase = roundPhase(round.target_opens_at, round.target_locks_at);
  const monthLabel = thaiMonthLabel(round.month);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">
          ช่วงตั้งเป้า เดือน{monthLabel}
        </h2>
        <p className="text-sm text-muted">
          ตอนนี้ {PHASE_LABEL[phase]}
          {phase === "open"
            ? ` · ปิดรับ ${thaiDateTimeLong(round.target_locks_at)}`
            : phase === "before"
              ? ` · เปิด ${thaiDateTimeLong(round.target_opens_at)}`
              : ` · เปิดผลตั้งแต่ ${thaiDateTimeLong(round.target_locks_at)}`}
        </p>
      </div>

      <form action={setRoundWindowAction} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">เปิดให้ตั้งเป้า (เวลาไทย)</span>
          <input
            type="datetime-local"
            name="opens_at"
            defaultValue={toBangkokInputValue(round.target_opens_at)}
            required
            className={FIELD_CLASS}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">ปิดรับและเปิดผล (เวลาไทย)</span>
          <input
            type="datetime-local"
            name="locks_at"
            defaultValue={toBangkokInputValue(round.target_locks_at)}
            required
            className={FIELD_CLASS}
          />
        </label>

        <SubmitButton pendingLabel="กำลังบันทึก…">บันทึกช่วงเวลา</SubmitButton>
      </form>

      <form action={clearRoundTargetsAction} className="border-t border-border pt-4">
        <TypeToConfirm
          label="ล้างเป้าและโหวตทั้งรอบ"
          question={`ล้างเป้าและโหวตทั้งหมดของเดือน${monthLabel} ใช่ไหม กู้คืนไม่ได้ ผลวิ่งไม่ถูกแตะ`}
          phrase={monthLabel}
          confirmLabel="ล้างเลย"
          pendingLabel="กำลังล้าง…"
        />
      </form>
    </section>
  );
}
