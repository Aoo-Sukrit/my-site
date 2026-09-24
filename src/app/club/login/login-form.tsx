"use client";

import { useActionState } from "react";

import Alert from "@/components/club/alert";
import { Field, SubmitButton } from "@/components/club/form-controls";

import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

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
        autoComplete="current-password"
      />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton pendingLabel="กำลังเข้าสู่ระบบ…">เข้าสู่ระบบ</SubmitButton>
    </form>
  );
}
