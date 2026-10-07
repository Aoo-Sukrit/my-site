"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import type { BlogContent } from "@/lib/supabase/types";

import { saveBlogContentAction } from "./actions";

/**
 * หัวข้อหน้า BLOG ที่แอดมินแก้ได้ตรงที่
 *
 * ทำไมแก้ในที่ ไม่แยกเป็นหน้า /blog/edit เหมือน /home/edit
 * หน้าแรกมีหกช่องและบางช่องยาวหลายบรรทัด ต้องมีที่ให้พิมพ์จริงๆ จึงคุ้มที่จะ
 * เปิดหน้าใหม่ แต่ที่นี่มีสองช่องสั้นๆ ที่อยู่บนสุดของหน้าอยู่แล้ว การเปิดหน้าใหม่
 * บนมือถือแลกมาด้วยการโหลดหน้า แล้วพอเซฟเสร็จก็ต้องกดกลับมาดูอีกที
 * กดแล้วช่องโผล่ตรงนั้นเลยเร็วกว่า และเห็นผลทันทีว่าข้อความใหม่ยาวเกินไหม
 *
 * ตอนไม่ได้แก้ หัวข้อยังเป็น h1 จริงเหมือนเดิม ไม่ได้กลายเป็น div
 */
export default function BlogHeader({
  content,
  isAdmin,
}: {
  content: BlogContent | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(content?.title ?? "");
  const [subtitle, setSubtitle] = useState(content?.subtitle ?? "");
  const [error, setError] = useState<string | null>(null);

  function open() {
    // เริ่มจากค่าที่อยู่บนหน้าจริงเสมอ เผื่อเคยกดยกเลิกทิ้งไว้ก่อนหน้านี้
    setTitle(content?.title ?? "");
    setSubtitle(content?.subtitle ?? "");
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);

    startTransition(async () => {
      const result = await saveBlogContentAction({ title, subtitle });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <section className="space-y-3 rounded-2xl border border-club-line bg-accent-soft p-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">หัวข้อใหญ่</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-display text-xl outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">ประโยคใต้หัวข้อ</span>
          <textarea
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            maxLength={300}
            rows={2}
            placeholder="เว้นว่างไว้ก็ได้ ถ้าว่างจะไม่โชว์"
            className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || title.trim() === ""}
            onClick={save}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
          >
            ยกเลิก
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {content?.title ?? "บล็อก"}
      </h1>

      {content?.subtitle ? (
        <p className="whitespace-pre-line text-muted">{content.subtitle}</p>
      ) : null}

      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/blog/new"
            className="inline-flex min-h-11 items-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
          >
            + เขียนโพสต์
          </Link>
          <button
            type="button"
            onClick={open}
            className="inline-flex min-h-11 items-center rounded-full border border-club-line px-4 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            แก้หน้านี้
          </button>
        </div>
      ) : null}
    </section>
  );
}
