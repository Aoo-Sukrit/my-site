"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import Alert from "@/components/club/alert";
import { MAX_UPLOAD_BYTES, shrinkToJpeg } from "@/lib/image";
import {
  BOARD_LABEL,
  BOOBY_SLOT,
  PRIZE_DETAIL_MAX,
  PRIZE_EDIT_WINDOW_HOURS,
  PRIZE_RANKS,
  PRIZE_TITLE_MAX,
  checkPrizeDetail,
  checkPrizeTitle,
  type PrizeBoard,
} from "@/lib/prize-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  createPrizeAction,
  updatePrizeAction,
  type PrizeFormValues,
} from "./actions";

export type PrizeFormDefaults = {
  board: PrizeBoard;
  /** BOOBY_SLOT หรือเลข 1 ถึง 10 เป็นสตริง */
  rank: string;
  title: string;
  detail: string;
  isHidden: boolean;
};

const CHIP =
  "min-h-11 rounded-full border px-4 text-sm tracking-wide transition-colors";
const CHIP_ON = "border-club-line bg-club-line text-background";
const CHIP_OFF =
  "border-border text-muted hover:border-accent hover:text-foreground";

function Remaining({ used, max }: { used: number; max: number }) {
  const left = max - used;
  return (
    <span
      className={`text-xs tabular-nums ${left <= max * 0.1 ? "text-accent-strong" : "text-muted"}`}
    >
      เหลือ {left} ตัวอักษร
    </span>
  );
}

export default function PrizeForm({
  mode,
  prizeId,
  defaults,
  existingImageUrl,
}: {
  mode: "new" | "edit";
  prizeId?: string;
  defaults: PrizeFormDefaults;
  existingImageUrl?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [board, setBoard] = useState<PrizeBoard>(defaults.board);
  const [rank, setRank] = useState(defaults.rank);
  const [title, setTitle] = useState(defaults.title);
  const [detail, setDetail] = useState(defaults.detail);
  const [isHidden, setIsHidden] = useState(defaults.isHidden);

  const [picked, setPicked] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const titleCheck = useMemo(() => {
    const result = checkPrizeTitle(title);
    return {
      ok: result.ok,
      message: result.ok || title.trim() === "" ? null : result.reason,
    };
  }, [title]);

  const detailOk = useMemo(() => checkPrizeDetail(detail).ok, [detail]);

  function handlePick(file: File) {
    if (preview) URL.revokeObjectURL(preview);
    setPicked(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function uploadImage(file: File): Promise<string> {
    const blob = await shrinkToJpeg(file, { maxBytes: MAX_UPLOAD_BYTES });

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("เซสชันหมดอายุ ลองเข้าสู่ระบบใหม่");

    const path = `${user.id}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("prizes")
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
      if (!titleCheck.ok) throw new Error("ใส่ชื่อของรางวัลด้วย");
      if (!detailOk) {
        throw new Error(`รายละเอียดยาวเกิน ${PRIZE_DETAIL_MAX} ตัวอักษร`);
      }

      const imagePath = picked ? await uploadImage(picked) : null;

      const values: PrizeFormValues = {
        board,
        rank,
        title,
        detail,
        imagePath,
        isHidden,
      };

      const result =
        mode === "new"
          ? await createPrizeAction(values)
          : await updatePrizeAction(prizeId as string, values);

      if (result.error) throw new Error(result.error);

      router.push("/club?board=rewards");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">กระดาน</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BOARD_LABEL) as PrizeBoard[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setBoard(option)}
              aria-pressed={board === option}
              className={`${CHIP} ${board === option ? CHIP_ON : CHIP_OFF}`}
            >
              {BOARD_LABEL[option]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">อันดับ</legend>
        <div className="flex flex-wrap gap-2">
          {PRIZE_RANKS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRank(String(option))}
              aria-pressed={rank === String(option)}
              className={`${CHIP} min-w-11 ${rank === String(option) ? CHIP_ON : CHIP_OFF}`}
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRank(BOOBY_SLOT)}
            aria-pressed={rank === BOOBY_SLOT}
            className={`${CHIP} ${rank === BOOBY_SLOT ? CHIP_ON : CHIP_OFF}`}
          >
            บูบี้ (รองสุดท้าย)
          </button>
        </div>
        <p className="text-xs text-muted">
          อันดับเดียวกันมีหลายรางวัลซ้อนกันได้ ไม่ต้องกลัวชนกับของคนอื่น
        </p>
        <p className="text-xs text-muted">
          บูบี้คือคนที่มีค่าน้อยเป็นอันดับสอง นับเฉพาะคนที่อยู่ในเกมจริง
          เช่นระยะ 50 · 20 · 5 · 5 ที่โหล่คือสองคนที่ได้ 5 บูบี้คือคนที่ได้ 20
        </p>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">ของรางวัลคืออะไร</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={PRIZE_TITLE_MAX}
          placeholder="เช่น เบียร์ 1 ลัง"
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <span className="flex items-center justify-between gap-3">
          <span
            className={`text-xs ${titleCheck.message ? "text-club-line" : "text-muted"}`}
          >
            {titleCheck.message ?? "บอกให้ชัดว่าได้อะไร"}
          </span>
          <Remaining used={title.length} max={PRIZE_TITLE_MAX} />
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">รายละเอียด (ไม่บังคับ)</span>
        <textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={PRIZE_DETAIL_MAX}
          rows={3}
          placeholder="เช่น รับที่ร้านประจำ นัดวันกันอีกที"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <span className="flex items-center justify-end">
          <Remaining used={detail.length} max={PRIZE_DETAIL_MAX} />
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          รูปของรางวัล (ไม่บังคับ
          {mode === "edit" ? " ไม่เปลี่ยนก็ได้" : ""})
        </p>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="รูปของรางวัลที่เพิ่งเลือก"
            className="max-h-56 w-full rounded-2xl border border-border object-contain"
          />
        ) : existingImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={existingImageUrl}
            alt="รูปของรางวัลเดิม"
            className="max-h-56 w-full rounded-2xl border border-border object-contain"
          />
        ) : null}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          {preview ? "เลือกรูปใหม่" : "ถ่ายรูปหรือเลือกจากคลัง"}
        </button>

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

      {mode === "new" ? (
        <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
          <input
            type="checkbox"
            checked={isHidden}
            onChange={(event) => setIsHidden(event.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--club-line)]"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">ปิดอุบไว้ก่อน</span>
            <span className="block text-xs text-muted">
              คนอื่นเห็นแค่ว่ามีของขวัญปิดอุบ ใครเป็นคนให้ และผูกกับอันดับไหน
              แต่ไม่เห็นชื่อ รายละเอียด และรูป
              คุณกดเปิดเองเมื่อไหร่ก็ได้ ถ้าไม่กดระบบเปิดให้ตอนจบเดือน
            </span>
          </span>
        </label>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-club-line px-5 text-base font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
      >
        {busy
          ? "กำลังบันทึก…"
          : mode === "new"
            ? "ตั้งรางวัลนี้"
            : "บันทึกการแก้ไข"}
      </button>

      <p className="text-xs text-muted">
        แก้หรือลบได้ภายใน {PRIZE_EDIT_WINDOW_HOURS} ชั่วโมงหลังตั้ง
        หลังจากนั้นถอนไม่ได้ ของที่ให้ไปแล้วถือว่าให้แล้ว
      </p>
    </form>
  );
}
