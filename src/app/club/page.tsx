import type { Metadata } from "next";
import Link from "next/link";

import { PortraitAvatar } from "@/components/club/avatar";
import ClubLogo from "@/components/club-logo";
import { SubmitButton } from "@/components/club/form-controls";
import { requireApproved } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS, type Profile } from "@/lib/supabase/types";

import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "BEER NOW RUN LATER",
};

export default async function ClubPage() {
  const viewer = await requireApproved();

  // ดึงได้เฉพาะสมาชิกที่อนุมัติแล้ว ตาม policy profiles_select_approved
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("status", "approved")
    .order("nickname", { ascending: true })
    .returns<Profile[]>();

  const members = data ?? [];

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <ClubLogo
          className="w-32 rounded-2xl sm:w-40"
          sizes="(min-width: 640px) 160px, 128px"
          eager
        />
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          BEER NOW RUN LATER
        </h1>
        <p className="text-muted">
          สวัสดี {viewer.profile.nickname} — กำลังย้ายตารางขึ้นเว็บอยู่ เดี๋ยวมา
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/club/me"
          className="inline-flex min-h-11 items-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
        >
          โปรไฟล์ของฉัน
        </Link>

        {viewer.profile.is_admin ? (
          <Link
            href="/club/admin"
            className="inline-flex min-h-11 items-center rounded-full border border-club-line px-5 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            จัดการสมาชิก
          </Link>
        ) : null}

        <form action={logoutAction}>
          <SubmitButton variant="ghost" pendingLabel="กำลังออก…">
            ออกจากระบบ
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">
          สมาชิก <span className="text-muted">({members.length})</span>
        </h2>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {members.map((member) => (
            <li
              key={member.id}
              className="space-y-2 rounded-2xl border border-border bg-surface p-2"
            >
              <div className="relative">
                <PortraitAvatar
                  src={member.avatar_url}
                  nickname={member.nickname}
                />
                {/* ป้ายแอดมินวางทับมุมรูป จะได้ไม่ไปแย่งบรรทัดใต้ชื่อ
                    ซึ่งกันไว้ให้ระยะวิ่ง */}
                {member.is_admin ? (
                  <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] text-accent-strong">
                    แอดมิน
                  </span>
                ) : null}
              </div>
              <div className="space-y-0.5 px-1 pb-1">
                <p className="truncate text-sm font-medium">
                  {member.nickname}
                </p>
                {/* เว้นที่ไว้ให้ระยะวิ่งประจำเดือนที่จะมาเติมทีหลัง
                    ใส่บรรทัดจริงไว้เลยเพื่อให้ความสูงการ์ดไม่กระโดดตอนของจริงมา */}
                <p className="truncate text-xs text-muted">ระยะเดือนนี้ —</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
