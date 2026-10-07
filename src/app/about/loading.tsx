import { Bone, PostListBones, SkeletonPage } from "@/components/skeleton";

/** หน้าโครงของ ABOUT: การ์ดแนะนำตัว (รูปกลม ชื่อ ชิป ปุ่มลิงก์) แล้วโพสต์ */
export default function AboutLoading() {
  return (
    <SkeletonPage>
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <Bone className="h-20 w-20 shrink-0" />
          <Bone className="h-7 w-40" />
        </div>
        <Bone className="h-3.5 w-3/4" />
        <div className="flex flex-wrap gap-2">
          {["w-20", "w-24", "w-16"].map((width) => (
            <Bone key={width} className={`h-8 ${width}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <Bone className="h-10 w-28" />
          <Bone className="h-10 w-24" />
        </div>
      </div>
      <PostListBones rows={2} />
    </SkeletonPage>
  );
}
