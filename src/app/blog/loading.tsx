import {
  Bone,
  HeadingBones,
  PostListBones,
  SkeletonPage,
} from "@/components/skeleton";

export default function BlogLoading() {
  return (
    <SkeletonPage>
      <HeadingBones />
      <div className="flex gap-2">
        {["w-16", "w-20", "w-14"].map((width) => (
          <Bone key={width} className={`h-9 ${width}`} />
        ))}
      </div>
      <PostListBones rows={4} />
    </SkeletonPage>
  );
}
