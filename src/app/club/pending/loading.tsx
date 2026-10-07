import { CardBones, HeadingBones, SkeletonPage } from "@/components/skeleton";

export default function PendingLoading() {
  return (
    <SkeletonPage className="mx-auto max-w-md space-y-8">
      <HeadingBones />
      <CardBones lines={2} />
    </SkeletonPage>
  );
}
