"use client";

import { useCallback, useEffect, useState } from "react";

import { youTubeEmbed, youTubeThumb } from "@/lib/post-rules";

export type GalleryItem = {
  id: string;
  kind: "image" | "youtube";
  /** รูป: URL สาธารณะที่ประกอบมาแล้ว · วิดีโอ: null */
  src: string | null;
  youtubeId: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};

/**
 * รูปและวิดีโอของโพสต์
 *
 * วางเรียงลงมาทีละอันเต็มความกว้าง แต่ละอันมีคำอธิบายของตัวเองใต้ภาพ
 * (mockup มีแบบวางคู่สองรูปด้วย แต่ยังไม่ทำ เพราะกฎว่าเมื่อไหร่ควรจับคู่
 * ต้องชัดกว่านี้ก่อน ไม่งั้นรูปแนวนอนกับแนวตั้งมาชนกันแล้วเบี้ยว)
 *
 * รูปกดแล้วดูเต็มจอได้ ส่วนวิดีโอโชว์ภาพปกก่อน กดแล้วค่อยโหลด iframe
 * ซึ่งสำคัญมากกับหน้าที่มีหลายคลิป ถ้าฝัง iframe ไว้ตั้งแต่แรกหน้าจะอืด
 * และ YouTube จะตั้งคุกกี้ให้คนอ่านตั้งแต่ยังไม่ได้กดเล่นเลย
 */
export default function MediaGallery({ items }: { items: GalleryItem[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const images = items.filter((item) => item.kind === "image" && item.src);

  const close = useCallback(() => setLightbox(null), []);

  const step = useCallback(
    (by: number) => {
      setLightbox((at) => {
        if (at === null) return at;
        const next = at + by;
        if (next < 0 || next >= images.length) return at;
        return next;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (lightbox === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }

    window.addEventListener("keydown", onKey);
    // กันหน้าหลังเลื่อนตามนิ้วตอนดูรูปเต็มจอ
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [lightbox, close, step]);

  if (items.length === 0) return null;

  const open = lightbox === null ? null : images[lightbox];

  return (
    <>
      <div className="space-y-5">
        {items.map((item) =>
          item.kind === "youtube" && item.youtubeId ? (
            <VideoItem key={item.id} item={item} />
          ) : item.src ? (
            <figure key={item.id} className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  setLightbox(images.findIndex((row) => row.id === item.id))
                }
                className="block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-surface"
              >
                {/* รูปแนวตั้งจัดๆ อย่างแคปหน้าจอมือถือ ถ้าปล่อยเต็มความกว้าง
                    จะสูงกว่าจอหลายเท่าจนต้องถ่อเลื่อนผ่านทีละรูป
                    จำกัดความสูงไว้ราวสามในสี่ของจอ และใช้ object-contain
                    จะได้ไม่ตัดรูป กดดูเต็มจอยังเห็นครบเหมือนเดิม */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.caption ?? ""}
                  width={item.width ?? undefined}
                  height={item.height ?? undefined}
                  loading="lazy"
                  className="mx-auto block max-h-[75vh] w-full object-contain"
                />
              </button>
              {item.caption ? (
                <figcaption className="text-sm text-muted">
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          ) : null,
        )}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.caption ?? "รูปในโพสต์"}
          onClick={close}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.src ?? ""}
            alt={open.caption ?? ""}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />

          {open.caption ? (
            <p className="max-w-xl text-center text-sm text-white/80">
              {open.caption}
            </p>
          ) : null}

          {images.length > 1 ? (
            <p className="text-xs text-white/60">
              {(lightbox ?? 0) + 1} / {images.length}
            </p>
          ) : null}

          <button
            type="button"
            onClick={close}
            aria-label="ปิด"
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white"
          >
            ×
          </button>

          {images.length > 1 ? (
            <>
              <Arrow side="left" onClick={() => step(-1)} />
              <Arrow side="right" onClick={() => step(1)} />
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Arrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "รูปก่อนหน้า" : "รูปถัดไป"}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

/** ภาพปกก่อน กดแล้วค่อยโหลด iframe ของ youtube-nocookie */
function VideoItem({ item }: { item: GalleryItem }) {
  const [playing, setPlaying] = useState(false);
  const id = item.youtubeId as string;

  return (
    <figure className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-club-ink">
        {playing ? (
          <iframe
            src={youTubeEmbed(id)}
            title={item.caption ?? "วิดีโอ"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`เล่นวิดีโอ ${item.caption ?? ""}`.trim()}
            className="group absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youTubeThumb(id)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-2xl text-white transition group-hover:bg-black/70">
                ▶
              </span>
            </span>
          </button>
        )}
      </div>
      {item.caption ? (
        <figcaption className="text-sm text-muted">{item.caption}</figcaption>
      ) : null}
    </figure>
  );
}
