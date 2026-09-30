import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * ไฟล์ประกอบสำหรับวาดรูปสตอรี่
 *
 * ImageResponse วาดด้วย satori ซึ่งไม่มีฟอนต์ไทยติดมาเลย ถ้าไม่ส่งไฟล์ฟอนต์
 * เข้าไปเอง ตัวหนังสือไทยจะออกมาเป็นสี่เหลี่ยมเปล่าทั้งหมด
 *
 * รองรับแค่ ttf, otf, woff เท่านั้น (woff2 ใช้ไม่ได้) ไฟล์ในโฟลเดอร์ fonts
 * เป็น woff ที่โหลดมาจาก Google Fonts พร้อมชุดตัวอักษรไทยครบ
 *
 * อ่านตอน request ด้วย fs ไม่ได้ import เข้า bundle เพราะ bundle ของ
 * ImageResponse มีเพดานขนาด และ next.config.ts มี outputFileTracingIncludes
 * กำกับไว้ให้ไฟล์พวกนี้ติดไปตอน deploy ด้วย
 */

const FONT_DIR = path.join(process.cwd(), "src", "app", "club", "share", "fonts");
const LOGO_PATH = path.join(process.cwd(), "public", "club-logo.jpg");

export type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600;
  style: "normal";
};

async function readFont(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(path.join(FONT_DIR, file));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export async function loadFonts(): Promise<LoadedFont[]> {
  const [anuphan400, anuphan600, plex600] = await Promise.all([
    readFont("anuphan-400.woff"),
    readFont("anuphan-600.woff"),
    readFont("plex-thai-looped-600.woff"),
  ]);

  return [
    { name: "Anuphan", data: anuphan400, weight: 400, style: "normal" },
    { name: "Anuphan", data: anuphan600, weight: 600, style: "normal" },
    { name: "PlexThai", data: plex600, weight: 600, style: "normal" },
  ];
}

export async function loadLogoDataUri(): Promise<string> {
  const buffer = await readFile(LOGO_PATH);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

/** ที่อยู่ไฟล์ในบัคเก็ต avatars ที่แกะออกมาจาก URL สาธารณะที่เก็บไว้ในตาราง */
const AVATAR_PUBLIC_MARKER = "/storage/v1/object/public/avatars/";

export function avatarObjectPath(url: string | null): string | null {
  if (!url) return null;

  const at = url.indexOf(AVATAR_PUBLIC_MARKER);
  if (at < 0) return null;

  // ตัด ?v=... ที่ใช้ไล่แคชออก เหลือแต่ที่อยู่ไฟล์จริง
  const path = url.slice(at + AVATAR_PUBLIC_MARKER.length).split("?")[0];
  return path || null;
}

/**
 * ดึงรูปมาฝังเป็น data URI
 *
 * ดึงมาฝังเองแทนที่จะปล่อยให้ satori ไปโหลด เพราะแบบนี้คุมเวลาและ error ได้
 * รูปไหนโหลดไม่ขึ้นก็ตกไปใช้ตัวอักษรแรกแทน ไม่ใช่ทั้งรูปพัง
 */
export async function fetchImageDataUri(
  url: string | null,
): Promise<string | null> {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 2_000_000) return null;

    const type = response.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;

    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}
