import {
  HeadingBones,
  RowListBones,
  SkeletonPage,
} from "@/components/skeleton";

export default function AdminLoading() {
  return (
    <SkeletonPage className="space-y-10">
      <HeadingBones />
      <RowListBones rows={4} />
    </SkeletonPage>
  );
}
