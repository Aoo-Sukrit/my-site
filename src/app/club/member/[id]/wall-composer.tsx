"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import { WALL_BODY_MAX } from "@/lib/wall-rules";

import { addWallMessageAction } from "./actions";

/**
 * ช่องพิมพ์ของกระดานแซว อยู่บนสุดของกระดาน
 *
 * เป็น client component เพราะต้องล้างช่องเองหลังส่งสำเร็จ และนับตัวอักษร
 * ที่เหลือให้เห็นตอนใกล้เต็ม ส่วนรายการข้อความข้างล่างเป็น server component
 * ธรรมดา ปุ่มลบกับซ่อนเป็น form ที่ยิง server action ตรงๆ ไม่ต้องใช้ JS
 */
export default function WallComposer({
  ownerId,
  ownerName,
  viewerAvatar,
  viewerName,
}: {
  ownerId: string;
  ownerName: string;
  viewerAvatar: string | null;
  viewerName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const left = WALL_BODY_MAX - body.length;

  function send() {
    const clean = body.trim();
    if (!clean || pending) return;

    setError(null);
    startTransition(async () => {
      const result = await addWallMessageAction(ownerId, clean);
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

      <div className="flex items-start gap-2.5">
        {viewerAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewerAvatar}
            alt=""
            className="mt-1 h-9 w-9 shrink-0 rounded-full border border-border object-cover object-top"
          />
        ) : (
          <span
            aria-hidden
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent-strong"
          >
            {viewerName.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={WALL_BODY_MAX}
            rows={2}
            placeholder={`แซว ${ownerName} หน่อย…`}
            aria-label={`เขียนข้อความถึง ${ownerName}`}
            className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          {/* เตือนเฉพาะตอนใกล้เต็ม ไม่ต้องขึ้นตัวเลขกวนตาตั้งแต่ตัวแรก */}
          {left <= 40 ? (
            <p className="mt-0.5 text-right text-xs text-muted">
              เหลือ {left} ตัวอักษร
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={send}
          disabled={pending || body.trim() === ""}
          aria-label="ส่งข้อความ"
          className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-club-line text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "…" : "→"}
        </button>
      </div>
    </div>
  );
}
