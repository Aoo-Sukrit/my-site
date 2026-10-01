import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getPostSections, getStorageUsed } from "@/lib/posts";

import PostEditor from "../post-editor";

export const metadata: Metadata = {
  title: "เขียนโพสต์",
};

export default async function NewPostPage() {
  await requireAdmin();

  const [sections, storageUsed] = await Promise.all([
    getPostSections(),
    getStorageUsed(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">NEW POST</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          เขียนโพสต์
        </h1>
        <p className="text-sm text-muted">
          เลือกรูปจากอัลบั้ม พิมพ์คำอธิบายใต้แต่ละรูป
          แล้วเลือกว่าไปอยู่หน้าไหนกับใครเห็นได้
        </p>
      </section>

      <PostEditor
        sections={sections}
        storageUsed={storageUsed}
        defaults={{
          id: null,
          title: "",
          body: "",
          section: sections[0]?.slug ?? "blog",
          visibility: "public",
          media: [],
        }}
      />

      <Link
        href="/blog"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← ยกเลิก กลับหน้าบล็อก
      </Link>
    </div>
  );
}
