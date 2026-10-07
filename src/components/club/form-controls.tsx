"use client";

import { useFormStatus } from "react-dom";

/**
 * ปุ่มส่งฟอร์มที่กันกดซ้ำให้เอง
 * useFormStatus อ่านสถานะจาก <form> ที่ครอบอยู่ จึงต้องอยู่ข้างในฟอร์มเสมอ
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium tracking-wide transition active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100";
  const styles = {
    primary: "bg-club-line text-background hover:opacity-90",
    ghost:
      "border border-border text-muted hover:border-accent hover:text-foreground",
    danger: "border border-club-line text-club-line hover:bg-accent-soft",
  };

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} ${styles[variant]}`}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {pendingLabel ?? "กำลังทำงาน…"}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** วงกลมหมุนเล็กๆ ข้างข้อความตอนกำลังส่งฟอร์ม ใช้สีตัวอักษรของปุ่มที่อยู่ */
function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  autoComplete,
  hint,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        // min-h-11 กับ text-base กันไม่ให้ iOS ซูมเข้าตอนโฟกัสช่องกรอก
        className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
      />
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
