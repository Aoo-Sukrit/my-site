"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import Alert from "@/components/club/alert";
import { PortraitAvatar } from "@/components/club/avatar";
import {
  AVATAR_BUCKET,
  avatarPath,
  avatarThumbPath,
} from "@/lib/avatar-thumb";
import {
  MAX_UPLOAD_BYTES,
  makeAvatarThumb,
  normalizeForCrop,
  toJpegBlob,
} from "@/lib/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import ImageCropper, { CROP_ASPECT } from "./image-cropper";
import { saveAvatarUrlAction } from "./actions";

/** ด้านกว้างของไฟล์ที่อัปจริง 9:16 จึงได้ 608x1081 */
const OUTPUT_WIDTH = 608;

/**
 * สีที่เติมช่องว่างรอบรูป
 *
 * พอปลดให้ซูมออกจนเห็นรูปทั้งใบได้ กรอบครอปจะเลยขอบรูปออกไปได้
 * ถ้าไม่เติมสีไว้ก่อน ส่วนนั้นจะเป็นพื้นโปร่งใส ซึ่งพอบันทึกเป็น JPEG
 * (ซึ่งไม่มีช่องโปร่งใส) จะกลายเป็นสีดำสนิท
 * ใช้สีครีมอ่อนให้กลืนกับพื้นเว็บและพื้นรูปสตอรี่
 */
const CROP_BACKDROP = "#f0e4d4";

/**
 * ตัดตามกรอบที่ผู้ใช้เลือก แล้วไล่ลดคุณภาพ/ขนาดจนไม่เกินเพดาน
 *
 * area มาจาก react-easy-crop ที่ปิด restrictPosition ไว้ พิกัดจึงออกนอกรูปได้
 * ทั้งติดลบและเกินขนาดรูป เลยต้องหาส่วนที่ซ้อนกับรูปจริงเองแล้ววาดเฉพาะส่วนนั้น
 * ลงตำแหน่งที่ถูกต้องบนผืนผ้าใบ ไม่ปล่อยให้ drawImage เดาเอง
 */
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

      context.fillStyle = CROP_BACKDROP;
      context.fillRect(0, 0, width, height);

      // ส่วนที่กรอบครอปกับตัวรูปซ้อนกันจริง ในพิกัดของรูปต้นฉบับ
      const sx = Math.max(0, area.x);
      const sy = Math.max(0, area.y);
      const sRight = Math.min(bitmap.width, area.x + area.width);
      const sBottom = Math.min(bitmap.height, area.y + area.height);
      const sWidth = sRight - sx;
      const sHeight = sBottom - sy;

      if (sWidth > 0 && sHeight > 0) {
        // แปลงพิกัดนั้นไปเป็นตำแหน่งบนผืนผ้าใบตามอัตราย่อขยายเดียวกัน
        const scaleX = width / area.width;
        const scaleY = height / area.height;

        context.drawImage(
          bitmap,
          sx,
          sy,
          sWidth,
          sHeight,
          (sx - area.x) * scaleX,
          (sy - area.y) * scaleY,
          sWidth * scaleX,
          sHeight * scaleY,
        );
      }

      for (const quality of [0.85, 0.7, 0.55, 0.42]) {
        const blob = await toJpegBlob(canvas, quality);
        if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
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
      const blob = await normalizeForCrop(file);
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
      const path = avatarPath(user.id);

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      // เก็บรูปเล็กไว้ข้างๆ ด้วย รูปสตอรี่จะได้ไม่ต้องดึงไฟล์เต็มมาทั้ง 14 คน
      //
      // ถ้าขั้นนี้พลาดก็ไม่ล้มทั้งงาน เพราะรูปโปรไฟล์หลักอัปขึ้นไปแล้ว
      // ฝั่งรูปสตอรี่ถอยไปใช้ไฟล์เต็มเองอยู่แล้วถ้าหารูปเล็กไม่เจอ
      try {
        const thumb = await makeAvatarThumb(blob);
        await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(avatarThumbPath(user.id), thumb, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });
      } catch {
        // ไม่ต้องบอกผู้ใช้ เพราะรูปที่เขาเห็นบนเว็บถูกต้องแล้ว
      }

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
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
