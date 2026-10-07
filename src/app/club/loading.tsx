import {
  Bone,
  RowListBones,
  SkeletonPage,
  TabsBones,
} from "@/components/skeleton";

/**
 * หน้าโครงของกระดานคลับ
 *
 * เป็นหน้าโครงสำรองของทุกหน้าใต้ /club ที่ไม่มี loading.tsx ของตัวเองด้วย
 * หน้าที่หน้าตาไม่เหมือนกระดานจึงต้องมีไฟล์ของตัวเอง ไม่งั้นจะเห็นโพเดียม
 * โผล่แวบหนึ่งก่อนหน้าฟอร์ม
 */
export default function ClubLoading() {
  return (
    <SkeletonPage className="space-y-8 pb-28">
      <div className="space-y-3">
        <div
          aria-hidden
          className="skeleton mx-auto h-24 w-24 rounded-2xl sm:h-28 sm:w-28"
        />
        <Bone className="mx-auto h-6 w-52" />
        <Bone className="mx-auto h-3.5 w-36" />
        <Bone className="mx-auto h-4 w-28" />
      </div>

      <TabsBones />

      {/* โพเดียมสามแก้ว ซ้าย 2 กลาง 1 ขวา 3 ขนาดลดหลั่นแบบของจริง */}
      <div>
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {[
            "w-[80%] h-28 sm:h-36",
            "w-full h-36 sm:h-44",
            "w-[67%] h-24 sm:h-32",
          ].map((size) => (
            <div key={size} className="flex justify-center">
              <div
                aria-hidden
                className={`skeleton rounded-t-3xl rounded-b-xl ${size}`}
              />
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-border sm:h-2" />
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Bone className="mx-auto h-3.5 w-16" />
              <Bone className="mx-auto h-4 w-12" />
            </div>
          ))}
        </div>
      </div>

      <RowListBones rows={4} />

      <div aria-hidden className="skeleton h-16 rounded-2xl" />
    </SkeletonPage>
  );
}
