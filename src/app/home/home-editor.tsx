"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import type { HomeContent } from "@/lib/supabase/types";

import { saveHomeContentAction } from "./actions";

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent";

/**
 * หน้าแก้ข้อความหน้าแรก
 *
 * ช่องเรียงลงมาตามลำดับที่ข้อความโผล่บนหน้าจริง จะได้นึกออกว่ากำลังแก้ตรงไหน
 * ช่องไหนเว้นว่างไว้ หน้าแรกจะซ่อนบรรทัดนั้นให้เอง
 */
export default function HomeEditor({ content }: { content: HomeContent | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [eyebrow, setEyebrow] = useState(content?.eyebrow ?? "");
  const [title, setTitle] = useState(content?.title ?? "");
  const [subtitle, setSubtitle] = useState(content?.subtitle ?? "");
  const [intro, setIntro] = useState(content?.intro ?? "");
  const [nowLine, setNowLine] = useState(content?.now_line ?? "");
  const [clubBlurb, setClubBlurb] = useState(content?.club_blurb ?? "");

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function save() {
    setError(null);
    setDone(false);

    startTransition(async () => {
      const result = await saveHomeContentAction({
        eyebrow,
        title,
        subtitle,
        intro,
        nowLine,
        clubBlurb,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">บันทึกแล้ว</Alert> : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ป้ายเล็กด้านบน</span>
        <input
          value={eyebrow}
          onChange={(event) => setEyebrow(event.target.value)}
          maxLength={60}
          className={FIELD}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ชื่อใหญ่</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          className={FIELD}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">บรรทัดรอง</span>
        <textarea
          value={subtitle}
          onChange={(event) => setSubtitle(event.target.value)}
          maxLength={300}
          rows={2}
          className={`${FIELD} resize-y`}
        />
        <span className="block text-xs text-muted">ขึ้นบรรทัดใหม่ได้</span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ย่อหน้าแนะนำ</span>
        <textarea
          value={intro}
          onChange={(event) => setIntro(event.target.value)}
          maxLength={1000}
          rows={4}
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ช่วงนี้ทำอะไรอยู่</span>
        <input
          value={nowLine}
          onChange={(event) => setNowLine(event.target.value)}
          maxLength={200}
          placeholder="เว้นว่างไว้ก็ได้ ถ้าว่างจะไม่โชว์"
          className={FIELD}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ข้อความบนการ์ดคลับ</span>
        <textarea
          value={clubBlurb}
          onChange={(event) => setClubBlurb(event.target.value)}
          maxLength={200}
          rows={2}
          className={`${FIELD} resize-y`}
        />
        <span className="block text-xs text-muted">
          ตัวเลขสดของเดือนนี้ขึ้นให้เองใต้ข้อความนี้ ไม่ต้องพิมพ์เอง
        </span>
      </label>

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </div>
  );
}
