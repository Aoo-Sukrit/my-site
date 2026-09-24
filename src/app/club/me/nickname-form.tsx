"use client";

import { useActionState } from "react";

import Alert from "@/components/club/alert";
import { Field, SubmitButton } from "@/components/club/form-controls";

import { NICKNAME_MAX, NICKNAME_MIN } from "@/lib/club-limits";

import { updateNicknameAction, type NicknameState } from "./actions";

const INITIAL: NicknameState = { error: null, ok: false };

export default function NicknameForm({ nickname }: { nickname: string }) {
  const [state, formAction] = useActionState(updateNicknameAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="ฉายา"
        name="nickname"
        defaultValue={nickname}
        required
        minLength={NICKNAME_MIN}
        maxLength={NICKNAME_MAX}
        hint="ชื่อที่เพื่อนๆ เห็นบนกระดาน"
      />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && !state.error ? (
        <Alert tone="success">บันทึกแล้ว</Alert>
      ) : null}

      <SubmitButton pendingLabel="กำลังบันทึก…">บันทึกฉายา</SubmitButton>
    </form>
  );
}
