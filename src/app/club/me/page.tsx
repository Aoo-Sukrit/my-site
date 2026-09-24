import type { Metadata } from "next";
import Link from "next/link";

import { SubmitButton } from "@/components/club/form-controls";
import { requireApproved } from "@/lib/auth";
import { STATUS_LABEL } from "@/lib/supabase/types";

import { logoutAction } from "../actions";
import AvatarUploader from "./avatar-uploader";
import NicknameForm from "./nickname-form";

export const metadata: Metadata = {
  title: "โปรไฟล์ของฉัน",
};

export default async function MePage() {
  const { profile, email } = await requireApproved();

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">PROFILE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          โปรไฟล์ของฉัน
        </h1>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <AvatarUploader
          avatarUrl={profile.avatar_url}
          nickname={profile.nickname}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <NicknameForm nickname={profile.nickname} />
      </section>

      <section className="space-y-2 rounded-2xl border border-border p-5 text-sm">
        <p className="break-all">
          <span className="text-muted">อีเมล</span> {email ?? "—"}
        </p>
        <p>
          <span className="text-muted">สถานะ</span>{" "}
          {STATUS_LABEL[profile.status]}
          {profile.is_admin ? " · แอดมิน" : ""}
        </p>
        <p className="text-muted">
          สถานะกับสิทธิ์แอดมินแก้ได้เฉพาะแอดมินเท่านั้น
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/club"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          ← กลับหน้า CLUB
        </Link>
        <form action={logoutAction}>
          <SubmitButton variant="ghost" pendingLabel="กำลังออก…">
            ออกจากระบบ
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
