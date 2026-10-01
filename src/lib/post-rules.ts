/**
 * กติกาของระบบโพสต์ ฝั่งที่ไม่ต้องคุยกับฐานข้อมูล
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งจาก
 * Server Component และไฟล์ "use client"
 * ตัวบังคับจริงอยู่ใน supabase/migrations/20261001140000_posts.sql
 */

export const POST_TITLE_MAX = 160;
export const POST_BODY_MAX = 20_000;
export const POST_CAPTION_MAX = 300;

/** ย่อรูปก่อนอัปทุกครั้ง ด้านยาวสุดเท่านี้ */
export const POST_IMAGE_MAX_EDGE = 1600;
export const POST_IMAGE_QUALITY = 0.82;

/** เพดานที่เก็บของแพลนฟรี ใช้โชว์ว่าเหลือเท่าไหร่ในหน้าเขียนโพสต์ */
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

export const POST_BUCKET = "post-media";

export const POST_VISIBILITIES = [
  "public",
  "club",
  "unlisted",
  "private",
] as const;

export type PostVisibility = (typeof POST_VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<PostVisibility, string> = {
  public: "ทุกคน",
  club: "เพื่อนในคลับ",
  unlisted: "ลิงก์ลับ",
  private: "แค่ฉัน",
};

/** คำอธิบายใต้ปุ่มเลือก ให้รู้ว่าแต่ละอันแปลว่าอะไรจริงๆ */
export const VISIBILITY_HINT: Record<PostVisibility, string> = {
  public: "ใครเปิดเว็บก็เห็น ไม่ต้องล็อกอิน",
  club: "เฉพาะสมาชิกคลับที่อนุมัติแล้ว",
  unlisted: "ไม่โผล่ในหน้ารวม เห็นได้เฉพาะคนที่มีลิงก์",
  private: "เห็นคนเดียว ไว้เก็บของที่ยังไม่อยากให้ใครดู",
};

export function isPostVisibility(value: unknown): value is PostVisibility {
  return (
    typeof value === "string" &&
    (POST_VISIBILITIES as readonly string[]).includes(value)
  );
}

export type PostStatus = "draft" | "published";

export function isPostStatus(value: unknown): value is PostStatus {
  return value === "draft" || value === "published";
}

/** ป้ายที่ขึ้นบนการ์ด เฉพาะกรณีที่ไม่ใช่โพสต์สาธารณะที่เผยแพร่แล้ว */
export function postBadge(
  visibility: string,
  status: string,
): string | null {
  if (status === "draft") return "ร่าง";
  if (visibility === "public") return null;
  return isPostVisibility(visibility) ? VISIBILITY_LABEL[visibility] : null;
}

// ---------------------------------------------------------------------------
//  YouTube
// ---------------------------------------------------------------------------

/**
 * ดึงรหัสคลิปจากลิงก์ YouTube
 *
 * รองรับสามแบบที่คนก๊อปมาจริง
 *   https://www.youtube.com/watch?v=XXXXXXXXXXX
 *   https://youtu.be/XXXXXXXXXXX
 *   https://www.youtube.com/shorts/XXXXXXXXXXX
 * และยอมให้วางรหัสเปล่าๆ มาตรงๆ ด้วย
 */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  const bare = /^[A-Za-z0-9_-]{6,20}$/;
  if (bare.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return bare.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && bare.test(fromQuery)) return fromQuery;

    const parts = url.pathname.split("/").filter(Boolean);
    // /shorts/<id> · /embed/<id> · /live/<id>
    if (parts.length >= 2 && ["shorts", "embed", "live", "v"].includes(parts[0])) {
      return bare.test(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

/** ภาพปกของคลิป ใช้ i.ytimg.com ซึ่งไม่ตั้งคุกกี้ */
export function youTubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** ลิงก์ฝังแบบไม่ตั้งคุกกี้ โหลดเฉพาะตอนคนกดเล่นจริงเท่านั้น */
export function youTubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export function youTubeWatch(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

// ---------------------------------------------------------------------------
//  เนื้อความ
// ---------------------------------------------------------------------------

export type BodySegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

/**
 * แยกเนื้อความเป็นชิ้นๆ เพื่อให้ลิงก์กดได้
 *
 * ตั้งใจไม่ใช้ markdown และไม่แปลงเป็น HTML เลย เพราะข้อความมาจากช่องกรอก
 * ถ้าเผลอ render เป็น HTML ดิบเมื่อไหร่ก็เปิดทางให้ฝัง script ทันที
 * วิธีนี้ปลอดภัยโดยโครงสร้าง เพราะทุกชิ้นถูกวาดเป็น text node ของ React
 *
 * การขึ้นบรรทัดใหม่ปล่อยให้ CSS whitespace-pre-wrap จัดการ ไม่ต้องแตะที่นี่
 */
export function bodySegments(body: string): BodySegment[] {
  const pattern = /(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/gi;
  const out: BodySegment[] = [];
  let at = 0;

  for (const match of body.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > at) {
      out.push({ type: "text", value: body.slice(at, start) });
    }

    let value = match[0];
    // เครื่องหมายวรรคตอนท้ายลิงก์มักเป็นของประโยค ไม่ใช่ของลิงก์
    let trailing = "";
    while (/[.,!?;:)]$/.test(value)) {
      trailing = value.slice(-1) + trailing;
      value = value.slice(0, -1);
    }

    out.push({
      type: "link",
      value,
      href: value.startsWith("http") ? value : `https://${value}`,
    });

    if (trailing) out.push({ type: "text", value: trailing });
    at = start + match[0].length;
  }

  if (at < body.length) out.push({ type: "text", value: body.slice(at) });
  return out;
}

/** ตัดข้อความให้สั้นลงสำหรับการ์ดในฟีดและ Open Graph */
export function excerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
//  ที่เก็บไฟล์
// ---------------------------------------------------------------------------

/** "12.3 MB" อ่านง่ายกว่าเลขไบต์ดิบ */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function storagePercent(used: number): number {
  return Math.min(100, Math.max(0, (used / STORAGE_LIMIT_BYTES) * 100));
}
