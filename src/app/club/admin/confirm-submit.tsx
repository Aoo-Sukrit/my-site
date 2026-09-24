"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/club/form-controls";

/**
 * ปุ่มที่ต้องกดสองจังหวะ กันกดพลาดบนมือถือ
 *
 * ใช้การเปลี่ยนหน้าตาปุ่มเป็นคำถามแทน confirm() ของเบราว์เซอร์
 * เพราะ confirm() บนมือถือบางตัวถูกบล็อก และสไตล์ให้เข้ากับเว็บไม่ได้
 *
 * ต้องวางไว้ข้างใน <form> เพราะจังหวะที่สองคือปุ่ม submit ของฟอร์มนั้น
 */
export default function ConfirmSubmit({
  label,
  question,
  confirmLabel,
  pendingLabel,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  pendingLabel: string;
}) {
  const [armed, setArmed] = useState(false);

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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm tracking-wide text-muted transition-colors hover:text-foreground"
        >
          ยกเลิก
        </button>
        <SubmitButton variant="primary" pendingLabel={pendingLabel}>
          {confirmLabel}
        </SubmitButton>
      </div>
    </div>
  );
}
