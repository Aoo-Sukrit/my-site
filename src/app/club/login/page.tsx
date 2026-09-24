import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";

import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage(props: PageProps<"/club/login">) {
  const params = await props.searchParams;
  const rawNext = params.next;
  const next = typeof rawNext === "string" ? rawNext : "/club";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">CLUB</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          เข้าสู่ระบบ
        </h1>
        <p className="text-sm text-muted">
          เฉพาะสมาชิกทีม Beer Now Run Later
        </p>
      </section>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <LoginForm next={next} />

      {/* เพื่อนที่กดการ์ดจากหน้าแรกจะมาโผล่ที่นี่เป็นหน้าแรก
          ทางไปสมัครเลยต้องเด่นพอๆ กับฟอร์มล็อกอิน ไม่ใช่ลิงก์เล็กๆ ท้ายหน้า */}
      <section className="space-y-3 rounded-2xl border border-club-line bg-club-cream p-5 text-club-ink">
        <p className="font-display text-base font-medium">ยังไม่มีบัญชี</p>
        <p className="text-sm">
          เพิ่งเข้าทีม หรือยังไม่เคยสมัคร กดปุ่มนี้ได้เลย
        </p>
        <Link
          href="/club/signup"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
        >
          สมัครที่นี่
        </Link>
      </section>
    </div>
  );
}
