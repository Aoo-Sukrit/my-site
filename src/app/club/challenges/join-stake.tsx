"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/club/form-controls";
import {
  BOTTLE_OPTIONS,
  SIDE_LABEL,
  type ChallengeSide,
} from "@/lib/challenge-rules";

import { joinChallengeAction } from "./actions";

/**
 * ปุ่มลงเบียร์เพิ่มข้างใดข้างหนึ่ง
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
}: {
  challengeId: string;
  side: ChallengeSide;
  runnerNickname: string;
  targetKm: string;
}) {
  const [step, setStep] = useState<"closed" | "picking" | "confirming">(
    "closed",
  );
  const [bottles, setBottles] = useState(1);

  if (step === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStep("picking")}
        className="min-h-11 w-full rounded-full border border-club-line text-sm font-medium tracking-wide text-club-line transition-colors hover:bg-accent-soft"
      >
        ลงข้าง{SIDE_LABEL[side]}
      </button>
    );
  }

  return (
    <form action={joinChallengeAction} className="space-y-2">
      <input type="hidden" name="challenge_id" value={challengeId} />
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="bottles" value={bottles} />
      <input type="hidden" name="back" value="/club?board=rewards" />

      {step === "picking" ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">วางกี่ขวด</span>
            <select
              value={bottles}
              onChange={(event) => setBottles(Number(event.target.value))}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-accent"
            >
              {BOTTLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} ขวด
                </option>
              ))}
            </select>
          </label>
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
            วาง {bottles} ขวด ข้าง{SIDE_LABEL[side]} ว่า {runnerNickname}{" "}
            {side === "reach" ? "จะวิ่งถึง" : "จะวิ่งไม่ถึง"} {targetKm} กม.
            ใช่ไหม <span className="text-accent-strong">ถอนคืนไม่ได้</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("picking")}
              className="min-h-11 flex-1 rounded-full border border-border text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              ย้อนกลับ
            </button>
            <SubmitButton variant="primary" pendingLabel="กำลังวาง…">
              วางเลย
            </SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
