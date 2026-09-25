"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/club/form-controls";

/**
 * ปุ่มที่ต้องพิมพ์ข้อความให้ตรงก่อนถึงจะกดได้
 *
 * ใช้กับการกระทำที่กู้คืนไม่ได้ เช่นล้างเป้าทั้งรอบ ต่างจาก ConfirmSubmit
 * ที่กดสองจังหวะเฉยๆ ตรงที่อันนี้ต้องอ่านและพิมพ์จริง กดรัวๆ ผ่านไม่ได้
 *
 * ต้องวางไว้ข้างใน <form> เพราะจังหวะสุดท้ายคือปุ่ม submit ของฟอร์มนั้น
 * ฝั่ง Server Action เช็กข้อความซ้ำอีกชั้น ไม่ได้เชื่อฝั่งนี้อย่างเดียว
 */
export default function TypeToConfirm({
  label,
  question,
  phrase,
  confirmLabel,
  pendingLabel,
  inputName = "confirm",
}: {
  label: string;
  question: string;
  phrase: string;
  confirmLabel: string;
  pendingLabel: string;
  inputName?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-club-line px-5 text-sm font-medium tracking-wide text-club-line transition-colors hover:bg-accent-soft"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-club-line bg-accent-soft p-3">
      <p className="text-sm">{question}</p>

      <label className="block space-y-1.5">
        <span className="text-xs text-muted">
          พิมพ์ว่า <span className="font-medium text-foreground">{phrase}</span>{" "}
          เพื่อยืนยัน
        </span>
        <input
          name={inputName}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-accent"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setTyped("");
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm tracking-wide text-muted transition-colors hover:text-foreground"
        >
          ยกเลิก
        </button>
        {typed.trim() === phrase ? (
          <SubmitButton variant="primary" pendingLabel={pendingLabel}>
            {confirmLabel}
          </SubmitButton>
        ) : (
          <span className="inline-flex min-h-11 items-center px-2 text-xs text-muted">
            พิมพ์ให้ตรงก่อน
          </span>
        )}
      </div>
    </div>
  );
}
