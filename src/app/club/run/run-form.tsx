"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import Alert from "@/components/club/alert";
import { thaiMonthLabel } from "@/lib/date";
import { MAX_UPLOAD_BYTES, shrinkToJpeg } from "@/lib/image";
import { checkEntryWindow, monthRange } from "@/lib/run-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RUN_SOURCES } from "@/lib/supabase/types";

import {
  createRunAction,
  updateRunAction,
  type RunFormValues,
} from "./actions";

export type RunFormDefaults = {
  ranOn: string;
  distanceKm: string;
  source: string;
  note: string;
};

export default function RunForm({
  mode,
  runId,
  memberId,
  defaults,
  today,
  lockedMonth,
  existingProofUrl,
}: {
  mode: "new" | "edit";
  runId?: string;
  memberId: string;
  defaults: RunFormDefaults;
  /** วันนี้ตามเวลาไทย ส่งมาจากเซิร์ฟเวอร์ ไม่ใช้นาฬิกาของเครื่องผู้ใช้ */
  today: string;
  /** โหมดแก้ไข: เดือนของรอบที่รายการนี้สังกัด ห้ามแก้วันที่ข้ามเดือน */
  lockedMonth?: string;
  /** โหมดแก้ไข: ลิงก์รูปหลักฐานเดิม ไว้ดูว่าของเดิมเป็นรูปอะไร */
  existingProofUrl?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [ranOn, setRanOn] = useState(defaults.ranOn);
  const [distanceKm, setDistanceKm] = useState(defaults.distanceKm);
  const [source, setSource] = useState(defaults.source);
  const [note, setNote] = useState(defaults.note);

  const [preview, setPreview] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  /** บอกทันทีที่เลือกวันที่ว่าจะเข้ารอบไหน หรือทำไมกรอกไม่ได้ */
  const dateState = useMemo(() => {
    if (mode === "edit" && lockedMonth) {
      const sameMonth = ranOn.slice(0, 7) === lockedMonth.slice(0, 7);
      return sameMonth
        ? { ok: true as const, message: `อยู่ในรอบเดือน${thaiMonthLabel(lockedMonth)}` }
        : {
            ok: false as const,
            message: `รายการนี้อยู่ในรอบเดือน${thaiMonthLabel(lockedMonth)} แก้วันที่ข้ามเดือนไม่ได้`,
          };
    }

    const check = checkEntryWindow(ranOn, today);
    return check.ok
      ? { ok: true as const, message: check.hint }
      : { ok: false as const, message: check.reason };
  }, [mode, lockedMonth, ranOn, today]);

  const dateBounds = useMemo(() => {
    if (mode === "edit" && lockedMonth) {
      const range = monthRange(lockedMonth.slice(0, 7));
      return { min: range.min, max: range.max < today ? range.max : today };
    }
    return { min: undefined, max: today };
  }, [mode, lockedMonth, today]);

  function handlePick(file: File) {
    if (preview) URL.revokeObjectURL(preview);
    setPicked(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  /** ย่อแล้วอัปขึ้นบัคเก็ต proofs คืนที่อยู่ไฟล์ให้ server action */
  async function uploadProof(file: File): Promise<string> {
    const blob = await shrinkToJpeg(file, { maxBytes: MAX_UPLOAD_BYTES });

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("เซสชันหมดอายุ ลองเข้าสู่ระบบใหม่");

    // ชื่อไฟล์สุ่มใหม่ทุกครั้ง เพื่อให้แก้ผลวิ่งแล้วยังเก็บรูปเดิมไว้ดูได้
    // จากประวัติการแก้ ถ้าอัปทับจะทำให้หลักฐานเก่าหายไป
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);
    return path;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      if (!dateState.ok) throw new Error(dateState.message);
      if (mode === "new" && !picked) {
        throw new Error("แนบรูปหลักฐานก่อนนะ");
      }

      const proofPath = picked ? await uploadProof(picked) : null;

      const values: RunFormValues = {
        ranOn,
        distanceKm,
        source,
        note,
        proofPath,
      };

      const result =
        mode === "new"
          ? await createRunAction(values)
          : await updateRunAction(runId as string, values);

      if (result.error) throw new Error(result.error);

      if (mode === "new") {
        router.push("/club?saved=1");
      } else {
        router.push(
          `/club/member/${memberId}?msg=${encodeURIComponent("แก้ไขแล้ว")}`,
        );
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">วันที่วิ่ง</span>
        <input
          type="date"
          value={ranOn}
          min={dateBounds.min}
          max={dateBounds.max}
          required
          onChange={(event) => setRanOn(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-accent"
        />
        <span
          className={`block text-xs ${dateState.ok ? "text-muted" : "text-club-line"}`}
        >
          {dateState.message}
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ระยะ (กม.)</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max="9999.99"
          value={distanceKm}
          required
          placeholder="เช่น 5.20"
          onChange={(event) => setDistanceKm(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-accent"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">แอปที่มา</legend>
        <div className="flex flex-wrap gap-2">
          {RUN_SOURCES.map((option) => {
            const active = option === source;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSource(option)}
                aria-pressed={active}
                className={`min-h-11 rounded-full border px-4 text-sm tracking-wide transition-colors ${
                  active
                    ? "border-club-line bg-club-line text-background"
                    : "border-border text-muted hover:border-accent hover:text-foreground"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          รูปหลักฐาน {mode === "new" ? "" : "(ไม่เปลี่ยนก็ได้)"}
        </p>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="รูปหลักฐานที่เพิ่งเลือก"
            className="max-h-64 w-full rounded-2xl border border-border object-contain"
          />
        ) : existingProofUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={existingProofUrl}
            alt="รูปหลักฐานเดิม"
            className="max-h-64 w-full rounded-2xl border border-border object-contain"
          />
        ) : null}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          {preview ? "เลือกรูปใหม่" : "ถ่ายรูปหรือเลือกจากคลัง"}
        </button>

        {/* ไม่ใส่ capture เพื่อให้มือถือถามว่าจะถ่ายใหม่หรือเลือกจากคลัง
            ถ้าใส่ capture มันจะเปิดกล้องอย่างเดียว */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handlePick(file);
            event.target.value = "";
          }}
        />
        <p className="text-xs text-muted">ย่อให้เองอัตโนมัติ ไม่เกิน 500KB</p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">หมายเหตุ (ไม่บังคับ)</span>
        <textarea
          value={note}
          rows={3}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder="เช่น วิ่งรอบสวนตอนเย็น ฝนตกนิดหน่อย"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
        />
      </label>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <button
        type="submit"
        disabled={busy || !dateState.ok}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-club-line px-5 text-base font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
      >
        {busy
          ? "กำลังบันทึก…"
          : mode === "new"
            ? "บันทึกผลวิ่ง"
            : "บันทึกการแก้ไข"}
      </button>
    </form>
  );
}
