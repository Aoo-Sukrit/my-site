"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import Alert from "@/components/club/alert";
import { PortraitAvatar } from "@/components/club/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import ImageCropper, { CROP_ASPECT } from "./image-cropper";
import { saveAvatarUrlAction } from "./actions";

/** เพดานของบัคเก็ตคือ 500KB เผื่อระยะไว้หน่อย */
const MAX_BYTES = 450_000;
/** ด้านกว้างของไฟล์ที่อัปจริง 3:4 จึงได้ 720x960 */
const OUTPUT_WIDTH = 720;
/** ย่อรูปต้นทางก่อนส่งเข้าหน้าครอป กันรูป 12 ล้านพิกเซลจากมือถือกินแรมจนค้าง */
const SOURCE_MAX_EDGE = 1600;

async function toJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

/**
 * แปลงไฟล์ที่เลือกให้เป็น JPEG ที่ "ตรงไปตรงมา" ก่อนเข้าหน้าครอป
 *
 * imageOrientation: "from-image" สำคัญมากสำหรับรูปจากมือถือ ข้อมูลการหมุน
 * อยู่ใน EXIF ไม่ใช่ในพิกเซล ถ้าไม่สั่งตรงนี้ รูปแนวตั้งจะกลายเป็นนอนตะแคง
 * พอวาดลง canvas แล้ว export ใหม่ EXIF จะหายไปเลย ขั้นตอนครอปหลังจากนี้
 * จึงไม่ต้องกังวลเรื่องการหมุนอีก
 */
async function normalizeSource(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const scale = Math.min(
      1,
      SOURCE_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("เบราว์เซอร์นี้จัดการรูปให้ไม่ได้");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await toJpegBlob(canvas, 0.92);
    if (!blob) throw new Error("อ่านรูปนี้ไม่ได้ ลองเลือกรูปอื่น");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** ตัดตามกรอบที่ผู้ใช้เลือก แล้วไล่ลดคุณภาพ/ขนาดจนไม่เกินเพดาน */
async function cropToJpeg(source: Blob, area: Area): Promise<Blob> {
  const bitmap = await createImageBitmap(source);

  try {
    let width = OUTPUT_WIDTH;

    for (let round = 0; round < 4; round += 1) {
      const height = Math.round(width / CROP_ASPECT);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("เบราว์เซอร์นี้ครอปรูปให้ไม่ได้");
      context.drawImage(
        bitmap,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        width,
        height,
      );

      for (const quality of [0.85, 0.7, 0.55, 0.42]) {
        const blob = await toJpegBlob(canvas, quality);
        if (blob && blob.size <= MAX_BYTES) return blob;
      }

      width = Math.round(width * 0.75);
    }
  } finally {
    bitmap.close();
  }

  throw new Error("ย่อรูปให้เล็กพอไม่ได้ ลองเลือกรูปอื่น");
}

export default function AvatarUploader({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null;
  nickname: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // object URL ต้องคืนให้เบราว์เซอร์เอง ไม่งั้นรูปค้างในหน่วยความจำ
  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url);
    };
  }, [source]);

  function closeCropper() {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
  }

  async function handleFile(file: File) {
    setError(null);
    setDone(false);

    try {
      const blob = await normalizeSource(file);
      setSource({ blob, url: URL.createObjectURL(blob) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      // เคลียร์ค่าใน input เพื่อให้เลือกไฟล์เดิมซ้ำแล้วยัง onChange อีกรอบ
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleConfirm(area: Area) {
    if (!source) return;

    setBusy(true);
    setError(null);

    try {
      const blob = await cropToJpeg(source.blob, area);

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("เซสชันหมดอายุ ลองเข้าสู่ระบบใหม่");

      // ชื่อไฟล์คงที่ต่อคน อัปทับของเดิมไปเลย จะได้ไม่มีไฟล์เก่าค้าง
      const path = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // ?v= ไว้ไล่แคชของเบราว์เซอร์ ไม่งั้นจะยังเห็นรูปเก่าอยู่
      const result = await saveAvatarUrlAction(
        `${data.publicUrl}?v=${Date.now()}`,
      );

      if (result.error) throw new Error(result.error);

      closeCropper();
      setDone(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group block w-full cursor-pointer text-left"
      >
        <span className="relative block">
          <PortraitAvatar
            src={avatarUrl}
            nickname={nickname}
            className="transition group-hover:opacity-90"
          />
          <span className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-black/55 px-4 py-3 text-center text-sm text-white">
            {avatarUrl ? "แตะที่รูปเพื่อเปลี่ยน" : "แตะเพื่อใส่รูป"}
          </span>
        </span>
      </button>

      <p className="text-xs text-muted">
        ครอปเป็นแนวตั้ง 3:4 แล้วย่อให้เองอัตโนมัติ ไม่เกิน 500KB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">เปลี่ยนรูปเรียบร้อย</Alert> : null}

      {source ? (
        <ImageCropper
          src={source.url}
          busy={busy}
          onCancel={() => {
            if (!busy) closeCropper();
          }}
          onConfirm={(area) => void handleConfirm(area)}
        />
      ) : null}
    </div>
  );
}
