"use client";

import { useState } from "react";

/**
 * ปุ่มคัดลอกลิงก์
 *
 * รับมาเป็นที่อยู่แบบสัมพัทธ์ (เช่น /p/abc) แล้วต่อกับโดเมนตอนกด
 * เพราะฝั่งเซิร์ฟเวอร์ไม่รู้ว่าคนเปิดจากโดเมนไหน (preview กับ production
 * คนละโดเมน) และ location รู้เองอยู่แล้วตอนอยู่ในเบราว์เซอร์
 *
 * clipboard API ใช้ไม่ได้บนหน้าที่ไม่ใช่ https หรือเมื่อผู้ใช้ไม่อนุญาต
 * จึงมีทางถอยเป็นโชว์ลิงก์ให้กดค้างคัดลอกเอง
 */
export default function CopyLink({
  path,
  label = "คัดลอกลิงก์",
}: {
  path: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const [shown, setShown] = useState("");

  async function copy() {
    const full = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(full);
      setState("done");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setShown(full);
      setState("manual");
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        {state === "done" ? "คัดลอกแล้ว ✓" : label}
      </button>

      {state === "manual" ? (
        <input
          readOnly
          value={shown}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
        />
      ) : null}
    </span>
  );
}
