import { CardBones, HeadingBones, SkeletonPage } from "@/components/skeleton";

export default function TargetLoading() {
  return (
    <SkeletonPage className="space-y-8 pb-10">
      <HeadingBones />
      <CardBones lines={2} />
      <CardBones lines={4} />
    </SkeletonPage>
  );
}
