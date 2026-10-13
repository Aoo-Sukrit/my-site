import type { PostCard } from "./supabase/types";

/**
 * กติกาซีรีส์ของโพสต์ (20261013090000_post_series.sql)
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน เรียกได้ทั้งจาก Server Component และไฟล์ "use client"
 * ตัวเลขข้างล่างต้องตรงกับ check ในฐานข้อมูล
 */

export const SERIES_TITLE_MAX = 120;
export const SERIES_DESCRIPTION_MAX = 1000;
export const SERIES_UNIT_MAX = 20;
export const SERIES_SLUG_MAX = 60;
export const SERIES_ORDER_MAX = 999;
export const SERIES_DEFAULT_UNIT = "Week";

/** "Week 3" */
export function episodeLabel(unit: string | null, order: number | null): string {
  return `${unit || SERIES_DEFAULT_UNIT} ${order ?? "?"}`;
}

/**
 * slug ที่ฐานข้อมูลจะสร้างให้ถ้าไม่ได้ตั้งเอง ใช้โชว์เป็นตัวอย่างใต้ช่อง
 * ชื่อภาษาไทยล้วนจะได้ค่าว่าง ฐานข้อมูลจะตั้ง series-xxxxxx ให้แทน
 */
export function seriesSlugFrom(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SERIES_SLUG_MAX)
    .replace(/-+$/g, "");
}

export function isSeriesSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= SERIES_SLUG_MAX &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
  );
}

/** หนึ่งการ์ดบนหน้า /blog ที่ยุบทุกตอนของซีรีส์เดียวกันไว้ด้วยกัน */
export type SeriesGroup = {
  slug: string;
  title: string;
  unit: string;
  /** ตอนที่อยู่ในฟีด ใหม่สุดก่อนตามฟีด */
  episodes: PostCard[];
  /** ตอนล่าสุด (ตัวแรกในฟีด) ใช้วันที่และหมวดของตัวนี้ */
  latest: PostCard;
  /** รูปปก: ที่ตั้งให้ซีรีส์ ไม่งั้นรูปแรกของตอนที่เลขน้อยสุดที่มีรูป */
  cover: Pick<PostCard, "cover_kind" | "cover_url" | "cover_youtube"> | null;
};

export type FeedItem =
  | { kind: "post"; post: PostCard }
  | { kind: "series"; series: SeriesGroup };

/**
 * ยุบโพสต์ในฟีดที่อยู่ซีรีส์เดียวกันเป็นการ์ดใบเดียว
 *
 * การ์ดซีรีส์ไปอยู่ตรงตำแหน่งของตอนที่ใหม่สุด เพราะฟีดเรียงใหม่สุดก่อนอยู่แล้ว
 * ตัวแรกของซีรีส์ที่เจอจึงเป็นตอนล่าสุดเสมอ
 */
export function groupFeed(posts: PostCard[]): FeedItem[] {
  const items: FeedItem[] = [];
  const groups = new Map<string, SeriesGroup>();

  for (const post of posts) {
    if (!post.series_slug) {
      items.push({ kind: "post", post });
      continue;
    }

    const found = groups.get(post.series_slug);
    if (found) {
      found.episodes.push(post);
      continue;
    }

    const group: SeriesGroup = {
      slug: post.series_slug,
      title: post.series_title ?? post.title,
      unit: post.series_unit ?? SERIES_DEFAULT_UNIT,
      episodes: [post],
      latest: post,
      cover: null,
    };
    groups.set(post.series_slug, group);
    items.push({ kind: "series", series: group });
  }

  for (const group of groups.values()) {
    const own = group.latest.series_cover;
    if (own) {
      group.cover = { cover_kind: "image", cover_url: own, cover_youtube: null };
      continue;
    }
    const first = [...group.episodes]
      .sort((a, b) => (a.series_order ?? 0) - (b.series_order ?? 0))
      .find((post) => post.cover_kind !== null);
    group.cover = first
      ? {
          cover_kind: first.cover_kind,
          cover_url: first.cover_url,
          cover_youtube: first.cover_youtube,
        }
      : null;
  }

  return items;
}
