import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { excerpt, youTubeThumb } from "@/lib/post-rules";
import { getPostByToken, postImageUrl } from "@/lib/posts";

import PostView from "../../blog/post-view";

/**
 * หน้าโพสต์สำหรับลิงก์ลับ
 *
 * ทางเดียวที่โพสต์แบบ unlisted ออกจากฐานข้อมูลได้ ต้องรู้ token 32 ตัว
 * ซึ่งสุ่มมาและไม่มีที่ไหนคืนออกไปนอกจากให้แอดมินเอง
 */
export async function generateMetadata(
  props: PageProps<"/p/[token]">,
): Promise<Metadata> {
  const { token } = await props.params;
  const post = await getPostByToken(token);

  if (!post) return { title: "ไม่เจอโพสต์" };

  const first = post.media[0];
  const image =
    first?.kind === "image"
      ? postImageUrl(first.url)
      : first?.kind === "youtube" && first.youtube_id
        ? youTubeThumb(first.youtube_id)
        : null;

  return {
    title: post.title,
    description: excerpt(post.body, 160) || undefined,
    // คนที่ได้ลิงก์ไปควรแชร์ต่อในแชทแล้วขึ้นรูปปกได้ แต่ไม่ควรให้ search engine
    // เก็บไว้ ไม่งั้นลิงก์ลับจะโผล่ในผลค้นหา
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      title: post.title,
      description: excerpt(post.body, 160) || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedPostPage(props: PageProps<"/p/[token]">) {
  const { token } = await props.params;

  const [post, viewer] = await Promise.all([
    getPostByToken(token),
    getViewer(),
  ]);

  if (!post) notFound();

  return (
    <PostView post={post} isAdmin={viewer?.profile.is_admin ?? false} viaToken />
  );
}
