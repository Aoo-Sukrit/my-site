"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import {
  ABOUT_CHIPS_MAX,
  ABOUT_NAME_MAX,
  ABOUT_STATS_MAX,
  ABOUT_STORY_MAX,
  ABOUT_TAGLINE_MAX,
  toSlug,
} from "@/lib/about-rules";
import { makeAvatarThumb, shrinkToJpeg } from "@/lib/image";
import {
  POST_BUCKET,
  POST_IMAGE_MAX_EDGE,
  POST_IMAGE_QUALITY,
} from "@/lib/post-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AboutProfile, AboutStat, PostSection } from "@/lib/supabase/types";

import {
  saveAboutProfileAction,
  saveSectionsAction,
  type SectionValues,
} from "./actions";

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent";
const SMALL_FIELD =
  "min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent";

type SectionDraft = SectionValues & {
  /** URL ที่เอาไว้โชว์ตอนนี้ ไม่ได้ส่งลงฐานข้อมูล */
  previewUrl: string | null;
  /** หมวดที่เพิ่งเพิ่ม ยังแก้ชื่อย่อได้ ของเดิมห้ามแก้เพราะลิงก์จะพัง */
  isNew: boolean;
};

/**
 * หน้าแก้ ABOUT
 *
 * ทำให้ใช้บนมือถือสะดวก ช่องกรอกเรียงลงมาทางเดียว ปุ่มใหญ่พอกดด้วยนิ้ว
 * และเลื่อนลำดับหมวดด้วยปุ่มขึ้น/ลง ไม่ใช่การลาก ด้วยเหตุผลเดียวกับหน้าเขียนโพสต์
 *
 * รูปทุกใบย่อในเบราว์เซอร์ก่อนอัป ด้วยตัวย่อชุดเดียวกับที่ระบบโพสต์ใช้
 * รูปโปรไฟล์ย่อเป็นรูปเล็กเลยเพราะโชว์แค่วงกลม 80px
 */
export default function AboutEditor({
  profile,
  avatarUrl,
  sections,
  sectionCovers,
}: {
  profile: AboutProfile | null;
  /** URL ของรูปโปรไฟล์ที่ใช้อยู่ ประกอบมาจากฝั่งเซิร์ฟเวอร์แล้ว */
  avatarUrl: string | null;
  sections: PostSection[];
  /** URL รูปปกของแต่ละหมวด คีย์เป็น slug */
  sectionCovers: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [tagline, setTagline] = useState(profile?.tagline ?? "");
  const [story, setStory] = useState(profile?.story ?? "");
  const [chips, setChips] = useState<string[]>(profile?.chips ?? []);
  const [lineUrl, setLineUrl] = useState(profile?.line_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url ?? "");
  const [facebookUrl, setFacebookUrl] = useState(profile?.facebook_url ?? "");
  const [stravaUrl, setStravaUrl] = useState(profile?.strava_url ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [stats, setStats] = useState<AboutStat[]>(profile?.stats ?? []);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl);

  const [drafts, setDrafts] = useState<SectionDraft[]>(() =>
    sections
      .filter((row) => row.kind === "hobby")
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        intro: row.intro ?? "",
        coverPath: null,
        hidden: row.hidden,
        previewUrl: sectionCovers[row.slug] ?? null,
        isNew: false,
      })),
  );

  // หมวดไหนกำลังเลือกรูปปกอยู่ ใช้ input ตัวเดียวร่วมกันทุกหมวด
  const [coverFor, setCoverFor] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function uploadImage(file: File, thumb: boolean): Promise<string> {
    const blob = thumb
      ? await makeAvatarThumb(file)
      : await shrinkToJpeg(file, {
          maxEdge: POST_IMAGE_MAX_EDGE,
          maxBytes: 1_500_000,
          quality: POST_IMAGE_QUALITY,
        });

    const path = `about/${globalThis.crypto.randomUUID()}.jpg`;
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from(POST_BUCKET)
      .upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);
    return path;
  }

  async function pickAvatar(file: File) {
    setBusy(true);
    setError(null);
    try {
      const path = await uploadImage(file, true);
      setAvatarPath(path);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  }

  async function pickCover(file: File) {
    const slug = coverFor;
    if (!slug) return;

    setBusy(true);
    setError(null);
    try {
      const path = await uploadImage(file, false);
      const preview = URL.createObjectURL(file);
      setDrafts((list) =>
        list.map((row) =>
          row.slug === slug
            ? { ...row, coverPath: path, previewUrl: preview }
            : row,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      setCoverFor(null);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  function patch(slug: string, change: Partial<SectionDraft>) {
    setDrafts((list) =>
      list.map((row) => (row.slug === slug ? { ...row, ...change } : row)),
    );
  }

  function moveSection(index: number, by: number) {
    setDrafts((list) => {
      const next = index + by;
      if (next < 0 || next >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function addSection() {
    const name = window.prompt("ชื่อหมวดใหม่ เช่น ดำน้ำ");
    if (!name?.trim()) return;

    const base = toSlug(name) || `hobby-${drafts.length + 1}`;
    let slug = base;
    let n = 2;
    while (drafts.some((row) => row.slug === slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }

    setDrafts((list) => [
      ...list,
      {
        slug,
        title: name.trim(),
        intro: "",
        coverPath: null,
        hidden: false,
        previewUrl: null,
        isNew: true,
      },
    ]);
  }

  function save() {
    setError(null);
    setDone(null);

    startTransition(async () => {
      const first = await saveAboutProfileAction({
        displayName,
        tagline,
        story,
        avatarPath,
        chips,
        lineUrl,
        instagramUrl,
        facebookUrl,
        stravaUrl,
        email,
        stats,
      });

      if (!first.ok) {
        setError(first.error);
        return;
      }

      const second = await saveSectionsAction(
        drafts.map((row) => ({
          slug: row.slug,
          title: row.title,
          intro: row.intro,
          coverPath: row.coverPath,
          hidden: row.hidden,
        })),
      );

      if (!second.ok) {
        setError(second.error);
        return;
      }

      setDone("บันทึกแล้ว");
      router.refresh();
    });
  }

  const working = busy || pending;

  return (
    <div className="space-y-8">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">แนะนำตัว</h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            disabled={working}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-dashed border-club-line bg-accent-soft"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-[10px] text-white">
              เปลี่ยนรูป
            </span>
          </button>

          <p className="text-xs text-muted">
            รูปโปรไฟล์ย่อให้อัตโนมัติ แตะที่วงกลมเพื่อเลือกรูปใหม่
          </p>
        </div>

        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void pickAvatar(file);
          }}
        />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">ชื่อที่โชว์</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={ABOUT_NAME_MAX}
            className={FIELD}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">แนะนำตัวสั้นๆ</span>
          <textarea
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            maxLength={ABOUT_TAGLINE_MAX}
            rows={2}
            placeholder="หนึ่งถึงสองบรรทัด"
            className={`${FIELD} resize-y`}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">เล่าเรื่องตัวเอง</span>
          <textarea
            value={story}
            onChange={(event) => setStory(event.target.value)}
            maxLength={ABOUT_STORY_MAX}
            rows={5}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-medium">
          ชิปข้อมูลสั้นๆ{" "}
          <span className="text-sm font-normal text-muted">
            เช่น ONE JK · Solar
          </span>
        </h2>

        {chips.map((chip, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={chip}
              onChange={(event) =>
                setChips((list) =>
                  list.map((row, at) => (at === index ? event.target.value : row)),
                )
              }
              className={SMALL_FIELD}
            />
            <button
              type="button"
              onClick={() =>
                setChips((list) => list.filter((_, at) => at !== index))
              }
              className="shrink-0 rounded-lg border border-border px-3 text-sm text-muted"
            >
              ลบ
            </button>
          </div>
        ))}

        {chips.length < ABOUT_CHIPS_MAX ? (
          <button
            type="button"
            onClick={() => setChips((list) => [...list, ""])}
            className="inline-flex min-h-10 items-center rounded-full border border-dashed border-club-line px-4 text-sm text-club-line"
          >
            + เพิ่มชิป
          </button>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-medium">ช่องทางติดต่อ</h2>
        <p className="text-xs text-muted">ช่องไหนเว้นว่างจะไม่โชว์บนหน้า</p>

        {(
          [
            ["LINE", lineUrl, setLineUrl],
            ["Instagram", instagramUrl, setInstagramUrl],
            ["Facebook", facebookUrl, setFacebookUrl],
            ["Strava", stravaUrl, setStravaUrl],
            ["อีเมล", email, setEmail],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="block space-y-1">
            <span className="text-xs text-muted">{label}</span>
            <input
              value={value}
              onChange={(event) => set(event.target.value)}
              className={SMALL_FIELD}
            />
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-medium">
          ตัวเลขเด่น{" "}
          <span className="text-sm font-normal text-muted">
            ไม่เกิน {ABOUT_STATS_MAX} ช่อง
          </span>
        </h2>

        {stats.map((stat, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={stat.value}
              onChange={(event) =>
                setStats((list) =>
                  list.map((row, at) =>
                    at === index ? { ...row, value: event.target.value } : row,
                  ),
                )
              }
              placeholder="12"
              className={`${SMALL_FIELD} w-24 shrink-0`}
            />
            <input
              value={stat.label}
              onChange={(event) =>
                setStats((list) =>
                  list.map((row, at) =>
                    at === index ? { ...row, label: event.target.value } : row,
                  ),
                )
              }
              placeholder="โครงการโซลาร์"
              className={SMALL_FIELD}
            />
            <button
              type="button"
              onClick={() =>
                setStats((list) => list.filter((_, at) => at !== index))
              }
              className="shrink-0 rounded-lg border border-border px-3 text-sm text-muted"
            >
              ลบ
            </button>
          </div>
        ))}

        {stats.length < ABOUT_STATS_MAX ? (
          <button
            type="button"
            onClick={() =>
              setStats((list) => [...list, { value: "", label: "" }])
            }
            className="inline-flex min-h-10 items-center rounded-full border border-dashed border-club-line px-4 text-sm text-club-line"
          >
            + เพิ่มตัวเลข
          </button>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-medium">หมวดงานอดิเรก</h2>
        <p className="text-xs text-muted">
          ซ่อนได้ แต่ลบไม่ได้ เพราะโพสต์ที่อยู่ในหมวดนั้นจะกำพร้า
        </p>

        <ul className="space-y-3">
          {drafts.map((row, index) => (
            <li
              key={row.slug}
              className="space-y-2 rounded-2xl border border-border bg-surface p-3"
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    setCoverFor(row.slug);
                    coverRef.current?.click();
                  }}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-dashed border-club-line bg-accent-soft text-[10px] text-club-line"
                >
                  {row.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "รูปปก"
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={row.title}
                    onChange={(event) =>
                      patch(row.slug, { title: event.target.value })
                    }
                    placeholder="ชื่อหมวด"
                    className={SMALL_FIELD}
                  />
                  <textarea
                    value={row.intro}
                    onChange={(event) =>
                      patch(row.slug, { intro: event.target.value })
                    }
                    rows={2}
                    placeholder="แนะนำหมวดนี้สั้นๆ"
                    className={`${SMALL_FIELD} resize-y py-2`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">/{row.slug}</span>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                  className="min-h-9 min-w-9 rounded-full border border-border text-sm text-muted disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === drafts.length - 1}
                  onClick={() => moveSection(index, 1)}
                  className="min-h-9 min-w-9 rounded-full border border-border text-sm text-muted disabled:opacity-40"
                >
                  ↓
                </button>
                <label className="inline-flex min-h-9 items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={row.hidden}
                    onChange={(event) =>
                      patch(row.slug, { hidden: event.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  ซ่อน
                </label>
              </div>
            </li>
          ))}
        </ul>

        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void pickCover(file);
          }}
        />

        <button
          type="button"
          onClick={addSection}
          className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
        >
          + เพิ่มหมวด
        </button>
      </section>

      <button
        type="button"
        disabled={working}
        onClick={save}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
      >
        {working ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </div>
  );
}
