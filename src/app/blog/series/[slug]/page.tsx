import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { thaiShortDate } from "@/lib/date";
import { excerpt, postBadge, youTubeThumb } from "@/lib/post-rules";
import { getSeries, getSeriesEpisodes, postImageUrl } from "@/lib/posts";
import { episodeLabel } from "@/lib/series-rules";
import type { SeriesEpisode } from "@/lib/supabase/types";

export async function generateMetadata(
  props: PageProps<"/blog/series/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const series = await getSeries(slug);
  if (!series) return { title: "ไม่เจอซีรีส์" };

  return {
    title: series.title,
    description: excerpt(series.description, 160) || undefined,
  };
}

function Episode({ episode, unit }: { episode: SeriesEpisode; unit: string }) {
  const badge = postBadge(episode.visibility, episode.status);
  const date = thaiShortDate(
    (episode.published_at ?? episode.created_at).slice(0, 10),
  );

  const thumb =
    episode.cover_kind === "image"
      ? postImageUrl(episode.cover_url)
      : episode.cover_kind === "youtube" && episode.cover_youtube
        ? youTubeThumb(episode.cover_youtube)
        : null;

  return (
    <li>
      <Link
        href={`/blog/${episode.id}`}
        className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:border-accent active:scale-[0.99] sm:p-4"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover sm:h-20 sm:w-20"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-lg font-semibold text-accent-strong sm:h-20 sm:w-20"
          >
            {episode.series_order}
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium tracking-wide text-accent-strong">
              {episodeLabel(unit, episode.series_order)}
            </span>
            <span aria-hidden>·</span>
            <span>{date}</span>
            {badge ? (
              <span className="rounded-full bg-border px-2.5 py-0.5">
                {badge}
              </span>
            ) : null}
          </p>
          <h2 className="font-display text-base font-medium leading-snug">
            {episode.title}
          </h2>
          {episode.body.trim() ? (
            <p className="line-clamp-1 text-sm text-muted">
              {excerpt(episode.body, 100)}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/**
 * หน้าซีรีส์ หัวซีรีส์กับทุกตอนเรียงตามเลขตอน
 *
 * แต่ละตอนโผล่เฉพาะที่คนดูมีสิทธิ์เห็น ฐานข้อมูลกรองให้แล้ว
 * ถ้าไม่เหลือตอนไหนให้เห็นเลย ฐานข้อมูลคืนซีรีส์ว่าง หน้านี้จึงเป็น 404
 * เหมือนโพสต์ที่ไม่มีสิทธิ์ดู
 */
export default async function SeriesPage(
  props: PageProps<"/blog/series/[slug]">,
) {
  const { slug } = await props.params;

  const [series, episodes, viewer] = await Promise.all([
    getSeries(slug),
    getSeriesEpisodes(slug),
    getViewer(),
  ]);

  if (!series) notFound();

  const isAdmin = viewer?.profile.is_admin ?? false;
  const cover = postImageUrl(series.cover_url);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/blog"
        className="inline-flex min-h-11 items-center pr-3 text-sm text-muted transition-colors hover:text-foreground"
      >
        ← BLOG
      </Link>

      <header className="space-y-3">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
          />
        ) : null}

        <p className="text-sm tracking-[0.2em] text-accent-strong">SERIES</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {series.title}
        </h1>
        {series.description.trim() ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted sm:text-base">
            {series.description}
          </p>
        ) : null}
        <p className="text-xs text-muted">{episodes.length} ตอน</p>
      </header>

      {episodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
          <p className="font-display text-base font-medium">ยังไม่มีตอนไหน</p>
          <p className="mt-1 text-sm text-muted">
            เขียนโพสต์แล้วเลือกซีรีส์นี้ ตอนจะมาขึ้นตรงนี้
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {episodes.map((episode) => (
            <Episode key={episode.id} episode={episode} unit={series.unit_label} />
          ))}
        </ol>
      )}

      {isAdmin ? (
        <Link
          href={`/blog/new?series=${series.id}`}
          className="flex min-h-11 items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
        >
          + เขียนตอนถัดไป
        </Link>
      ) : null}
    </div>
  );
}
