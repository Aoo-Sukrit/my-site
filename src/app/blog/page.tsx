import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import LinkPending from "@/components/link-pending";
import { getViewer } from "@/lib/auth";
import { thaiShortDate } from "@/lib/date";
import { excerpt, postBadge, youTubeThumb } from "@/lib/post-rules";
import {
  getBlogContent,
  getPostFeed,
  getPostSections,
  postImageUrl,
} from "@/lib/posts";
import type { PostCard } from "@/lib/supabase/types";

import BlogHeader from "./blog-header";

export const metadata: Metadata = {
  title: "BLOG",
};

/** ชิปกรองหมวด เดือนเดียวกับแท็บในหน้า CLUB จะได้คุ้นมือ */
function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm tracking-wide transition active:scale-95 ${
        active
          ? "bg-club-line font-medium text-background"
          : "border border-border text-muted hover:border-accent hover:text-foreground has-[[data-pending]]:animate-pulse has-[[data-pending]]:border-accent has-[[data-pending]]:bg-accent-soft"
      }`}
    >
      {children}
      <LinkPending />
    </Link>
  );
}

function Card({ post }: { post: PostCard }) {
  const badge = postBadge(post.visibility, post.status);
  const date = thaiShortDate(
    (post.published_at ?? post.created_at).slice(0, 10),
  );

  const cover =
    post.cover_kind === "image"
      ? postImageUrl(post.cover_url)
      : post.cover_kind === "youtube" && post.cover_youtube
        ? youTubeThumb(post.cover_youtube)
        : null;

  return (
    <li>
      <Link
        href={`/blog/${post.id}`}
        className="flex gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-accent active:scale-[0.99]"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover sm:h-24 sm:w-24"
          />
        ) : null}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{date}</span>
            <span aria-hidden>·</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent-strong">
              {post.section_title}
            </span>
            {badge ? (
              <span className="rounded-full bg-border px-2.5 py-0.5">
                {badge}
              </span>
            ) : null}
          </div>

          <h2 className="font-display text-lg font-medium">{post.title}</h2>

          {post.body.trim() ? (
            <p className="line-clamp-2 text-sm text-muted">
              {excerpt(post.body, 140)}
            </p>
          ) : null}

          {post.media_count > 0 ? (
            <p className="text-xs text-muted">
              {post.media_count} รูป/วิดีโอ
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export default async function BlogPage(props: PageProps<"/blog">) {
  const params = await props.searchParams;
  const viewer = await getViewer();
  const isAdmin = viewer?.profile.is_admin ?? false;

  const asked = typeof params.section === "string" ? params.section : null;

  const [content, sections, posts] = await Promise.all([
    getBlogContent(),
    getPostSections(),
    getPostFeed(asked),
  ]);

  // ใส่ section มั่วๆ มาก็ให้เป็นทั้งหมดเงียบๆ ไม่ต้องขึ้น error
  const selected = sections.some((row) => row.slug === asked) ? asked : null;

  return (
    <div className="space-y-8">
      {typeof params.err === "string" ? (
        <Alert tone="error">{params.err}</Alert>
      ) : null}
      {typeof params.msg === "string" ? (
        <Alert tone="success">{params.msg}</Alert>
      ) : null}

      <BlogHeader content={content} isAdmin={isAdmin} />

      {sections.length > 1 ? (
        // overflow-x-auto ให้ชิปเลื่อนแนวนอนบนมือถือ ไม่ตกบรรทัดจนรก
        <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip href="/blog" active={selected === null}>
            ทั้งหมด
          </Chip>
          {sections
            .filter((row) => row.post_count > 0 || isAdmin)
            .map((row) => (
              <Chip
                key={row.slug}
                href={`/blog?section=${row.slug}`}
                active={selected === row.slug}
              >
                {row.title}
              </Chip>
            ))}
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
          <p className="font-display text-base font-medium">ยังไม่มีโพสต์</p>
          <p className="mt-1 text-sm text-muted">
            {isAdmin ? "กด + เขียนโพสต์ เพื่อเริ่มใบแรก" : "ไว้แวะมาใหม่นะ"}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}
