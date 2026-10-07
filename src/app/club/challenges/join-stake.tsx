"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/club/form-controls";
import { SIDE_LABEL, type ChallengeSide } from "@/lib/challenge-rules";

import { joinChallengeAction } from "./actions";

/**
 * ปุ่มเข้าร่วมฝั่งใดฝั่งหนึ่ง เติมกอง +0 ถึง +3
 *
 * +0 คือร่วมหุ้นเฉยๆ กองไม่โต แต่ได้เสียกับฝั่งนั้นด้วย (หารเท่ากัน)
 * maxAdd มาจาก maxAddFor() ตัวเลือกที่จะทำให้ใครต้องจ่ายเกินเพดาน
 * จะไม่โผล่ให้กด ฐานข้อมูลเช็กซ้ำอีกรอบอยู่แล้ว
 *
 * สามจังหวะ กดเปิด → เลือกจำนวน → ยืนยัน
 * ไม่ได้ใช้ ConfirmSubmit เพราะคำถามยืนยันต้องมีจำนวนที่เพิ่งเลือกอยู่ในประโยค
 * ซึ่งเป็นค่าที่เปลี่ยนได้ ต่างจากที่อื่นที่คำถามเป็นข้อความตายตัว
 *
 * ถอนไม่ได้ เลยต้องอ่านก่อนกดจริงๆ
 */
export default function JoinStake({
  challengeId,
  side,
  runnerNickname,
  targetKm,
  maxAdd,
  back,
}: {
  challengeId: string;
  side: ChallengeSide;
  runnerNickname: string;
  targetKm: string;
  /** เติมได้มากสุดกี่ขวดโดยไม่เกินเพดาน 0 ถึง 3 */
  maxAdd: number;
  back: string;
}) {
  const [step, setStep] = useState<"closed" | "picking" | "confirming">(
    "closed",
  );
  const [bottles, setBottles] = useState(0);
  const options = Array.from({ length: maxAdd + 1 }, (_, add) => add);

  if (step === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStep("picking")}
        className="min-h-11 w-full rounded-full border border-club-line text-sm font-medium tracking-wide text-club-line transition-colors hover:bg-accent-soft"
      >
        เข้าฝั่ง{SIDE_LABEL[side]}
      </button>
    );
  }

  return (
    <form action={joinChallengeAction} className="space-y-2">
      <input type="hidden" name="challenge_id" value={challengeId} />
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="bottles" value={bottles} />
      <input type="hidden" name="back" value={back} />

      {step === "picking" ? (
        <>
          <fieldset className="space-y-1.5">
            <legend className="text-xs text-muted">เติมกองกี่ขวด</legend>
            {/* ปุ่มเม็ดเรียงกัน กดง่ายกว่า select บนมือถือ และเห็นตัวเลือกครบ */}
            <div className="grid grid-cols-4 gap-1">
              {options.map((add) => (
                <button
                  key={add}
                  type="button"
                  onClick={() => setBottles(add)}
                  aria-pressed={bottles === add}
                  className={`min-h-11 rounded-xl text-sm font-medium tabular-nums transition active:scale-95 ${
                    bottles === add
                      ? "bg-club-line text-background"
                      : "border border-border text-muted hover:border-accent"
                  }`}
                >
                  +{add}
                </button>
              ))}
            </div>
            <span className="block text-[11px] text-muted">
              +0 = ร่วมหุ้นเฉยๆ ไม่เพิ่มกอง
              {maxAdd < 3 ? ` · ฝั่งนี้เติมได้อีกสูงสุด ${maxAdd} ขวด` : ""}
            </span>
          </fieldset>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("closed")}
              className="min-h-11 flex-1 rounded-full border border-border text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => setStep("confirming")}
              className="min-h-11 flex-1 rounded-full bg-club-line text-sm font-medium tracking-wide text-background transition hover:opacity-90"
            >
              ต่อไป
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed">
            เข้าฝั่ง{SIDE_LABEL[side]} เติมกอง +{bottles} ว่า {runnerNickname}{" "}
            {side === "reach" ? "จะวิ่งถึง" : "จะวิ่งไม่ถึง"} {targetKm} กม.
            ใช่ไหม ฝั่งแพ้จ่ายทั้งกองหารเท่ากัน{" "}
            <span className="text-accent-strong">เข้าแล้วถอนไม่ได้</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("picking")}
              className="min-h-11 flex-1 rounded-full border border-border text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              ย้อนกลับ
            </button>
            <SubmitButton variant="primary" pendingLabel="กำลังเข้าร่วม…">
              เข้าร่วมเลย
            </SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
