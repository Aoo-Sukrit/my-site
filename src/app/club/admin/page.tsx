import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { requireAdmin } from "@/lib/auth";
import { getCurrentRound } from "@/lib/runs";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileWithEmail } from "@/lib/supabase/types";

import { MemberCard, PendingCard, RemovedCard } from "./member-card";
import RoundWindow from "./round-window";

export const metadata: Metadata = {
  title: "แอดมิน",
};

function firstParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function AdminPage(props: PageProps<"/club/admin">) {
  const viewer = await requireAdmin();
  const params = await props.searchParams;

  const message = firstParam(params.msg);
  const errorMessage = firstParam(params.err);

  // ใช้ RPC ไม่ใช่ select ตรงๆ เพราะคอลัมน์ email ถูกถอนสิทธิ์ select ไว้
  // (schema.sql ข้อ 7) ฟังก์ชันนี้เป็น security definer และเช็กเองว่า
  // คนเรียกเป็นแอดมินจริงถึงจะคืนข้อมูล
  const round = await getCurrentRound();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_member_list");

  // ยังไม่ได้ generate type ของฐานข้อมูล supabase-js เลยมองว่า rpc คืนค่าเดี่ยว
  // ฟังก์ชันนี้ประกาศเป็น returns setof public.profiles จึงได้อาร์เรย์กลับมาจริง
  const profiles = (data ?? []) as ProfileWithEmail[];
  const pending = profiles.filter((p) => p.status === "pending");
  const removed = profiles.filter((p) => p.status === "removed");
  const active = profiles.filter(
    (p) => p.status === "approved" || p.status === "blocked",
  );

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">ADMIN</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          จัดการสมาชิก
        </h1>
        <p className="text-sm text-muted">
          เข้าสู่ระบบเป็น {viewer.profile.nickname}
        </p>
      </section>

      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{toThaiDbError(error)}</Alert> : null}

      {round ? <RoundWindow round={round} /> : null}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">
          รออนุมัติ <span className="text-muted">({pending.length})</span>
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-muted">ไม่มีใครรออนุมัติอยู่</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((profile) => (
              <PendingCard key={profile.id} profile={profile} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">
          สมาชิกทั้งหมด <span className="text-muted">({active.length})</span>
        </h2>

        {active.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีสมาชิกที่อนุมัติแล้ว</p>
        ) : (
          <ul className="space-y-3">
            {active.map((profile) => (
              <MemberCard
                key={profile.id}
                profile={profile}
                isSelf={profile.id === viewer.userId}
              />
            ))}
          </ul>
        )}
      </section>

      {removed.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-medium">
            เอาออกจากคลับแล้ว{" "}
            <span className="text-muted">({removed.length})</span>
          </h2>
          <p className="text-sm text-muted">
            คนกลุ่มนี้ไม่โผล่ในรายชื่อสมาชิกและเข้าเว็บไม่ได้ เห็นได้เฉพาะหน้านี้
          </p>
          <ul className="space-y-3">
            {removed.map((profile) => (
              <RemovedCard key={profile.id} profile={profile} />
            ))}
          </ul>
        </section>
      ) : null}

      <Link
        href="/club"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับหน้า CLUB
      </Link>
    </div>
  );
}
