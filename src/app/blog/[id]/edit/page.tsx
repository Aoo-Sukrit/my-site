import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import {
  isPostVisibility,
  youTubeThumb,
  type PostVisibility,
} from "@/lib/post-rules";
import { getPostById, getPostSections, getStorageUsed, postImageUrl } from "@/lib/posts";

import PostEditor from "../../post-editor";

export const metadata: Metadata = {
  title: "แก้โพสต์",
};

export default async function EditPostPage(
  props: PageProps<"/blog/[id]/edit">,
) {
  await requireAdmin();
  const { id } = await props.params;

  const [post, sections, storageUsed] = await Promise.all([
    getPostById(id),
    getPostSections(),
    getStorageUsed(),
  ]);

  if (!post) notFound();

  const visibility: PostVisibility = isPostVisibility(post.visibility)
    ? post.visibility
    : "public";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">EDIT POST</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          แก้โพสต์
        </h1>
      </section>

      <PostEditor
        sections={sections}
        storageUsed={storageUsed}
        defaults={{
          id: post.id,
          title: post.title,
          body: post.body,
          section: post.section_slug,
          visibility,
          media: post.media.map((item) => ({
            key: item.id,
            kind: item.kind,
            url: item.url,
            youtubeId: item.youtube_id,
            caption: item.caption ?? "",
            width: item.width,
            height: item.height,
            bytes: item.bytes,
            previewUrl:
              item.kind === "image"
                ? postImageUrl(item.url)
                : item.youtube_id
                  ? youTubeThumb(item.youtube_id)
                  : null,
          })),
        }}
      />

      <Link
        href={`/blog/${post.id}`}
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← ยกเลิก กลับไปดูโพสต์
      </Link>
    </div>
  );
}
