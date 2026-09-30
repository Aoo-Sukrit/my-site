"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Alert from "@/components/club/alert";
import Avatar from "@/components/club/avatar";
import {
  BOTTLE_OPTIONS,
  SIDE_LABEL,
  checkBottles,
  checkTargetKm,
  suggestedTargetKm,
} from "@/lib/challenge-rules";
import { formatKm } from "@/lib/date";
import type { ChallengeableMember } from "@/lib/supabase/types";

import { createChallengeAction } from "./actions";

/**
 * ฟอร์มท้าเพื่อน
 *
 * เลือกคน → ตั้งเป้า → เลือกจำนวนเบียร์ → ยืนยันอีกทีก่อนส่งจริง
 * เพราะท้าแล้วถอนได้เฉพาะตอนที่อีกฝ่ายยังไม่กดรับเท่านั้น
 *
 * ค่าขั้นต่ำของเป้าขึ้นกับว่าคนที่เลือกวิ่งไปแล้วเท่าไหร่ จึงต้องคิดฝั่งนี้ด้วย
 * แต่ตัวบังคับจริงอยู่ใน create_challenge() ซึ่งอ่านระยะสดจากฐานข้อมูลอีกรอบ
 * ถ้าระหว่างที่กรอกอยู่เขาวิ่งเพิ่มจนแซงเป้า ฐานข้อมูลจะเป็นคนปฏิเสธ
 */
export default function ChallengeForm({
  members,
}: {
  members: ChallengeableMember[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [targetKm, setTargetKm] = useState("");
  const [bottles, setBottles] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runner = members.find((member) => member.member_id === runnerId) ?? null;
  const currentKm = runner ? Number(runner.total_km) : 0;
  const minTarget = suggestedTargetKm(currentKm);

  function pick(member: ChallengeableMember) {
    setRunnerId(member.member_id);
    setConfirming(false);
    setError(null);
    // เติมเป้าที่กดได้เลยให้ก่อน แก้เองทีหลังได้
    setTargetKm(String(suggestedTargetKm(Number(member.total_km))));
  }

  function review() {
    setError(null);

    if (!runner) {
      setError("เลือกคนที่จะท้าก่อน");
      return;
    }
    const target = checkTargetKm(targetKm, currentKm);
    if (!target.ok) {
      setError(target.reason);
      return;
    }
    const beers = checkBottles(bottles);
    if (!beers.ok) {
      setError(beers.reason);
      return;
    }

    setConfirming(true);
  }

  function send() {
    if (!runner) return;

    startTransition(async () => {
      const result = await createChallengeAction({
        runnerId: runner.member_id,
        targetKm,
        bottles: String(bottles),
        currentKm,
      });

      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }

      router.push(
        `/club?board=rewards&msg=${encodeURIComponent("ส่งคำท้าแล้ว รอเขากดรับ")}`,
      );
    });
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted">
        ยังไม่มีสมาชิกคนอื่นให้ท้า ชวนเพื่อนเข้าคลับก่อน
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">ท้าใคร</legend>
        <ul className="space-y-2">
          {members.map((member) => {
            const chosen = member.member_id === runnerId;
            return (
              <li key={member.member_id}>
                <button
                  type="button"
                  onClick={() => pick(member)}
                  aria-pressed={chosen}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    chosen
                      ? "border-club-line bg-accent-soft"
                      : "border-border bg-surface hover:border-accent"
                  }`}
                >
                  <Avatar
                    src={member.avatar_url}
                    nickname={member.nickname}
                    size={40}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {member.nickname}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      เดือนนี้วิ่งไปแล้ว {formatKm(member.total_km)} กม.
                    </span>
                  </span>
                  {chosen ? (
                    <span
                      aria-hidden
                      className="shrink-0 text-sm text-accent-strong"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {runner ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              ระยะรวมทั้งเดือนต้องถึงกี่กิโล
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={minTarget}
              value={targetKm}
              onChange={(event) => {
                setTargetKm(event.target.value);
                setConfirming(false);
              }}
              className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-accent"
            />
            <span className="block text-xs text-muted">
              {runner.nickname} วิ่งไปแล้ว {formatKm(currentKm)} กม.
              ตั้งได้ตั้งแต่ {formatKm(minTarget)} กม. ขึ้นไป
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">วางเบียร์กี่ขวด</span>
            <select
              value={bottles}
              onChange={(event) => {
                setBottles(Number(event.target.value));
                setConfirming(false);
              }}
              className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent"
            >
              {BOTTLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} ขวด
                </option>
              ))}
            </select>
            <span className="block text-xs text-muted">
              คุณอยู่ข้าง{SIDE_LABEL.miss} ถ้าเขากดรับ เขาจะวางเท่ากันข้าง
              {SIDE_LABEL.reach}
            </span>
          </label>

          {confirming ? (
            <div className="space-y-3 rounded-xl border border-club-line bg-accent-soft p-3">
              <p className="text-sm leading-relaxed">
                ท้า {runner.nickname} ว่าเดือนนี้ระยะรวมจะไม่ถึง{" "}
                {formatKm(targetKm)} กม. และวาง {bottles} ขวดข้าง
                {SIDE_LABEL.miss} ใช่ไหม
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm tracking-wide text-muted transition-colors hover:text-foreground"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "กำลังส่ง…" : "ท้าเลย"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={review}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-club-line px-5 text-sm font-medium tracking-wide text-background transition hover:opacity-90"
            >
              ดูสรุปก่อนท้า
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
