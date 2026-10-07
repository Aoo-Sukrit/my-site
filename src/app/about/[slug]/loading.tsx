import {
  HeadingBones,
  PostListBones,
  SkeletonPage,
} from "@/components/skeleton";

export default function AboutSectionLoading() {
  return (
    <SkeletonPage>
      <HeadingBones />
      <PostListBones rows={3} />
    </SkeletonPage>
  );
}
