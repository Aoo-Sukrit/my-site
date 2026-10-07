import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import { requireApproved } from "@/lib/auth";
import { getChallengeableMembers, getRoundDeadlines } from "@/lib/challenges";
import { thaiDateTimeLong } from "@/lib/date";
import { SHARE_CAP, isJoinOpen } from "@/lib/challenge-rules";

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
          <p>
            · คุณตั้งกอง 1–12 ขวด อยู่ฝั่งไม่ถึง เขาอยู่ฝั่งถึง
            สองคนเติมกองเองไม่ได้
          </p>
          <p>
            · เพื่อนเข้าร่วมฝั่งไหนก็ได้ คนละครั้ง เติมกอง +0 ถึง +3 ขวด
            (+0 = ร่วมหุ้นช่วยหาร) เข้าร่วมได้ตั้งแต่ตอนรอรับ
          </p>
          <p>
            · เขาต้องกดรับก่อนถึงจะเริ่ม ระหว่างรอคุณถอนคำท้าได้ ถ้าไม่รับ
            ทุกคนที่ลงไว้ถือว่าโมฆะ
          </p>
          <p>· ท้า รับ และเข้าร่วมได้ถึง {thaiDateTimeLong(deadlines.lock_at)}</p>
          <p>
            · ตัดสิน {thaiDateTimeLong(deadlines.settle_at)} จากระยะจริง
            เพราะผลวิ่งกรอกย้อนหลังได้อีกไม่กี่วันหลังจบเดือน
          </p>
          <p>
            · ฝั่งแพ้จ่ายทั้งกองหารเท่ากัน ฝั่งชนะรับทั้งกองหารเท่ากัน
            ไม่ปัดเศษ และไม่มีใครจ่ายหรือรับเกิน {SHARE_CAP} ขวดต่อคน
          </p>
          <p>· ลงแล้วถอนไม่ได้</p>
        </section>
      ) : null}

      <Link
        href="/club?board=challenges"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับแท็บคำท้า
      </Link>
    </div>
  );
}
