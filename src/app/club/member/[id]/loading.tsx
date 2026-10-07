import { Bone, CardBones, SkeletonPage } from "@/components/skeleton";

/**
 * หน้าโครงของโปรไฟล์สมาชิก วางตามหน้าจริง: การ์ดหัวโปรไฟล์ (รูปแนวตั้งซ้าย
 * ชื่อขวาล่าง) แถวสถิติสามช่องคั่นด้วยเส้น แล้วการ์ดเนื้อหา
 */
export default function MemberLoading() {
  return (
    <SkeletonPage>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-accent-soft/60">
        <div className="flex items-end gap-4 p-4 sm:gap-6 sm:p-6">
          <div
            aria-hidden
            className="skeleton aspect-[5/8] w-32 shrink-0 rounded-2xl sm:w-40"
          />
          <div className="min-w-0 flex-1 space-y-2.5 pb-1">
            <Bone className="h-5 w-24" />
            <Bone className="h-7 w-32" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 px-1">
            <Bone className="mx-auto h-6 w-16" />
            <Bone className="mx-auto h-3 w-12" />
          </div>
        ))}
      </div>

      <CardBones lines={2} />
      <CardBones lines={3} />
    </SkeletonPage>
  );
}
