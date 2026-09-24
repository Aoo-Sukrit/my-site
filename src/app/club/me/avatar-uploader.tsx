"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import Alert from "@/components/club/alert";
import Avatar from "@/components/club/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { saveAvatarUrlAction } from "./actions";

/** เพดานของบัคเก็ตคือ 500KB เผื่อระยะไว้หน่อย */
const MAX_BYTES = 450_000;
const MAX_EDGE = 512;

/**
 * ย่อรูปในเครื่องก่อนอัป
 *
 * imageOrientation: "from-image" สำคัญมากสำหรับรูปจากมือถือ ไม่งั้นรูปที่ถ่าย
 * แนวตั้งจะกลายเป็นนอนตะแคง เพราะข้อมูลการหมุนอยู่ใน EXIF ไม่ใช่ในพิกเซล
 *
 * ไล่ลดคุณภาพก่อน ถ้ายังไม่พอค่อยลดขนาดภาพแล้ววนใหม่
 */
async function shrinkToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    let edge = MAX_EDGE;

    for (let round = 0; round < 4; round += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("เบราว์เซอร์นี้ย่อรูปให้ไม่ได้");
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.85, 0.7, 0.55, 0.42]) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });
        if (blob && blob.size <= MAX_BYTES) return blob;
      }

      edge = Math.round(edge * 0.75);
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setDone(false);

    try {
      const blob = await shrinkToJpeg(file);

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
      const result = await saveAvatarUrlAction(`${data.publicUrl}?v=${Date.now()}`);

      if (result.error) throw new Error(result.error);

      setDone(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar src={avatarUrl} nickname={nickname} size={72} />

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide transition-colors hover:border-accent disabled:opacity-60"
          >
            {busy ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}
          </button>
          <p className="text-xs text-muted">ย่อให้เองอัตโนมัติ ไม่เกิน 500KB</p>
        </div>
      </div>

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
    </div>
  );
}
