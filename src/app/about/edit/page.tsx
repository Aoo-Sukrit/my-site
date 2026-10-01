import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getAboutProfile } from "@/lib/about";
import { getPostSections, postImageUrl } from "@/lib/posts";

import AboutEditor from "../about-editor";

export const metadata: Metadata = {
  title: "แก้หน้า ABOUT",
};

export default async function EditAboutPage() {
  await requireAdmin();

  const [profile, sections] = await Promise.all([
    getAboutProfile(),
    getPostSections(),
  ]);

  // ประกอบ URL ให้เสร็จฝั่งเซิร์ฟเวอร์ ตัวแก้ไขจะได้ไม่ต้องรู้จัก env ของ Supabase
  const sectionCovers: Record<string, string | null> = {};
  for (const row of sections) {
    sectionCovers[row.slug] = postImageUrl(row.cover_url ?? row.fallback_cover);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">ABOUT</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          แก้หน้าแนะนำตัว
        </h1>
        <p className="text-sm text-muted">
          ช่องไหนเว้นว่างไว้จะไม่โชว์บนหน้า ABOUT
        </p>
      </section>

      <AboutEditor
        profile={profile}
        avatarUrl={postImageUrl(profile?.avatar_url ?? null)}
        sections={sections}
        sectionCovers={sectionCovers}
      />

      <Link
        href="/about"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับหน้า ABOUT
      </Link>
    </div>
  );
}
