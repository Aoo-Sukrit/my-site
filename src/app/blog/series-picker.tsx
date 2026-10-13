"use client";

import { useRef, useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import { shrinkToJpeg } from "@/lib/image";
import {
  POST_BUCKET,
  POST_IMAGE_MAX_EDGE,
  POST_IMAGE_QUALITY,
} from "@/lib/post-rules";
import {
  SERIES_DEFAULT_UNIT,
  SERIES_DESCRIPTION_MAX,
  SERIES_ORDER_MAX,
  SERIES_SLUG_MAX,
  SERIES_TITLE_MAX,
  SERIES_UNIT_MAX,
  seriesSlugFrom,
} from "@/lib/series-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SeriesOption } from "@/lib/supabase/types";

import { deleteSeriesAction, saveSeriesAction } from "./actions";

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15";
const SMALL_FIELD =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15";
const GHOST =
  "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60";

/** ค่าพิเศษใน dropdown ที่เปิดฟอร์มสร้างซีรีส์ใหม่ */
const NEW = "__new__";

type Draft = {
  id: string;
  slug: string;
  title: string;
  description: string;
  unitLabel: string;
  coverUrl: string | null;
  /** รูปปกที่เพิ่งเลือก ยังไม่ได้บันทึก ไว้โชว์ตัวอย่าง */
  coverPreview: string | null;
};

function blankDraft(): Draft {
  return {
    id: globalThis.crypto.randomUUID(),
    slug: "",
    title: "",
    description: "",
    unitLabel: SERIES_DEFAULT_UNIT,
    coverUrl: null,
    coverPreview: null,
  };
}

function draftFrom(series: SeriesOption, coverSrc: string | null): Draft {
  return {
    id: series.id,
    slug: series.slug,
    title: series.title,
    description: series.description,
    unitLabel: series.unit_label,
    coverUrl: series.cover_url,
    coverPreview: coverSrc,
  };
}

/**
 * เลือกซีรีส์กับเลขตอนในหน้าเขียนโพสต์
 *
 * สร้างซีรีส์ใหม่หรือแก้ซีรีส์เดิมได้ในที่เดียวกัน ไม่ต้องออกไปหน้าอื่น
 * เพราะส่วนใหญ่จะนึกได้ว่าอยากทำเป็นซีรีส์ตอนกำลังเขียนตอนแรกอยู่นี่เอง
 */
export default function SeriesPicker({
  initialList,
  seriesId,
  order,
  onChange,
  coverUrlOf,
  disabled,
}: {
  initialList: SeriesOption[];
  seriesId: string | null;
  order: string;
  onChange: (next: { seriesId: string | null; order: string }) => void;
  /** แปลงที่อยู่ไฟล์เป็น URL เต็ม ส่งมาจาก Server Component */
  coverUrlOf: Record<string, string>;
  disabled?: boolean;
}) {
  const [list, setList] = useState(initialList);
  const [form, setForm] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = list.find((item) => item.id === seriesId) ?? null;
  const unit = selected?.unit_label ?? SERIES_DEFAULT_UNIT;

  function pick(value: string) {
    setError(null);
    setConfirmDelete(false);

    if (value === NEW) {
      setForm(blankDraft());
      return;
    }

    setForm(null);
    if (!value) {
      onChange({ seriesId: null, order: "" });
      return;
    }

    const next = list.find((item) => item.id === value);
    // เดาเลขตอนถัดไปให้ ถ้ายังไม่ได้พิมพ์อะไรไว้
    const guess = String((next?.max_order ?? 0) + 1);
    onChange({ seriesId: value, order: order.trim() ? order : guess });
  }

  async function uploadCover(file: File) {
    if (!form) return;
    setError(null);
    setUploading(true);

    try {
      const blob = await shrinkToJpeg(file, {
        maxEdge: POST_IMAGE_MAX_EDGE,
        maxBytes: 1_500_000,
        quality: POST_IMAGE_QUALITY,
      });
      const path = `series/${form.id}/${globalThis.crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await createSupabaseBrowserClient()
        .storage.from(POST_BUCKET)
        .upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      setForm((draft) =>
        draft
          ? { ...draft, coverUrl: path, coverPreview: URL.createObjectURL(blob) }
          : draft,
      );
    } catch (cause) {
      setError(
        `อัปรูปปกไม่สำเร็จ: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    if (!form) return;
    setError(null);

    startTransition(async () => {
      const result = await saveSeriesAction({
        id: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        unitLabel: form.unitLabel,
        coverUrl: form.coverUrl,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const saved = result.series;
      const isNew = !list.some((item) => item.id === saved.id);
      setList((rows) =>
        isNew
          ? [saved, ...rows]
          : rows.map((item) => (item.id === saved.id ? saved : item)),
      );
      setForm(null);

      if (isNew || seriesId !== saved.id) {
        onChange({
          seriesId: saved.id,
          order: order.trim() ? order : String((saved.max_order ?? 0) + 1),
        });
      }
    });
  }

  function remove() {
    if (!form) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteSeriesAction(form.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setList((rows) => rows.filter((item) => item.id !== form.id));
      setForm(null);
      setConfirmDelete(false);
      onChange({ seriesId: null, order: "" });
    });
  }

  const busy = disabled || pending || uploading;
  const editingExisting = form !== null && list.some((item) => item.id === form.id);
  const slugHint = form
    ? form.slug.trim() || seriesSlugFrom(form.title) || "series-xxxxxx"
    : "";

  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">ซีรีส์</legend>

      <div className="flex gap-2">
        <select
          value={form && !editingExisting ? NEW : (seriesId ?? "")}
          onChange={(event) => pick(event.target.value)}
          disabled={busy}
          className={`${FIELD} min-w-0 flex-1`}
        >
          <option value="">ไม่อยู่ในซีรีส์</option>
          {list.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
          <option value={NEW}>+ สร้างซีรีส์ใหม่…</option>
        </select>

        {seriesId ? (
          <label className="flex w-28 shrink-0 flex-col">
            <span className="sr-only">เลข {unit}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={SERIES_ORDER_MAX}
              value={order}
              onChange={(event) =>
                onChange({ seriesId, order: event.target.value })
              }
              disabled={busy}
              placeholder="1"
              aria-label={`เลข ${unit}`}
              className={`${FIELD} text-center`}
            />
          </label>
        ) : null}
      </div>

      {selected && !form ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            จะขึ้นเป็น “{selected.title} · {unit} {order || "?"}” ·{" "}
            /blog/series/{selected.slug}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setConfirmDelete(false);
              setForm(
                draftFrom(
                  selected,
                  selected.cover_url ? (coverUrlOf[selected.cover_url] ?? null) : null,
                ),
              );
            }}
            className="inline-flex min-h-11 items-center text-sm tracking-wide text-accent-strong underline-offset-4 hover:underline disabled:opacity-60"
          >
            แก้ข้อมูลซีรีส์
          </button>
        </div>
      ) : null}

      {form ? (
        <div className="space-y-3 rounded-2xl border border-club-line bg-accent-soft p-4">
          <p className="text-sm font-medium">
            {editingExisting ? "แก้ข้อมูลซีรีส์" : "ซีรีส์ใหม่"}
          </p>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <label className="block space-y-1">
            <span className="text-xs text-muted">ชื่อซีรีส์</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={SERIES_TITLE_MAX}
              placeholder="Quant Trading Journey"
              className={SMALL_FIELD}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">slug ในลิงก์ · ไม่ใส่ก็ได้</span>
            <input
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value.toLowerCase() })
              }
              maxLength={SERIES_SLUG_MAX}
              placeholder={seriesSlugFrom(form.title) || "quant-trading"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={`${SMALL_FIELD} font-mono text-sm`}
            />
            <span className="block break-all text-xs text-muted">
              /blog/series/{slugHint}
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">คำอธิบายสั้นๆ · ไม่ใส่ก็ได้</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              maxLength={SERIES_DESCRIPTION_MAX}
              rows={3}
              placeholder="บันทึกการเรียน Quant Trading กับอาจารย์เอ็ม ทีละสัปดาห์"
              className={`${SMALL_FIELD} resize-y py-2 leading-relaxed`}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">คำเรียกตอน</span>
            <input
              value={form.unitLabel}
              onChange={(event) =>
                setForm({ ...form, unitLabel: event.target.value })
              }
              maxLength={SERIES_UNIT_MAX}
              placeholder={SERIES_DEFAULT_UNIT}
              className={SMALL_FIELD}
            />
            <span className="block text-xs text-muted">
              เช่น Week, EP, ตอนที่ → “{form.unitLabel.trim() || SERIES_DEFAULT_UNIT} 1”
            </span>
          </label>

          <div className="space-y-1">
            <span className="text-xs text-muted">
              รูปปก · ไม่ใส่ก็ได้ จะใช้รูปแรกของตอนแรกแทน
            </span>
            <div className="flex items-center gap-3">
              {form.coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.coverPreview}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                />
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className={GHOST}
              >
                {uploading ? "กำลังอัป…" : form.coverUrl ? "เปลี่ยนรูป" : "+ รูปปก"}
              </button>
              {form.coverUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setForm({ ...form, coverUrl: null, coverPreview: null })
                  }
                  className={GHOST}
                >
                  เอาออก
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadCover(file);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="inline-flex min-h-11 items-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึกซีรีส์"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setForm(null);
                setError(null);
                setConfirmDelete(false);
              }}
              className={GHOST}
            >
              ยกเลิก
            </button>

            {editingExisting ? (
              confirmDelete ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="inline-flex min-h-11 items-center rounded-full bg-negative px-4 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
                >
                  ยืนยันลบซีรีส์
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  className={`${GHOST} ml-auto`}
                >
                  ลบซีรีส์
                </button>
              )
            ) : null}
          </div>

          {confirmDelete ? (
            <p className="text-xs text-muted">
              โพสต์ในซีรีส์ยังอยู่ครบ แค่กลายเป็นโพสต์เดี่ยว
            </p>
          ) : null}
        </div>
      ) : null}

      {error && !form ? <Alert tone="error">{error}</Alert> : null}
    </fieldset>
  );
}
