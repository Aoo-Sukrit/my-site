import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth";
import {
  hoursLeftToEditPrize,
  isPrizeBoard,
  withinPrizeEditWindow,
} from "@/lib/prize-rules";
import { getMyPrize, signPrizeImages } from "@/lib/prizes";

import PrizeForm from "../../prize-form";

export const metadata: Metadata = {
  title: "แก้รางวัล",
};

export default async function EditPrizePage(
  props: PageProps<"/club/prizes/[id]/edit">,
) {
  await requireApproved();
  const { id } = await props.params;

  const prize = await getMyPrize(id);
  if (!prize) notFound();

  // ด่านจริงอยู่ที่ trigger ในฐานข้อมูล ตรงนี้แค่กันไม่ให้เปิดหน้าที่กดแล้ว
  // ยังไงก็ไม่ผ่าน จะได้ไม่เสียเวลากรอก
  if (!prize.is_mine || !withinPrizeEditWindow(prize.created_at)) {
    redirect("/club?board=rewards");
  }

  const signed = prize.image_path
    ? await signPrizeImages([prize.image_path])
    : new Map<string, string>();

  return (
    <div className="mx-auto max-w-md space-y-8">
      <section className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-accent-strong">PRIZE</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          แก้รางวัล
        </h1>
        <p className="text-sm text-muted">
          แก้ได้อีก {hoursLeftToEditPrize(prize.created_at)} ชั่วโมง
        </p>
      </section>

      <PrizeForm
        mode="edit"
        prizeId={prize.prize_id}
        existingImageUrl={
          prize.image_path ? (signed.get(prize.image_path) ?? null) : null
        }
        defaults={{
          board: isPrizeBoard(prize.board) ? prize.board : "distance",
          rank: prize.is_last ? "last" : String(prize.rank_no ?? 1),
          title: prize.title ?? "",
          detail: prize.detail ?? "",
          isHidden: prize.is_secret,
        }}
      />

      <Link
        href="/club?board=rewards"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← ยกเลิก กลับแท็บรางวัล
      </Link>
    </div>
  );
}
