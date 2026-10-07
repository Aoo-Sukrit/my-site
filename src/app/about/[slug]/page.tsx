import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { barHeight, shortMonth } from "@/lib/about-rules";
import { getRunningStats, getSectionGallery } from "@/lib/about";
import { formatKm, thaiShortDate } from "@/lib/date";
import { excerpt, postBadge } from "@/lib/post-rules";
import { getPostFeed, getPostSections, postImageUrl } from "@/lib/posts";
import type { RunningStats } from "@/lib/supabase/types";

export async function generateMetadata(
  props: PageProps<"/about/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const sections = await getPostSections();
  const section = sections.find((row) => row.slug === slug);

  return { title: section ? section.title : "ไม่เจอหมวดนี้" };
}

/**
 * กราฟแท่งระยะวิ่งรายเดือน
 *
 * ตั้งใจทำด้วย div ธรรมดาแทนการลงไลบรารีกราฟ เพราะมีแค่แปดแท่งกับตัวเลขเดียว
 * ไลบรารีกราฟจะใหญ่กว่าตัวหน้าเว็บทั้งหน้าเสียอีก และส่วนใหญ่ต้องรันฝั่งเบราว์เซอร์
 */
function RunningPanel({ stats }: { stats: RunningStats }) {
  const months = stats.months ?? [];
  const max = months.reduce((top, row) => Math.max(top, Number(row.km)), 0);

  return (
    <section className="space-y-4">
      <p className="flex items-center gap-2 text-xs text-muted">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-accent-strong"
        />
        อัปเดตเองจาก CLUB
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5 rounded-2xl border border-border bg-surface p-4">
          <p className="font-display text-xl font-semibold text-accent-strong">
            {formatKm(stats.year_km)} กม.
          </p>
          <p className="text-xs text-muted">ปีนี้</p>
        </div>
        <div className="space-y-0.5 rounded-2xl border border-border bg-surface p-4">
          <p className="font-display text-xl font-semibold text-accent-strong">
            {formatKm(stats.month_km)} กม.
          </p>
          <p className="text-xs text-muted">
            เดือนนี้
            {stats.month_rank ? ` · อันดับ ${stats.month_rank}` : ""}
          </p>
        </div>
      </div>

      {months.length > 0 ? (
        <div className="flex h-28 gap-1.5">
          {months.map((row) => (
            <div
              key={row.month}
              className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
              title={`${shortMonth(row.month)} ${formatKm(row.km)} กม.`}
            >
              {/* ช่องแท่งต้องมีความสูงจริง (flex-1 ของคอลัมน์ที่สูงเต็ม h-28)
                  ความสูงแบบ % ของแท่งถึงจะมีอะไรให้อ้างอิง ของเดิมคอลัมน์สูงตาม
                  เนื้อหา แท่งจึงสูง 0 แล้วหายไปทั้งกราฟ เหลือแต่ชื่อเดือน */}
              <span className="flex w-full flex-1 items-end">
                <span
                  className="w-full rounded-t-md bg-accent-soft"
                  style={{ height: `${barHeight(Number(row.km), max)}%` }}
                />
              </span>
              {/* 11px คือขั้นต่ำที่ยังอ่านชื่อเดือนย่อภาษาไทยออกบนมือถือ */}
              <span className="truncate text-[11px] text-muted">
                {shortMonth(row.month)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default async function SectionPage(props: PageProps<"/about/[slug]">) {
  const { slug } = await props.params;

  const [sections, viewer] = await Promise.all([getPostSections(), getViewer()]);
  const section = sections.find((row) => row.slug === slug);

  // หมวดที่ซ่อนไว้ post_sections_list() ไม่คืนให้คนทั่วไปอยู่แล้ว
  // จึงตกมาที่ 404 เหมือนหมวดที่ไม่มีจริง โดยไม่ต้องเช็กซ้ำตรงนี้
  if (!section) notFound();

  const isAdmin = viewer?.profile.is_admin ?? false;
  const cover = postImageUrl(section.cover_url ?? section.fallback_cover);

  const [posts, gallery, running] = await Promise.all([
    getPostFeed(slug, 40),
    getSectionGallery(slug),
    slug === "running" ? getRunningStats() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/about"
        className="inline-flex min-h-11 items-center pr-3 text-sm text-muted transition-colors hover:text-foreground"
      >
        ← {section.kind === "work" ? "งานที่ภูมิใจ" : "งานอดิเรก"}
      </Link>

      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      <section className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {section.title}
        </h1>
        {section.intro ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {section.intro}
          </p>
        ) : isAdmin ? (
          <Link
            href="/about/edit"
            className="inline-flex text-sm text-club-line underline underline-offset-2"
          >
            ยังไม่ได้เขียนแนะนำหมวดนี้ แตะเพื่อเพิ่ม
          </Link>
        ) : null}
      </section>

      {running ? <RunningPanel stats={running} /> : null}

      {gallery.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium">แกลเลอรี</h2>
          <ul className="grid grid-cols-3 gap-2">
            {gallery.map((image, index) => (
              <li key={`${image.post_id}-${index}`}>
                <Link
                  href={`/blog/${image.post_id}`}
                  title={image.caption ?? image.post_title}
                  className="block overflow-hidden rounded-xl border border-border transition-opacity hover:opacity-80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={postImageUrl(image.url) ?? ""}
                    alt={image.caption ?? ""}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-medium">
          โพสต์ในหมวดนี้{" "}
          <span className="text-sm font-normal text-muted">
            ({posts.length})
          </span>
        </h2>

        {posts.length === 0 ? (
          <p className="text-sm text-muted">
            {isAdmin ? "ยังไม่มีโพสต์ในหมวดนี้" : "ยังไม่มีอะไรที่นี่"}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {posts.map((post) => {
              const badge = postBadge(post.visibility, post.status);
              return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {post.title}
                        {badge ? (
                          <span className="ml-2 rounded-full bg-border px-2 py-0.5 text-[11px] font-normal text-muted">
                            {badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {thaiShortDate(
                          (post.published_at ?? post.created_at).slice(0, 10),
                        )}
                        {post.body.trim()
                          ? ` · ${excerpt(post.body, 60)}`
                          : ""}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-muted">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
