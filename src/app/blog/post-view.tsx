import Link from "next/link";

import ConfirmSubmit from "@/components/club/confirm-submit";
import CopyLink from "@/components/post/copy-link";
import MediaGallery, {
  type GalleryItem,
} from "@/components/post/media-gallery";
import PostBody from "@/components/post/post-body";
import { thaiShortDate } from "@/lib/date";
import { VISIBILITY_LABEL, isPostVisibility } from "@/lib/post-rules";
import { postImageUrl } from "@/lib/posts";
import type { PostDetail } from "@/lib/supabase/types";

import { togglePinnedAction } from "../about/actions";

import { deletePostAction } from "./actions";

/**
 * หน้าโพสต์หนึ่งใบ ใช้ทั้ง /blog/[id] และ /p/[share_token]
 *
 * สองทางนั้นต่างกันแค่วิธีหาโพสต์ หน้าตาเหมือนกันทุกอย่าง จึงแยกมาไว้ที่นี่
 * ที่เดียว ไม่งั้นแก้ที่หนึ่งแล้วลืมอีกที่
 */
export default function PostView({
  post,
  isAdmin,
  pinned = false,
  viaToken = false,
}: {
  post: PostDetail;
  isAdmin: boolean;
  /** ปักหมุดให้ขึ้นการ์ดใหญ่บนหน้า ABOUT อยู่ไหม */
  pinned?: boolean;
  /** เข้ามาทางลิงก์ลับ ปุ่มกลับจึงไม่ควรพาไปหน้ารวมที่อาจไม่มีสิทธิ์ดู */
  viaToken?: boolean;
}) {
  const date = thaiShortDate(
    (post.published_at ?? post.created_at).slice(0, 10),
  );

  const badge = isPostVisibility(post.visibility)
    ? VISIBILITY_LABEL[post.visibility]
    : null;

  const items: GalleryItem[] = post.media.map((media) => ({
    id: media.id,
    kind: media.kind,
    src: media.kind === "image" ? postImageUrl(media.url) : null,
    youtubeId: media.youtube_id,
    caption: media.caption,
    width: media.width,
    height: media.height,
  }));

  // งานกับงานอดิเรกมีบ้านอยู่ที่หน้า ABOUT ไม่ใช่หน้ารวมบล็อก
  // ปุ่มย้อนกลับจึงควรพากลับไปที่ที่คนกดเข้ามาจริงๆ
  const home =
    post.section_kind === "blog"
      ? { href: `/blog?section=${post.section_slug}`, label: post.section_title }
      : { href: `/about/${post.section_slug}`, label: post.section_title };

  // โพสต์ลิงก์ลับต้องแชร์ด้วย /p/<token> ไม่ใช่ /blog/<id> ซึ่งคนอื่นเปิดไม่ได้
  const sharePath =
    post.visibility === "unlisted" && post.share_token
      ? `/p/${post.share_token}`
      : `/blog/${post.id}`;

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      {viaToken ? null : (
        <Link
          href={home.href}
          className="inline-flex min-h-11 items-center pr-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          ← {home.label}
        </Link>
      )}

      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{date}</span>
          <span aria-hidden>·</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent-strong">
            {post.section_title}
          </span>
          {post.status === "draft" ? (
            <>
              <span aria-hidden>·</span>
              <span className="rounded-full bg-border px-2.5 py-0.5">ร่าง</span>
            </>
          ) : null}
          {badge && post.visibility !== "public" ? (
            <>
              <span aria-hidden>·</span>
              <span>{badge}</span>
            </>
          ) : null}
        </div>
      </header>

      <PostBody body={post.body} />

      <MediaGallery items={items} />

      <footer className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <CopyLink
          path={sharePath}
          label={
            post.visibility === "unlisted" ? "คัดลอกลิงก์ลับ" : "คัดลอกลิงก์"
          }
        />

        {isAdmin ? (
          <>
            {post.section_kind !== "blog" ? (
              <form action={togglePinnedAction}>
                <input type="hidden" name="post_id" value={post.id} />
                <input
                  type="hidden"
                  name="pinned"
                  value={pinned ? "false" : "true"}
                />
                <button
                  type="submit"
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm tracking-wide transition-colors ${
                    pinned
                      ? "bg-club-line font-medium text-background hover:opacity-90"
                      : "border border-border text-muted hover:border-accent hover:text-foreground"
                  }`}
                >
                  {pinned ? "ปักหมุดอยู่ ✓" : "ปักหมุด"}
                </button>
              </form>
            ) : null}

            <Link
              href={`/blog/${post.id}/edit`}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              แก้โพสต์
            </Link>
            <form action={deletePostAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <ConfirmSubmit
                label="ลบ"
                question={`ลบโพสต์ "${post.title}" ใช่ไหม รูปในโพสต์จะถูกลบไปด้วย กู้คืนไม่ได้`}
                confirmLabel="ใช่ ลบเลย"
                pendingLabel="กำลังลบ…"
              />
            </form>
          </>
        ) : null}

        {viaToken ? null : (
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm tracking-wide text-muted transition-colors hover:text-foreground"
          >
            ดูโพสต์ทั้งหมด →
          </Link>
        )}
      </footer>
    </article>
  );
}
