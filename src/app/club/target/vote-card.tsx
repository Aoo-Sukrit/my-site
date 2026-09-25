"use client";

import { useActionState, useState } from "react";

import Alert from "@/components/club/alert";
import Avatar from "@/components/club/avatar";
import { SubmitButton } from "@/components/club/form-controls";
import { VOTE_OPTIONS } from "@/lib/target-rules";
import type { VotableMember } from "@/lib/supabase/types";

import { voteAction, type TargetActionResult } from "./actions";

const INITIAL: TargetActionResult = { error: null, ok: false };

export function signedDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

/**
 * การ์ดโหวตหนึ่งคน
 *
 * กดปุ่มตัวเลขแล้วยังไม่ส่งทันที เปลี่ยนเป็นคำถามยืนยันก่อนหนึ่งชั้น
 * เพราะกดแล้วแก้ไม่ได้ลบไม่ได้ และปุ่มสิบปุ่มเรียงติดกันบนมือถือกดพลาดง่าย
 */
export default function VoteCard({ member }: { member: VotableMember }) {
  const [state, formAction] = useActionState(voteAction, INITIAL);
  const [pick, setPick] = useState<number | null>(null);

  return (
    <li className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar src={member.avatar_url} nickname={member.nickname} size={44} />
        <div className="min-w-0">
          <p className="truncate font-medium">{member.nickname}</p>
          {member.caption ? (
            <p className="truncate text-xs text-muted">{member.caption}</p>
          ) : null}
        </div>
      </div>

      {pick === null ? (
        <div className="flex flex-wrap gap-1.5">
          {VOTE_OPTIONS.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => setPick(delta)}
              className={`min-h-11 min-w-11 rounded-full border px-3 text-sm font-medium tabular-nums transition-colors ${
                delta < 0
                  ? "border-border text-muted hover:border-club-line hover:text-club-line"
                  : "border-border text-muted hover:border-accent hover:text-accent-strong"
              }`}
            >
              {signedDelta(delta)}
            </button>
          ))}
        </div>
      ) : (
        <form
          action={formAction}
          className="space-y-3 rounded-xl border border-club-line bg-accent-soft p-3"
        >
          <input type="hidden" name="subject" value={member.member_id} />
          <input type="hidden" name="delta" value={pick} />
          <p className="text-sm">
            ปรับเป้าของ {member.nickname} {signedDelta(pick)} กม. ใช่ไหม
            กดแล้วแก้ไม่ได้และลบไม่ได้
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPick(null)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              ยกเลิก
            </button>
            <SubmitButton pendingLabel="กำลังส่ง…">ยืนยัน</SubmitButton>
          </div>
        </form>
      )}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
    </li>
  );
}
