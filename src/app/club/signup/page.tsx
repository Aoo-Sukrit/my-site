import type { Metadata } from "next";
import Link from "next/link";

import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">CLUB</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          สมัครสมาชิก
        </h1>
        <p className="text-sm text-muted">
          สำหรับทีม Beer Now Run Later เท่านั้น
        </p>
      </section>

      <SignupForm />

      <p className="text-sm text-muted">
        มีบัญชีแล้ว{" "}
        <Link href="/club/login" className="text-accent-strong underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
