import type { Metadata } from "next";
import Link from "next/link";

import { getViewer } from "@/lib/auth";
import { aboutIsEmpty, contactLinks } from "@/lib/about-rules";
import { getAboutProfile } from "@/lib/about";
import { excerpt, youTubeThumb } from "@/lib/post-rules";
import { getPostFeed, getPostSections, postImageUrl } from "@/lib/posts";
import type { AboutProfile, PostCard, PostSection } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "ABOUT",
};

/** รูปปกของการ์ด = รูปแรกของโพสต์ คลิปก็ใช้ภาพปกของคลิป */
function coverOf(post: PostCard): string | null {
  if (post.cover_kind === "image") return postImageUrl(post.cover_url);
  if (post.cover_kind === "youtube" && post.cover_youtube) {
    return youTubeThumb(post.cover_youtube);
  }
  return null;
}

function ProfileCard({ profile }: { profile: AboutProfile }) {
  const avatar = postImageUrl(profile.avatar_url);
  const links = contactLinks(profile);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={profile.display_name ?? ""}
            className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
          />
        ) : null}

        <div className="min-w-0 flex-1 space-y-1">
          {profile.display_name ? (
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {profile.display_name}
            </h1>
          ) : null}
          {profile.tagline ? (
            <p className="text-sm leading-relaxed text-muted">
              {profile.tagline}
            </p>
          ) : null}
        </div>
      </div>

      {profile.chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {profile.chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex min-h-8 items-center rounded-full border border-border px-3 text-xs text-muted"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {links.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm tracking-wide transition-colors ${
                link.primary
                  ? "bg-club-line font-medium text-background hover:opacity-90"
                  : "border border-border text-muted hover:border-accent hover:text-foreground"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}

      {profile.story ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {profile.story}
        </p>
      ) : null}
    </section>
  );
}

function BigWorkCard({ post }: { post: PostCard }) {
  const cover = coverOf(post);

  return (
    <Link
      href={`/blog/${post.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="aspect-[16/10] w-full object-cover"
        />
      ) : null}
      <div className="space-y-1 p-4">
        <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-strong">
          {post.section_title}
        </span>
        <h3 className="font-display text-lg font-medium">{post.title}</h3>
        {post.body.trim() ? (
          <p className="line-clamp-2 text-sm text-muted">
            {excerpt(post.body, 120)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function SmallWorkCard({ post }: { post: PostCard }) {
  const cover = coverOf(post);

  return (
    <Link
      href={`/blog/${post.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <span className="block aspect-[4/3] w-full bg-accent-soft" />
      )}
      <div className="space-y-0.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{post.title}</h3>
      </div>
    </Link>
  );
}

function HobbyTile({ section }: { section: PostSection }) {
  const cover = postImageUrl(section.cover_url ?? section.fallback_cover);

  return (
    <Link
      href={`/about/${section.slug}`}
      className="block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <span className="block aspect-square w-full bg-accent-soft" />
      )}
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-sm font-medium">{section.title}</p>
        <p className="text-xs text-muted">
          {section.post_count > 0 ? `${section.post_count} โพสต์` : "ยังว่าง"}
        </p>
      </div>
    </Link>
  );
}

export default async function AboutPage() {
  const viewer = await getViewer();
  const isAdmin = viewer?.profile.is_admin ?? false;

  const [profile, sections, workPosts] = await Promise.all([
    getAboutProfile(),
    getPostSections(),
    getPostFeed("work", 20),
  ]);

  // ปักหมุดขึ้นก่อน ถ้าไม่มีใบไหนปักไว้ก็ใช้ใบล่าสุด (ฐานข้อมูลเรียงใหม่สุดมาก่อน)
  const ordered = [...workPosts].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  );
  const [feature, ...rest] = ordered;

  const hobbies = sections.filter((row) => row.kind === "hobby");
  const empty = aboutIsEmpty(profile);

  return (
    <div className="space-y-10">
      {isAdmin ? (
        <div className="flex justify-end">
          <Link
            href="/about/edit"
            className="inline-flex min-h-10 items-center rounded-full border border-club-line px-4 text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            แก้หน้านี้
          </Link>
        </div>
      ) : null}

      {profile && !empty ? (
        <ProfileCard profile={profile} />
      ) : isAdmin ? (
        <Link
          href="/about/edit"
          className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 text-center text-sm text-club-line"
        >
          ยังไม่ได้กรอกข้อมูลแนะนำตัว แตะเพื่อเริ่ม
        </Link>
      ) : (
        <section className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            เกี่ยวกับ
          </h1>
        </section>
      )}

      {profile && profile.stats.length > 0 ? (
        <section className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {profile.stats.slice(0, 3).map((stat) => (
            <div key={stat.label} className="space-y-0.5 px-3 py-4 text-center">
              <p className="font-display text-lg font-semibold">{stat.value}</p>
              <p className="text-xs leading-snug text-muted">{stat.label}</p>
            </div>
          ))}
        </section>
      ) : null}

      {feature ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-medium">งานที่ภูมิใจ</h2>
            <Link
              href="/blog?section=work"
              className="text-sm text-accent-strong transition-opacity hover:opacity-80"
            >
              ดูทั้งหมด {workPosts.length} →
            </Link>
          </div>

          <BigWorkCard post={feature} />

          {rest.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3">
              {rest.slice(0, 4).map((post) => (
                <li key={post.id}>
                  <SmallWorkCard post={post} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : isAdmin ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium">งานที่ภูมิใจ</h2>
          <Link
            href="/blog/new"
            className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
          >
            + เขียนโพสต์แรกในหมวดงาน
          </Link>
        </section>
      ) : null}

      {hobbies.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium">งานอดิเรก</h2>
          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {hobbies.map((section) => (
              <li key={section.slug}>
                <HobbyTile section={section} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isAdmin ? (
        <Link
          href="/about/edit"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-dashed border-club-line text-sm tracking-wide text-club-line transition-colors hover:bg-accent-soft"
        >
          + จัดการหมวดงานอดิเรก · เห็นแค่คุณ
        </Link>
      ) : null}
    </div>
  );
}
