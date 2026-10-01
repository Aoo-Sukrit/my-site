import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getHomeContent } from "@/lib/home";

import HomeEditor from "../home-editor";

export const metadata: Metadata = {
  title: "แก้หน้าแรก",
};

export default async function EditHomePage() {
  await requireAdmin();
  const content = await getHomeContent();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">HOME</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          แก้หน้าแรก
        </h1>
        <p className="text-sm text-muted">
          ช่องไหนเว้นว่างไว้ หน้าแรกจะซ่อนบรรทัดนั้นให้เอง
        </p>
      </section>

      <HomeEditor content={content} />

      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับหน้าแรก
      </Link>
    </div>
  );
}
