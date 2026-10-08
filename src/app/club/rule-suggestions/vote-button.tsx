"use client";

import { useFormStatus } from "react-dom";

/**
 * ปุ่ม 👍 ของข้อเสนอหนึ่งข้อ อยู่ในฟอร์มที่ยิง voteRuleSuggestionAction
 *
 * ระหว่างรอเซิร์ฟเวอร์ โชว์ผลที่กำลังจะเป็นไปก่อนเลย (กดแล้วเลขขึ้นทันที)
 * ไม่ต้องรอหน้ารีเฟรช นิ้วจะได้รู้ว่ากดติด
 */
export default function VoteButton({
  count,
  voted,
}: {
  count: number;
  voted: boolean;
}) {
  const { pending } = useFormStatus();

  // กำลังส่งอยู่ ให้เห็นค่าหลังกดไปก่อน
  const showVoted = pending ? !voted : voted;
  const showCount = pending ? count + (voted ? -1 : 1) : count;

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={showVoted}
      aria-label={showVoted ? "เอาเห็นด้วยออก" : "เห็นด้วย"}
      className={`inline-flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-full px-3 text-sm tabular-nums transition active:scale-95 ${
        showVoted
          ? "bg-club-line text-background"
          : "border border-border text-muted hover:border-accent hover:text-foreground"
      }`}
    >
      <span aria-hidden>👍</span>
      {showCount}
    </button>
  );
}
