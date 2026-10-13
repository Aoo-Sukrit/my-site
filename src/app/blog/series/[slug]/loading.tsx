import { HeadingBones, PostListBones, SkeletonPage } from "@/components/skeleton";

export default function SeriesLoading() {
  return (
    <SkeletonPage className="mx-auto max-w-2xl space-y-8">
      <HeadingBones />
      <PostListBones rows={4} />
    </SkeletonPage>
  );
}
