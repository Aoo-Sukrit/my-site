import Link from "next/link";

import AboutTagline from "@/components/about/tagline";
import { getAboutProfile } from "@/lib/about";
import { getViewer } from "@/lib/auth";
import { thaiShortDate } from "@/lib/date";
import { getClubSummary, getHomeContent } from "@/lib/home";
import { youTubeThumb } from "@/lib/post-rules";
import { getPostFeed, postImageUrl } from "@/lib/posts";
import type { PostCard } from "@/lib/supabase/types";

import ClubCard from "./club-card";

function coverOf(post: PostCard): string | null {
  if (post.cover_kind === "image") return postImageUrl(post.cover_url);
  if (post.cover_kind === "youtube" && post.cover_youtube) {
    return youTubeThumb(post.cover_youtube);
  }
  return null;
}

export default async function HomePage() {
  const [viewer, content, summary, posts, profile] = await Promise.all([
    getViewer(),
    getHomeContent(),
    getClubSummary(),
    getPostFeed(null, 3),
    getAboutProfile(),
  ]);

  const isAdmin = viewer?.profile.is_admin ?? false;

  // รูปกับประโยคแนะนำตัวมาจากหน้า ABOUT ตรงๆ ไม่ได้ก๊อปมาเก็บไว้อีกที่
  // แก้ที่ /about/edit ที่เดียวแล้วเปลี่ยนทั้งสองหน้าพร้อมกัน
  // ไม่มีรูปก็ไม่ต้องขึ้นแถวนี้ ขึ้นแต่ประโยคลอยๆ แล้วดูเหมือนพิมพ์ตกหล่น
  const aboutAvatar = postImageUrl(profile?.avatar_url ?? null);

  return (
    <div className="space-y-12">
      {isAdmin ? (
        <div className="flex justify-end">
          <Link
            href="/home/edit"
            className="inline-flex min-h-10 items-center rounded-full border border-club-line px-4 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            แก้หน้านี้
          </Link>
        </div>
      ) : null}

      <section className="space-y-4">
        {content?.eyebrow ? (
          <p className="text-sm tracking-[0.2em] text-accent-strong">
            {content.eyebrow}
          </p>
        ) : null}

        {content?.title ? (
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            {content.title}
          </h1>
        ) : null}

        {/* whitespace-pre-line ทำให้ขึ้นบรรทัดใหม่ในช่องกรอกออกมาเป็นบรรทัดจริง
            โดยไม่ต้องให้ใครพิมพ์แท็ก HTML ลงไปในฐานข้อมูล */}
        {content?.subtitle ? (
          <p className="whitespace-pre-line text-muted">{content.subtitle}</p>
        ) : null}

        {/* วางเหมือนการ์ดบนหน้า ABOUT เป๊ะๆ รูปกับชื่ออยู่แถวบน
            คำแนะนำตัวลงมาเต็มความกว้างข้างล่าง */}
        {aboutAvatar ? (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <Link
                href="/about"
                aria-label="ไปหน้าเกี่ยวกับ"
                className="shrink-0 transition-opacity hover:opacity-85"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutAvatar}
                  alt={profile?.display_name ?? ""}
                  className="h-20 w-20 rounded-full border border-border object-cover"
                />
              </Link>

              {profile?.display_name ? (
                <p className="min-w-0 flex-1 font-display text-xl font-semibold tracking-tight">
                  {profile.display_name}
                </p>
              ) : null}
            </div>

            <AboutTagline tagline={profile?.tagline ?? null} />
          </div>
        ) : null}

        {content?.intro ? (
          <p className="whitespace-pre-line text-muted">{content.intro}</p>
        ) : null}

        {content?.now_line ? (
          <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="shrink-0 text-accent-strong">ช่วงนี้</span>
            <span className="whitespace-pre-line text-muted">
              {content.now_line}
            </span>
          </p>
        ) : null}
      </section>

      <section>
        <ClubCard
          href="/club"
          eyebrow="CLUB"
          blurb={content?.club_blurb ?? null}
          summary={summary}
        />
      </section>

      {posts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-medium">โพสต์ล่าสุด</h2>
            <Link
              href="/blog"
              className="text-sm text-accent-strong transition-opacity hover:opacity-80"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          <ul className="space-y-3">
            {posts.map((post) => {
              const cover = coverOf(post);
              return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-accent"
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <span className="h-16 w-16 shrink-0 rounded-xl bg-accent-soft" />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {post.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {thaiShortDate(
                          (post.published_at ?? post.created_at).slice(0, 10),
                        )}
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
        </section>
      ) : null}
    </div>
  );
}
