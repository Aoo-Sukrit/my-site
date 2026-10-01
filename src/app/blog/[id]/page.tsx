import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { excerpt, youTubeThumb } from "@/lib/post-rules";
import { getPostById, getPostFeed, postImageUrl } from "@/lib/posts";

import PostView from "../post-view";

/**
 * Open Graph ไว้ให้ LINE กับ Facebook ขึ้นรูปปกตอนแชร์
 *
 * ใส่เฉพาะโพสต์ที่เผยแพร่แล้วและเป็นสาธารณะ เพราะตัวที่เปิดให้เฉพาะสมาชิก
 * หรือเป็นร่าง ตัวดึง preview ของ LINE เข้ามาแบบไม่ล็อกอินอยู่แล้ว
 * มันจะได้หน้าเปล่า การใส่ชื่อเรื่องลงไปจึงเท่ากับหลุดชื่อออกไปฟรีๆ
 */
export async function generateMetadata(
  props: PageProps<"/blog/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const post = await getPostById(id);

  if (!post) return { title: "ไม่เจอโพสต์" };

  const shareable = post.status === "published" && post.visibility === "public";
  if (!shareable) return { title: post.title };

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
    openGraph: {
      type: "article",
      title: post.title,
      description: excerpt(post.body, 160) || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PostPage(props: PageProps<"/blog/[id]">) {
  const { id } = await props.params;

  const [post, viewer] = await Promise.all([getPostById(id), getViewer()]);

  // ไม่มีสิทธิ์กับไม่มีโพสต์ ให้ผลลัพธ์เดียวกันโดยตั้งใจ
  // ถ้าแยกเป็น 403 กับ 404 คนนอกจะเดาได้ว่า id ไหนมีโพสต์อยู่จริง
  if (!post) notFound();

  // pinned ไม่ได้อยู่ใน post_by_id() เพราะคนอ่านทั่วไปไม่ต้องรู้
  // แอดมินเท่านั้นที่เห็นปุ่ม จึงไปหยิบจากฟีดของหมวดนั้นเอา
  const pinned =
    viewer?.profile.is_admin === true && post.section_kind !== "blog"
      ? (await getPostFeed(post.section_slug, 100)).some(
          (row) => row.id === post.id && row.pinned,
        )
      : false;

  return (
    <PostView
      post={post}
      isAdmin={viewer?.profile.is_admin ?? false}
      pinned={pinned}
    />
  );
}
