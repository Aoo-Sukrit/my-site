import Link from "next/link";

import ConfirmSubmit from "@/components/club/confirm-submit";
import { formatKm } from "@/lib/date";
import type { Run } from "@/lib/supabase/types";

import { deleteRunAction } from "../../run/actions";

export default function RunRow({
  run,
  proofUrl,
  dateLabel,
  canManage,
  hoursLeft,
  isAdminEdit,
}: {
  run: Run;
  proofUrl: string | null;
  dateLabel: string;
  canManage: boolean;
  hoursLeft: number;
  isAdminEdit: boolean;
}) {
  return (
    <li className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-lg font-semibold">
          {formatKm(run.distance_km)}
          <span className="ml-1 text-sm font-normal text-muted">กม.</span>
        </span>
        <span className="text-sm text-muted">{dateLabel}</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-strong">
          {run.source}
        </span>
      </div>

      {run.note ? <p className="text-sm text-muted">{run.note}</p> : null}

      <div className="flex flex-wrap gap-2">
        {proofUrl ? (
          // ลิงก์มีลายเซ็นและหมดอายุใน 1 ชั่วโมง เปิดแท็บใหม่เพื่อดูเต็มจอ
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            ดูรูปหลักฐาน
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center text-sm text-muted">
            เปิดรูปหลักฐานไม่ได้
          </span>
        )}

        {canManage ? (
          <>
            <Link
              href={`/club/run/${run.id}/edit`}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              แก้
            </Link>

            <form action={deleteRunAction}>
              <input type="hidden" name="id" value={run.id} />
              <input type="hidden" name="member_id" value={run.profile_id} />
              <ConfirmSubmit
                label="ลบ"
                question={`ลบผลวิ่ง ${formatKm(run.distance_km)} กม. วันที่ ${dateLabel} ใช่ไหม การลบจะขึ้นในประวัติให้ทุกคนเห็น`}
                confirmLabel="ใช่ ลบเลย"
                pendingLabel="กำลังลบ…"
              />
            </form>
          </>
        ) : null}
      </div>

      {canManage && !isAdminEdit ? (
        <p className="text-xs text-muted">
          แก้เองได้อีก {hoursLeft} ชั่วโมง หลังจากนั้นต้องให้แอดมินแก้
        </p>
      ) : null}
    </li>
  );
}
