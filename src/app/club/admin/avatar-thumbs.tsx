"use client";

import { useState } from "react";

import Alert from "@/components/club/alert";
import {
  AVATAR_BUCKET,
  avatarThumbPath,
  avatarThumbUrl,
} from "@/lib/avatar-thumb";
import { makeAvatarThumb } from "@/lib/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ThumbTarget = {
  id: string;
  nickname: string;
  avatarUrl: string;
};

type Progress = {
  done: number;
  total: number;
  created: number;
  skipped: number;
  failed: string[];
};

/**
 * ปุ่มสร้างรูปเล็กย้อนหลังให้สมาชิกที่อัปรูปไว้ก่อนมีระบบนี้
 *
 * ทำไมต้องทำในเบราว์เซอร์ของแอดมิน
 * แพ็กเกจ Free ของ Supabase ไม่มี image transformation และเราไม่มีตัวย่อรูป
 * ฝั่งเซิร์ฟเวอร์ (ไม่อยากเพิ่ม native dependency ให้ deploy เสี่ยงขึ้น)
 * แต่ canvas ในเบราว์เซอร์ย่อรูปได้อยู่แล้ว และเป็นโค้ดชุดเดียวกับที่ตัวอัปโหลด
 * ของสมาชิกใช้ ผลที่ได้จึงเหมือนกันเป๊ะ
 *
 * ทำทีละคนไม่ใช่ยิงพร้อมกันหมด เพราะการถอดรหัสรูปกิน memory
 * มือถือเครื่องเก่าอาจแครชถ้าเปิดสิบกว่ารูปพร้อมกัน
 *
 * กดซ้ำได้ ของใครมีอยู่แล้วจะข้ามให้เอง
 */
export default function AvatarThumbs({ members }: { members: ThumbTarget[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);

    const state: Progress = {
      done: 0,
      total: members.length,
      created: 0,
      skipped: 0,
      failed: [],
    };
    setProgress({ ...state });

    try {
      const supabase = createSupabaseBrowserClient();

      for (const member of members) {
        try {
          const thumbUrl = avatarThumbUrl(member.avatarUrl);
          if (!thumbUrl) {
            state.skipped += 1;
            continue;
          }

          // มีอยู่แล้วก็ข้าม no-store กันไม่ให้เบราว์เซอร์จำ 404 เก่าไว้
          const existing = await fetch(thumbUrl, { cache: "no-store" });
          if (existing.ok) {
            state.skipped += 1;
            continue;
          }

          const full = await fetch(member.avatarUrl, { cache: "no-store" });
          if (!full.ok) throw new Error(`โหลดรูปเต็มไม่ได้ (${full.status})`);

          const thumb = await makeAvatarThumb(await full.blob());

          const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(avatarThumbPath(member.id), thumb, {
              contentType: "image/jpeg",
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadError) throw new Error(uploadError.message);
          state.created += 1;
        } catch (cause) {
          const why = cause instanceof Error ? cause.message : String(cause);
          state.failed.push(`${member.nickname} (${why})`);
        } finally {
          state.done += 1;
          setProgress({ ...state, failed: [...state.failed] });
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const finished = progress !== null && !busy && progress.done > 0;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">รูปเล็กสำหรับรูปสตอรี่</h2>
        <p className="text-sm text-muted">
          รูปสตอรี่ใช้รูปโปรไฟล์ย่อ จะได้ไม่ต้องดึงไฟล์เต็มของทุกคนมาวาด
          คนที่อัปรูปหลังจากนี้ระบบสร้างให้เอง ปุ่มนี้ไว้ทำย้อนหลังให้คนที่อัปไว้ก่อน
          กดซ้ำได้ ของใครมีแล้วจะข้ามให้
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted">ยังไม่มีใครใส่รูปโปรไฟล์</p>
      ) : (
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-club-line px-5 text-sm font-medium tracking-wide text-club-line transition-colors hover:bg-accent-soft disabled:opacity-60"
        >
          {busy
            ? `กำลังทำ ${progress?.done ?? 0}/${progress?.total ?? 0}…`
            : `สร้างรูปเล็กให้ทุกคน (${members.length} คน)`}
        </button>
      )}

      {finished ? (
        <Alert tone={progress.failed.length > 0 ? "error" : "success"}>
          สร้างใหม่ {progress.created} คน · มีอยู่แล้ว {progress.skipped} คน
          {progress.failed.length > 0
            ? ` · ไม่สำเร็จ ${progress.failed.length} คน: ${progress.failed.join(", ")}`
            : ""}
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
    </section>
  );
}
