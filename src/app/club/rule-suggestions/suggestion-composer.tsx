"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import { RULE_SUGGESTION_MAX } from "@/lib/rule-suggestion-rules";

import { addRuleSuggestionAction } from "./actions";

/**
 * ช่องพิมพ์ข้อเสนอแก้กติกา หน้าตาเดียวกับช่องแซวในหน้าโปรไฟล์
 * บรรทัดเดียวทรงแคปซูล กด Enter ส่งได้ ปุ่มส่งเป็นวงกลมเข้มเมื่อมีข้อความ
 *
 * เป็น client component เพราะต้องล้างช่องเองหลังส่งสำเร็จ
 */
export default function SuggestionComposer() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const left = RULE_SUGGESTION_MAX - body.length;
  const ready = body.trim() !== "" && !pending;

  function send() {
    const clean = body.trim();
    if (!clean || pending) return;

    setError(null);
    startTransition(async () => {
      const result = await addRuleSuggestionAction(clean);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              // isComposing: ตอนพิมพ์ด้วยคีย์บอร์ดที่ต้องเลือกคำ Enter แปลว่า
              // ยืนยันคำ ไม่ใช่ส่ง
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            maxLength={RULE_SUGGESTION_MAX}
            enterKeyHint="send"
            placeholder="เดือนหน้าอยากให้แก้อะไร…"
            aria-label="เขียนข้อเสนอแก้กติกาเดือนหน้า"
            className="min-h-11 w-full rounded-full border border-border bg-surface px-4 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          {left <= 40 ? (
            <p className="mt-0.5 pr-3 text-right text-xs text-muted">
              เหลือ {left} ตัวอักษร
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={send}
          disabled={!ready}
          aria-label="ส่งข้อเสนอ"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition active:scale-95 ${
            ready ? "hover:opacity-90" : "opacity-25"
          }`}
        >
          {pending ? (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
            />
          ) : (
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 16V4M4.5 9.5 10 4l5.5 5.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
