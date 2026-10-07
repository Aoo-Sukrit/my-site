import { Bone, PostListBones, SkeletonPage } from "@/components/skeleton";

/**
 * หน้าโครงของหน้าแรก และเป็นหน้าโครงสำรองของทั้งเว็บ
 * สำหรับหน้าที่ไม่มี loading.tsx ของตัวเอง
 */
export default function HomeLoading() {
  return (
    <SkeletonPage className="space-y-12">
      <div className="space-y-4">
        <Bone className="h-3.5 w-28" />
        <Bone className="h-9 w-72 max-w-full sm:h-12" />
        <Bone className="h-3.5 w-60" />
        <div className="flex items-center gap-4 pt-1">
          <Bone className="h-20 w-20 shrink-0" />
          <Bone className="h-6 w-40" />
        </div>
      </div>

      {/* การ์ด CLUB ใช้สีครีมของคลับ ไม่ใช่สีเทา จะได้ไม่เปลี่ยนสีวูบตอนของจริงมา */}
      <div className="flex flex-col gap-5 skeleton-on-cream rounded-3xl border-2 border-club-line/40 bg-club-cream p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
        <div
          aria-hidden
          className="skeleton aspect-square w-full max-w-56 self-center rounded-2xl sm:w-40"
        />
        <div className="flex-1 space-y-3">
          <Bone className="h-3 w-12" />
          <Bone className="h-5 w-4/5" />
          <Bone className="h-3.5 w-2/3" />
        </div>
      </div>

      <div className="space-y-3">
        <Bone className="h-5 w-28" />
        <PostListBones rows={2} />
      </div>
    </SkeletonPage>
  );
}
