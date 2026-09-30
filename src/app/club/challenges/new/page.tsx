import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import { getChallengeableMembers, getRoundDeadlines } from "@/lib/challenges";
import { bangkokDayOfMonth, thaiDateTimeLong } from "@/lib/date";
import { isJoinOpen } from "@/lib/challenge-rules";

import ChallengeForm from "../challenge-form";

export const metadata: Metadata = {
  title: "ท้าเพื่อน",
};

export default async function NewChallengePage() {
  await requireApproved();

  const [members, deadlines] = await Promise.all([
    getChallengeableMembers(),
    getRoundDeadlines(),
  ]);

  // เวลาทั้งหมดมาจาก round_deadlines() ฝั่งฐานข้อมูล
  // หน้านี้ไม่รู้จักเลข 20 และไม่รู้จักเลข 4 เลย
  const open = deadlines ? isJoinOpen(deadlines.lock_at) : false;
  const settleDay = deadlines ? bangkokDayOfMonth(deadlines.settle_at) : null;

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">CHALLENGE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          ท้าเพื่อน
        </h1>
        <p className="text-sm text-muted">
          ท้าว่าระยะรวมทั้งเดือนของเขาจะถึงเป้าที่คุณตั้งหรือไม่
        </p>
      </section>

      {!deadlines ? (
        <Alert tone="error">ยังไม่มีรอบของเดือนนี้ ท้าไม่ได้</Alert>
      ) : !open ? (
        <Alert tone="error">
          หมดเวลาท้าของเดือนนี้แล้ว ปิดรับไปเมื่อ{" "}
          {thaiDateTimeLong(deadlines.lock_at)} เดือนหน้าค่อยมาใหม่
        </Alert>
      ) : (
        <ChallengeForm members={members} />
      )}

      {deadlines ? (
        <section className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
          <p className="text-sm font-medium text-foreground">กติกาสั้นๆ</p>
          <p>
            · เป้าต้องมากกว่าระยะที่เขาวิ่งไปแล้ว และนับระยะรวมทั้งเดือน
            ไม่ได้เริ่มนับจากวันที่ท้า
          </p>
          <p>· เขาต้องกดรับก่อนถึงจะเริ่ม ระหว่างรอคุณถอนคำท้าได้</p>
          <p>
            · พอรับแล้วเขาวางเท่ากับคุณอัตโนมัติ คนอื่นมาลงข้างไหนก็ได้
            คนละ 1–12 ขวด ข้างเดียวต่อคน
          </p>
          <p>· ท้า รับ และลงเพิ่มได้ถึง {thaiDateTimeLong(deadlines.lock_at)}</p>
          <p>
            · ตัดสินวันที่ {settleDay} ของเดือนถัดไป จากระยะจริง
            เพราะผลวิ่งกรอกย้อนหลังได้อีกไม่กี่วันหลังจบเดือน
          </p>
          <p>· ฝั่งแพ้เสียตามที่วาง ฝั่งชนะแบ่งกันตามสัดส่วน ปัดเป็นครึ่งขวด</p>
          <p>· วางแล้วถอนไม่ได้</p>
        </section>
      ) : null}

      <Link
        href="/club?board=rewards"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับแท็บรางวัล
      </Link>
    </div>
  );
}
