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
  const ready = body.trim() !== "" && !pending;

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

      <div className="flex items-center gap-2.5">
        {viewerAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewerAvatar}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover object-top"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent-strong"
          >
            {viewerName.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          {/* บรรทัดเดียวทรงแคปซูลแบบช่องแชต ข้อความแซวสั้นๆ ไม่ต้องมีช่องสูงสองบรรทัด
              กับมุมลากขยายให้รก กด Enter (หรือปุ่มส่งบนคีย์บอร์ดมือถือ) ส่งได้เลย
              text-base กัน iOS ซูมเข้าตอนแตะช่อง */}
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
            maxLength={WALL_BODY_MAX}
            enterKeyHint="send"
            placeholder={`แซว ${ownerName} หน่อย…`}
            aria-label={`เขียนข้อความถึง ${ownerName}`}
            className="min-h-11 w-full resize-none rounded-full border border-border bg-surface px-4 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          {/* เตือนเฉพาะตอนใกล้เต็ม ไม่ต้องขึ้นตัวเลขกวนตาตั้งแต่ตัวแรก */}
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
          aria-label="ส่งข้อความ"
          // วงกลมสีเข้มเมื่อมีข้อความพร้อมส่ง จางลงตอนช่องว่างหรือกำลังส่ง
          // ใช้ foreground ไม่ใช่สีตายตัว โหมดมืดจะกลับเป็นวงสีอ่อนให้ยังเห็นชัด
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
