"use client";

import { useActionState, useState } from "react";

import Alert from "@/components/club/alert";
import { SubmitButton } from "@/components/club/form-controls";
import {
  ABOUT_MAX,
  CAPTION_MAX,
  NICKNAME_MAX,
  NICKNAME_MIN,
} from "@/lib/club-limits";

import { updateProfileAction, type ProfileState } from "./actions";

const INITIAL: ProfileState = { error: null, ok: false };

const FIELD_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-accent";

/** ตัวนับตัวอักษรที่เหลือ เปลี่ยนเป็นสีเน้นเมื่อใกล้เต็ม */
function Remaining({ used, max }: { used: number; max: number }) {
  const left = max - used;
  const tight = left <= max * 0.1;

  return (
    <span
      className={`text-xs tabular-nums ${tight ? "text-accent-strong" : "text-muted"}`}
    >
      เหลือ {left} ตัวอักษร
    </span>
  );
}

export default function ProfileForm({
  nickname,
  caption,
  about,
}: {
  nickname: string;
  caption: string;
  about: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL);

  // ถือค่าไว้ในสเตตเองเพื่อให้ตัวนับตัวอักษรขยับตามที่พิมพ์
  const [nicknameValue, setNicknameValue] = useState(nickname);
  const [captionValue, setCaptionValue] = useState(caption);
  const [aboutValue, setAboutValue] = useState(about);

  return (
    <form action={formAction} className="space-y-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ชื่อ</span>
        <input
          name="nickname"
          value={nicknameValue}
          onChange={(event) => setNicknameValue(event.target.value)}
          required
          minLength={NICKNAME_MIN}
          maxLength={NICKNAME_MAX}
          className={FIELD_CLASS}
        />
        <span className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            ชื่อที่โชว์บนกระดานและทุกที่ในคลับ
          </span>
          <Remaining used={nicknameValue.length} max={NICKNAME_MAX} />
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">แคปชั่น</span>
        <input
          name="caption"
          value={captionValue}
          onChange={(event) => setCaptionValue(event.target.value)}
          maxLength={CAPTION_MAX}
          placeholder="วิ่งน้อยแต่วิ่งนะ"
          className={FIELD_CLASS}
        />
        <span className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            ประโยคสั้นๆ ใต้ชื่อ โผล่บนกระดานและในรูปสตอรี่
          </span>
          <Remaining used={captionValue.length} max={CAPTION_MAX} />
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">เกี่ยวกับ</span>
        <textarea
          name="about"
          value={aboutValue}
          onChange={(event) => setAboutValue(event.target.value)}
          maxLength={ABOUT_MAX}
          rows={5}
          placeholder="เล่าอะไรก็ได้ วิ่งมากี่ปีแล้ว ชอบวิ่งที่ไหน เป้าหมายปีนี้คืออะไร"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-accent"
        />
        <span className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            โผล่เฉพาะในหน้าโปรไฟล์ของคุณ ไม่ขึ้นบนกระดาน
          </span>
          <Remaining used={aboutValue.length} max={ABOUT_MAX} />
        </span>
      </label>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && !state.error ? (
        <Alert tone="success">บันทึกแล้ว</Alert>
      ) : null}

      <SubmitButton pendingLabel="กำลังบันทึก…">บันทึกโปรไฟล์</SubmitButton>
    </form>
  );
}
