import { Bone, SkeletonPage, TabsBones } from "@/components/skeleton";

/** หน้าโครงของหน้ารูปสตอรี่: หัวข้อตรงกลาง แท็บสองช่อง แล้วกรอบรูปแนวตั้ง 9:16 */
export default function ShareLoading() {
  return (
    <SkeletonPage className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2.5">
        <Bone className="mx-auto h-3.5 w-16" />
        <Bone className="mx-auto h-7 w-36" />
        <Bone className="mx-auto h-3.5 w-24" />
      </div>
      <TabsBones count={2} />
      <div aria-hidden className="skeleton h-20 rounded-2xl" />
      <div aria-hidden className="skeleton aspect-[9/16] w-full rounded-2xl" />
    </SkeletonPage>
  );
}
