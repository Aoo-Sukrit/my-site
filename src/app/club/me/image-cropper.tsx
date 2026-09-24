"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

export const CROP_ASPECT = 3 / 4;

/**
 * หน้าต่างครอปรูป ล็อกสัดส่วน 3:4 แนวตั้ง
 *
 * react-easy-crop รับมือ pinch zoom กับการลากด้วยนิ้วให้เองแล้ว
 * และฉีด CSS ของตัวเองเข้ามาอัตโนมัติ เลยไม่ต้อง import ไฟล์ css แยก
 *
 * คืนค่าเป็น croppedAreaPixels ซึ่งเป็นพิกัดบนรูปต้นฉบับ
 * คนเรียกเอาไปตัดจริงบน canvas อีกที
 */
export default function ImageCropper({
  src,
  busy,
  onCancel,
  onConfirm,
}: {
  src: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (area: Area) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const handleCropComplete = useCallback(
    (_percent: Area, pixels: Area) => setArea(pixels),
    [],
  );

  // กันหน้าเว็บข้างหลังเลื่อนตามนิ้วตอนกำลังลากรูปอยู่
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // ปิดด้วยปุ่ม Esc บนคีย์บอร์ด
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ครอปรูปโปรไฟล์"
      className="fixed inset-0 z-50 flex flex-col bg-black/80"
    >
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={CROP_ASPECT}
          minZoom={1}
          maxZoom={4}
          restrictPosition
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          style={{
            // touch-action: none กันเบราว์เซอร์แย่งอีเวนต์นิ้วไปเลื่อนหน้าจอ
            containerStyle: { touchAction: "none" },
          }}
        />
      </div>

      <div className="space-y-4 bg-background px-5 pt-4 pb-6">
        <p className="text-center text-sm text-muted">
          ลากเพื่อเลื่อน จีบสองนิ้วเพื่อซูม
        </p>

        <label className="flex items-center gap-3">
          <span className="text-xs text-muted">ซูม</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="ระดับการซูม"
            className="h-11 w-full accent-[var(--accent-strong)]"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => area && onConfirm(area)}
            disabled={busy || !area}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-club-line text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "กำลังอัปโหลด…" : "ใช้รูปนี้"}
          </button>
        </div>
      </div>
    </div>
  );
}
