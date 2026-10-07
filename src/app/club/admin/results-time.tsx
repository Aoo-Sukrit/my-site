import { SubmitButton } from "@/components/club/form-controls";
import {
  hasPassed,
  thaiDateTimeLong,
  thaiMonthLabel,
  toBangkokInputValue,
} from "@/lib/date";
import { monthKeyOf } from "@/lib/run-rules";
import type { Round } from "@/lib/supabase/types";

import { setResultsAtAction } from "./actions";

const FIELD_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15";

/**
 * กล่องตั้งเวลาตัดสินผลของแต่ละรอบ
 *
 * rounds.results_at คุมสี่อย่างพร้อมกัน
 *   1. กรอกผลวิ่งของเดือนนั้นย้อนหลังได้ถึงเวลานี้
 *   2. แก้หรือลบผลวิ่งของเดือนนั้นเองได้ไม่เกินเวลานี้
 *   3. รางวัลพลิกเป็น "ได้ไปแล้ว" ตอนนี้
 *   4. คำท้าตัดสินตอนนี้
 *
 * เดิมสามข้อแรกเป็นเลขตายตัวในโค้ด (วันที่ 3 กับวันที่ 4) เลื่อนไม่ได้เลย
 * ตอนนี้อยู่ในตาราง แอดมินจึงต่อเวลาให้เดือนที่คนกรอกไม่ทันได้เอง
 */
function RoundBox({ round, label }: { round: Round; label: string }) {
  const settled = hasPassed(round.results_at);
  const monthKey = monthKeyOf(round.month);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {label} · เดือน{thaiMonthLabel(round.month)}
        </p>
        <p className="text-xs text-muted">
          {settled ? "ตัดสินแล้ว" : "ยังไม่ตัดสิน"} ·{" "}
          {thaiDateTimeLong(round.results_at)}
        </p>
      </div>

      <form action={setResultsAtAction} className="space-y-3">
        <input type="hidden" name="month" value={monthKey} />
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">เวลาตัดสินผล (เวลาไทย)</span>
          <input
            type="datetime-local"
            name="results_at"
            defaultValue={toBangkokInputValue(round.results_at)}
            required
            className={FIELD_CLASS}
          />
        </label>

        {settled ? (
          <p className="text-xs text-accent-strong">
            รอบนี้ตัดสินไปแล้ว ถ้าเลื่อนออกไปอีก
            ผลรางวัลกับผลคำท้าจะกลับมาเปลี่ยนได้ เพราะคนกรอกผลย้อนหลังเพิ่มได้อีก
          </p>
        ) : null}

        <SubmitButton variant="ghost" pendingLabel="กำลังบันทึก…">
          บันทึกเวลาตัดสิน
        </SubmitButton>
      </form>
    </div>
  );
}

export default function ResultsTime({
  current,
  previous,
}: {
  current: Round | null;
  previous: Round | null;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">เวลาตัดสินผล</h2>
        <p className="text-sm text-muted">
          ค่าเดียวนี้คุมทั้งการกรอกผลย้อนหลัง การแก้ผลวิ่ง
          การพลิกรางวัลเป็นได้ไปแล้ว และการตัดสินคำท้า ค่าเริ่มต้นคือเที่ยงวันที่ 1
          ของเดือนถัดไป · ต้องอยู่หลังสิ้นเดือนของรอบนั้นเสมอ
        </p>
      </div>

      {previous ? <RoundBox round={previous} label="เดือนที่แล้ว" /> : null}
      {current ? (
        <RoundBox round={current} label="เดือนนี้" />
      ) : (
        <p className="text-sm text-muted">ยังไม่มีรอบของเดือนนี้</p>
      )}
    </section>
  );
}
