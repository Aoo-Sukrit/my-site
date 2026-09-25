"use client";

import { useActionState, useMemo, useState } from "react";

import Alert from "@/components/club/alert";
import { SubmitButton } from "@/components/club/form-controls";
import {
  TARGET_MAX_KM,
  TARGET_MIN_KM,
  checkTargetKm,
} from "@/lib/target-rules";

import { setTargetAction, type TargetActionResult } from "./actions";

const INITIAL: TargetActionResult = { error: null, ok: false };

export default function TargetForm() {
  const [state, formAction] = useActionState(setTargetAction, INITIAL);
  const [value, setValue] = useState("");

  const check = useMemo(() => {
    const result = checkTargetKm(value);
    return {
      ok: result.ok,
      // ยังไม่พิมพ์อะไรก็ไม่ต้องขึ้นข้อความเตือน
      message: result.ok || value.trim() === "" ? null : result.reason,
    };
  }, [value]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-2xl border-2 border-club-line bg-club-cream p-5 text-club-ink">
        <p className="font-display text-lg font-semibold">
          ตั้งแล้วแก้เองไม่ได้
        </p>
        <p className="mt-1 text-sm">
          กดยืนยันแล้วเป้านี้จะล็อกทันที ถ้าพิมพ์ผิดจริงๆ
          ต้องไปขอแอดมินรีเซ็ตให้ (ค่าปรับเป็นเบียร์ คุยกันเอง)
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">เป้าระยะเดือนนี้ (กม.)</span>
        <input
          name="base_km"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={TARGET_MIN_KM}
          max={TARGET_MAX_KM}
          value={value}
          required
          placeholder="เช่น 50"
          onChange={(event) => setValue(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-accent"
        />
        <span
          className={`block text-xs ${check.message ? "text-club-line" : "text-muted"}`}
        >
          {check.message ??
            `ตั้งได้ตั้งแต่ ${TARGET_MIN_KM} ถึง ${TARGET_MAX_KM} กม. เพื่อนจะปรับได้อีกคนละ -5 ถึง +5`}
        </span>
      </label>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton pendingLabel="กำลังล็อกเป้า…">
        ล็อกเป้านี้เลย
      </SubmitButton>
    </form>
  );
}
