"use client";

import { useActionState } from "react";

import Alert from "@/components/club/alert";
import { Field, SubmitButton } from "@/components/club/form-controls";

import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  PASSWORD_MIN,
} from "@/lib/club-limits";

import { signupAction, type SignupState } from "./actions";

const INITIAL: SignupState = { error: null, notice: null };

export default function SignupForm() {
  const [state, formAction] = useActionState(signupAction, INITIAL);

  if (state.notice) {
    return <Alert tone="success">{state.notice}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="ชื่อ"
        name="nickname"
        required
        minLength={NICKNAME_MIN}
        maxLength={NICKNAME_MAX}
        autoComplete="nickname"
        hint="ชื่อที่จะโชว์บนกระดาน เปลี่ยนทีหลังได้"
      />
      <Field
        label="อีเมล"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <Field
        label="รหัสผ่าน"
        name="password"
        type="password"
        required
        minLength={PASSWORD_MIN}
        autoComplete="new-password"
        hint={`อย่างน้อย ${PASSWORD_MIN} ตัวอักษร`}
      />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton pendingLabel="กำลังสมัคร…">สมัครสมาชิก</SubmitButton>

      <p className="text-xs text-muted">
        สมัครแล้วต้องรอแอดมินกดอนุมัติก่อนถึงจะเข้าดูข้อมูลในคลับได้
      </p>
    </form>
  );
}
