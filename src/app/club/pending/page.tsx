import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/club/form-controls";
import { CLUB_ROUTES, requireViewer } from "@/lib/auth";

import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: "รออนุมัติ",
};

export default async function PendingPage() {
  const viewer = await requireViewer();

  // proxy กันไว้ชั้นหนึ่งแล้ว แต่เช็กซ้ำเผื่อสถานะเพิ่งเปลี่ยน
  if (viewer.profile.status === "approved") redirect(CLUB_ROUTES.home);

  const blocked = viewer.profile.status === "blocked";

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-3">
        <p className="text-sm tracking-[0.2em] text-accent-strong">
          {blocked ? "ถูกระงับ" : "รออนุมัติ"}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {blocked ? "บัญชีนี้ถูกระงับอยู่" : `สวัสดี ${viewer.profile.nickname}`}
        </h1>
        <p className="text-muted">
          {blocked
            ? "ถ้าคิดว่าผิดพลาด ทักแอดมินในกลุ่มได้เลย"
            : "สมัครเรียบร้อยแล้ว ตอนนี้รอแอดมินกดอนุมัติอีกนิดเดียว พอผ่านแล้วจะเข้าดูตารางแข่งกับรายชื่อสมาชิกได้"}
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-surface p-5 text-sm">
        <p>
          <span className="text-muted">ฉายา</span> {viewer.profile.nickname}
        </p>
        <p className="break-all">
          <span className="text-muted">อีเมล</span> {viewer.email ?? "—"}
        </p>
        <p className="text-muted">
          ลองรีเฟรชหน้านี้อีกทีหลังแอดมินกดอนุมัติ
        </p>
      </section>

      <form action={logoutAction}>
        <SubmitButton variant="ghost" pendingLabel="กำลังออก…">
          ออกจากระบบ
        </SubmitButton>
      </form>
    </div>
  );
}
