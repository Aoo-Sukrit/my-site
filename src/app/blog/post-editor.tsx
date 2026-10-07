"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import { shrinkToJpeg } from "@/lib/image";
import {
  POST_BUCKET,
  POST_CAPTION_MAX,
  POST_IMAGE_MAX_EDGE,
  POST_IMAGE_QUALITY,
  POST_TITLE_MAX,
  POST_VISIBILITIES,
  STORAGE_LIMIT_BYTES,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  formatBytes,
  parseYouTubeId,
  storagePercent,
  youTubeThumb,
  type PostVisibility,
} from "@/lib/post-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PostSection } from "@/lib/supabase/types";

import { savePostAction, type MediaInput } from "./actions";

const CHIP =
  "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm tracking-wide transition-colors";
const CHIP_ON = "bg-club-line font-medium text-background";
const CHIP_OFF =
  "border border-border text-muted hover:border-accent hover:text-foreground";
const FIELD =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15";

/** รูปหนึ่งชิ้นในตัวแก้ไข มี previewUrl ไว้โชว์ก่อนบันทึก */
type Draft = MediaInput & { key: string; previewUrl: string | null };

export type PostEditorDefaults = {
  id: string | null;
  title: string;
  body: string;
  section: string;
  visibility: PostVisibility;
  media: Draft[];
};

/**
 * หน้าเขียนโพสต์
 *
 * ออกแบบมาให้เขียนจากมือถือเป็นหลัก เลือกรูปหลายใบจากอัลบั้มได้ทีเดียว
 * และสลับลำดับด้วยปุ่มขึ้น/ลง ไม่ใช่การลาก เพราะการลากบนมือถือในหน้าที่
 * เลื่อนขึ้นลงได้ด้วยนั้นใช้ยากมาก
 *
 * id ของโพสต์ถูกตั้งตั้งแต่ตอนเปิดหน้า ไม่ได้รอฐานข้อมูลสุ่มให้ เพราะรูป
 * ต้องอัปขึ้น storage ก่อนกดบันทึก และอยากให้โฟลเดอร์รูปชื่อเดียวกับโพสต์
 */
export default function PostEditor({
  sections,
  defaults,
  storageUsed,
}: {
  sections: PostSection[];
  defaults: PostEditorDefaults;
  storageUsed: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // ตั้งครั้งเดียวตอน mount ใช้เป็นทั้ง id ของโพสต์และชื่อโฟลเดอร์รูป
  const [postId] = useState(
    () => defaults.id ?? globalThis.crypto.randomUUID(),
  );

  const [title, setTitle] = useState(defaults.title);
  const [body, setBody] = useState(defaults.body);
  const [section, setSection] = useState(defaults.section);
  const [visibility, setVisibility] = useState<PostVisibility>(
    defaults.visibility,
  );
  const [media, setMedia] = useState<Draft[]>(defaults.media);

  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const addedBytes = media.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
  const used = storageUsed + Math.max(0, addedBytes - defaults.media
    .reduce((sum, item) => sum + (item.bytes ?? 0), 0));

  function move(index: number, by: number) {
    setMedia((list) => {
      const next = index + by;
      if (next < 0 || next >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function remove(key: string) {
    setMedia((list) => list.filter((item) => item.key !== key));
  }

  function setCaption(key: string, caption: string) {
    setMedia((list) =>
      list.map((item) => (item.key === key ? { ...item, caption } : item)),
    );
  }

  async function addImages(files: File[]) {
    setError(null);
    setUploading({ done: 0, total: files.length });

    const supabase = createSupabaseBrowserClient();
    const added: Draft[] = [];

    try {
      for (const file of files) {
        try {
          // ย่อในเบราว์เซอร์ก่อนเสมอ ด้านยาวสุด 1600 แล้วเขียนใหม่เป็น JPEG
          // ซึ่งทิ้ง EXIF ไปเองด้วย แต่หมุนภาพให้ถูกด้านก่อนแล้ว
          const blob = await shrinkToJpeg(file, {
            maxEdge: POST_IMAGE_MAX_EDGE,
            maxBytes: 1_500_000,
            quality: POST_IMAGE_QUALITY,
          });

          const bitmap = await createImageBitmap(blob);
          const width = bitmap.width;
          const height = bitmap.height;
          bitmap.close();

          const path = `${postId}/${globalThis.crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from(POST_BUCKET)
            .upload(path, blob, {
              contentType: "image/jpeg",
              cacheControl: "31536000",
              upsert: false,
            });

          if (uploadError) throw new Error(uploadError.message);

          added.push({
            key: path,
            kind: "image",
            url: path,
            youtubeId: null,
            caption: "",
            width,
            height,
            bytes: blob.size,
            previewUrl: URL.createObjectURL(blob),
          });
        } catch (cause) {
          setError(
            `อัปรูป ${file.name} ไม่สำเร็จ: ${
              cause instanceof Error ? cause.message : String(cause)
            }`,
          );
        } finally {
          setUploading((state) =>
            state ? { ...state, done: state.done + 1 } : state,
          );
        }
      }
    } finally {
      setUploading(null);
      if (added.length > 0) setMedia((list) => [...list, ...added]);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addVideo() {
    setError(null);
    const input = window.prompt("วางลิงก์ YouTube");
    if (!input) return;

    const id = parseYouTubeId(input);
    if (!id) {
      setError("อ่านลิงก์ YouTube นี้ไม่ออก ลองวางลิงก์จากปุ่มแชร์อีกครั้ง");
      return;
    }

    setMedia((list) => [
      ...list,
      {
        key: `yt-${id}-${list.length}`,
        kind: "youtube",
        url: null,
        youtubeId: id,
        caption: "",
        width: null,
        height: null,
        bytes: null,
        previewUrl: youTubeThumb(id),
      },
    ]);
  }

  function save(status: "draft" | "published") {
    setError(null);

    startTransition(async () => {
      const result = await savePostAction({
        id: postId,
        title,
        body,
        section,
        visibility,
        status,
        // previewUrl กับ key เป็นของใช้ในหน้านี้เท่านั้น ไม่ได้ส่งลงฐานข้อมูล
        media: media.map(
          (item): MediaInput => ({
            kind: item.kind,
            url: item.url,
            youtubeId: item.youtubeId,
            caption: item.caption,
            width: item.width,
            height: item.height,
            bytes: item.bytes,
          }),
        ),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(status === "published" ? `/blog/${postId}` : "/blog");
      router.refresh();
    });
  }

  const busy = pending || uploading !== null;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">หัวเรื่อง</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={POST_TITLE_MAX}
          placeholder="เรื่องนี้ชื่ออะไร"
          className={FIELD}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">เล่าสั้นๆ</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder="อยากเล่าอะไร พิมพ์ได้เลย ขึ้นบรรทัดใหม่ได้ ลิงก์จะกดได้เอง"
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </label>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">รูปและวิดีโอ</h2>
          <span className="text-xs text-muted">
            ใช้ไปแล้ว {formatBytes(used)} จาก {formatBytes(STORAGE_LIMIT_BYTES)}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={Math.round(storagePercent(used))}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <span
            className="block h-full rounded-full bg-club-line"
            style={{ width: `${storagePercent(used)}%` }}
          />
        </div>

        {media.length > 0 ? (
          <ul className="space-y-2 pt-1">
            {media.map((item, index) => (
              <li
                key={item.key}
                className="flex gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xs text-accent-strong">
                    {item.kind === "youtube" ? "วิดีโอ" : "รูป"}
                  </span>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={item.caption}
                    onChange={(event) =>
                      setCaption(item.key, event.target.value)
                    }
                    maxLength={POST_CAPTION_MAX}
                    placeholder="คำอธิบายใต้ภาพ · ไม่ใส่ก็ได้"
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />

                  <div className="flex flex-wrap gap-2">
                    <SmallButton
                      label="เลื่อนขึ้น"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </SmallButton>
                    <SmallButton
                      label="เลื่อนลง"
                      disabled={index === media.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </SmallButton>
                    <SmallButton
                      label="เอาออก"
                      onClick={() => remove(item.key)}
                    >
                      ลบ
                    </SmallButton>
                    <span className="inline-flex min-h-9 items-center text-xs text-muted">
                      {item.kind === "youtube"
                        ? "วิดีโอ YouTube"
                        : item.bytes
                          ? formatBytes(item.bytes)
                          : "รูป"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {uploading ? (
          <div className="space-y-1 pt-1">
            <p className="text-xs text-muted">
              กำลังอัปรูป {uploading.done}/{uploading.total}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full bg-accent-strong transition-all"
                style={{
                  width: `${(uploading.done / Math.max(1, uploading.total)) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft disabled:opacity-60"
          >
            + รูป
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={addVideo}
            className="flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft disabled:opacity-60"
          >
            + วิดีโอ
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void addImages(files);
          }}
        />
      </section>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">ไปอยู่ที่</legend>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {sections.map((row) => (
            <button
              key={row.slug}
              type="button"
              onClick={() => setSection(row.slug)}
              aria-pressed={section === row.slug}
              className={`${CHIP} ${section === row.slug ? CHIP_ON : CHIP_OFF}`}
            >
              {row.title}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">ใครเห็นได้</legend>
        <div className="flex flex-wrap gap-2">
          {POST_VISIBILITIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setVisibility(option)}
              aria-pressed={visibility === option}
              className={`${CHIP} ${visibility === option ? CHIP_ON : CHIP_OFF}`}
            >
              {VISIBILITY_LABEL[option]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{VISIBILITY_HINT[visibility]}</p>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => save("draft")}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-border px-5 text-sm font-medium tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
        >
          เก็บร่าง
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save("published")}
          className="inline-flex min-h-12 flex-[2] items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : "โพสต์"}
        </button>
      </div>
    </div>
  );
}

function SmallButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border px-3 text-sm text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
