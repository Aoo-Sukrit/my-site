import { ViewTransition } from "react";

/**
 * ชิ้นส่วนของหน้าโครงระหว่างโหลด ใช้ใน loading.tsx ของแต่ละหน้า
 *
 * ทุกหน้าในเว็บนี้ต้องถาม Supabase ก่อนถึงจะวาดได้ ถ้าไม่มีหน้าโครง พอกดลิงก์
 * จอจะค้างหน้าเดิมไว้จนข้อมูลมาครบ คนกดเลยไม่รู้ว่ากดติดหรือยัง
 * มีหน้าโครงแล้ว Next สลับมาให้ทันทีที่กด แล้วค่อยเติมของจริงทีหลัง
 *
 * รูปร่างของแต่ละหน้าโครงเลียนแบบหน้าจริงคร่าวๆ ให้ตำแหน่งของใกล้กัน
 * พอของจริงมาแทนที่ ตาจะไม่ต้องกระโดดหาของใหม่
 */

/** ก้อนเทาหนึ่งก้อน ความกว้างความสูงส่งมาเป็นคลาสของ Tailwind */
export function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-full ${className}`} />;
}

/**
 * กรอบนอกของหน้าโครงทุกหน้า
 *
 * role="status" กับข้อความซ่อนไว้ให้โปรแกรมอ่านจอรู้ว่ากำลังโหลด
 * ส่วน ViewTransition ทำให้ตอนของจริงมาแทน หน้าโครงจางหายไป ไม่ใช่หายวับ
 */
export function SkeletonPage({
  children,
  className = "space-y-8",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition exit="page-exit" default="none">
      <div role="status" className={`skeleton-page ${className}`}>
        <span className="sr-only">กำลังโหลด…</span>
        {children}
      </div>
    </ViewTransition>
  );
}

/** หัวหน้าแบบ ป้ายเล็ก + หัวข้อใหญ่ + บรรทัดรอง ที่หลายหน้าใช้ร่วมกัน */
export function HeadingBones({ center = false }: { center?: boolean }) {
  const align = center ? "mx-auto" : "";
  return (
    <div className="space-y-3">
      <Bone className={`h-3.5 w-20 ${align}`} />
      <Bone className={`h-8 w-56 max-w-full ${align}`} />
      <Bone className={`h-3.5 w-40 ${align}`} />
    </div>
  );
}

/** การ์ดขอบมนสีพื้นผิว ข้างในเป็นบรรทัดข้อความ */
export function CardBones({ lines = 3 }: { lines?: number }) {
  const widths = ["w-11/12", "w-4/5", "w-2/3", "w-3/4", "w-1/2"];
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <Bone className="h-5 w-32" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={`h-3.5 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

/** รายการแถวแบบกระดานอันดับ: เลข รูปกลม ชื่อ ตัวเลขชิดขวา */
export function RowListBones({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-16 items-center gap-3 px-3 py-2">
          <Bone className="h-3.5 w-4" />
          <Bone className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3.5 w-28" />
            <Bone className="h-3 w-20" />
          </div>
          <Bone className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/** แถบแท็บสามช่องแบบหน้ากระดาน */
export function TabsBones({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-1 rounded-full border border-border p-1">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex min-h-11 flex-1 items-center justify-center"
        >
          <Bone className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

/**
 * หน้าที่เป็นฟอร์ม: หัวข้อ แล้วช่องกรอกเรียงลงมา ปิดท้ายด้วยปุ่ม
 * หน้าฟอร์มของคลับส่วนใหญ่บีบไว้กว้าง max-w-md ส่งคลาสความกว้างมาให้ตรงกัน
 */
export function FormBones({
  fields = 3,
  width = "",
}: {
  fields?: number;
  width?: string;
}) {
  return (
    <SkeletonPage className={`space-y-8 ${width}`}>
      <HeadingBones />
      <div className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-3.5 w-24" />
            <div className="skeleton h-11 w-full rounded-xl" aria-hidden />
          </div>
        ))}
        <Bone className="h-11 w-32" />
      </div>
    </SkeletonPage>
  );
}

/** หน้าอ่านโพสต์: ลิงก์กลับ หัวข้อ ป้ายวันที่ รูปปก แล้วย่อหน้า */
export function PostBones() {
  return (
    <SkeletonPage className="mx-auto max-w-2xl space-y-6">
      <Bone className="h-3.5 w-24" />
      <div className="space-y-3">
        <Bone className="h-8 w-4/5" />
        <div className="flex gap-2">
          <Bone className="h-5 w-20" />
          <Bone className="h-5 w-16" />
        </div>
      </div>
      <div aria-hidden className="skeleton aspect-[16/10] w-full rounded-2xl" />
      <div className="space-y-3">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-11/12" />
        <Bone className="h-3.5 w-4/5" />
        <Bone className="h-3.5 w-2/3" />
      </div>
    </SkeletonPage>
  );
}

/** รายการโพสต์แบบหน้า BLOG: รูปปกสี่เหลี่ยมซ้าย ข้อความขวา */
export function PostListBones({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
        >
          <div
            aria-hidden
            className="skeleton h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24"
          />
          <div className="min-w-0 flex-1 space-y-2.5 pt-1">
            <Bone className="h-3 w-28" />
            <Bone className="h-5 w-3/4" />
            <Bone className="h-3.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
