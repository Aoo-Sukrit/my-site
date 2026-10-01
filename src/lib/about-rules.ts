import type { AboutProfile } from "./supabase/types";

/**
 * กติกาของหน้า ABOUT ฝั่งที่ไม่ต้องคุยกับฐานข้อมูล
 * ฟังก์ชันล้วน เรียกได้ทั้งจาก Server Component และไฟล์ "use client"
 */

export const ABOUT_NAME_MAX = 60;
export const ABOUT_TAGLINE_MAX = 200;
export const ABOUT_STORY_MAX = 4000;
export const ABOUT_STATS_MAX = 3;
export const ABOUT_CHIPS_MAX = 8;

export type ContactLink = {
  key: string;
  label: string;
  href: string;
  /** ช่องทางหลักที่อยากให้กดก่อน จะได้เน้นสีต่างจากที่เหลือ */
  primary: boolean;
};

/**
 * ช่องทางติดต่อที่กรอกไว้จริง
 *
 * ช่องไหนว่างไม่ต้องโชว์ และอีเมลต้องเติม mailto: ให้เอง
 * ส่วนช่องอื่นยอมให้กรอกเป็นลิงก์เต็มหรือไม่เต็มก็ได้ เติม https:// ให้
 * เพราะคนก๊อปมาจากแอปมักได้มาไม่เหมือนกัน
 */
export function contactLinks(profile: AboutProfile): ContactLink[] {
  const out: ContactLink[] = [];

  const add = (
    key: string,
    label: string,
    value: string | null,
    primary = false,
  ) => {
    const text = (value ?? "").trim();
    if (!text) return;
    const href = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    out.push({ key, label, href, primary });
  };

  add("line", "ทัก LINE", profile.line_url, true);
  add("instagram", "Instagram", profile.instagram_url);
  add("facebook", "Facebook", profile.facebook_url);
  add("strava", "Strava", profile.strava_url);

  const email = (profile.email ?? "").trim();
  if (email) {
    out.push({
      key: "email",
      label: "อีเมล",
      href: email.startsWith("mailto:") ? email : `mailto:${email}`,
      primary: false,
    });
  }

  return out;
}

/** ข้อมูลแนะนำตัวยังว่างเปล่าอยู่ไหม ใช้ตัดสินว่าจะโชว์หน้าเปล่าหรือของจริง */
export function aboutIsEmpty(profile: AboutProfile | null): boolean {
  if (!profile) return true;
  return (
    !profile.display_name &&
    !profile.tagline &&
    !profile.story &&
    !profile.avatar_url &&
    profile.chips.length === 0 &&
    profile.stats.length === 0 &&
    contactLinks(profile).length === 0
  );
}

/**
 * ความสูงของแท่งในกราฟรายเดือน คิดเป็นเปอร์เซ็นต์ของเดือนที่สูงสุด
 * เดือนที่ไม่ได้วิ่งเลยยังให้เหลือขีดบางๆ ไว้ จะได้รู้ว่าเดือนนั้นมีอยู่จริง
 */
export function barHeight(km: number, max: number): number {
  if (max <= 0) return 4;
  return Math.max(4, Math.round((km / max) * 100));
}

/** "2026-10" -> "ต.ค." */
export function shortMonth(monthKey: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    month: "short",
  }).format(new Date(`${monthKey}-01T00:00:00+07:00`));
}

/**
 * ชื่อย่อที่ใช้ตั้งหมวดใหม่
 * ฐานข้อมูลบังคับ ^[a-z0-9-]{2,40}$ อยู่แล้ว ตรงนี้ช่วยทำให้ผ่านตั้งแต่แรก
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
