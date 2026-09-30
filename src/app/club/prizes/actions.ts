"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth";
import {
  BOOBY_SLOT,
  checkPrizeDetail,
  checkPrizeTitle,
  isPrizeBoard,
} from "@/lib/prize-rules";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PrizeFormValues = {
  board: string;
  /** BOOBY_SLOT หรือเลข 1 ถึง 10 เป็นสตริง */
  rank: string;
  title: string;
  detail: string;
  /** ที่อยู่รูปที่เพิ่งอัป หรือ null เมื่อไม่ได้เปลี่ยนรูป */
  imagePath: string | null;
  isHidden: boolean;
};

export type PrizeActionResult = { error: string | null; ok: boolean };

function refresh() {
  revalidatePath("/club");
  revalidatePath("/club/admin");
}

/** แปลงค่าจากฟอร์มเป็นคู่ rank_no / is_booby ที่ฐานข้อมูลต้องการ */
function parseRank(rank: string): { rankNo: number | null; isBooby: boolean } {
  if (rank === BOOBY_SLOT) return { rankNo: null, isBooby: true };
  const parsed = Number(rank);
  return { rankNo: Number.isInteger(parsed) ? parsed : null, isBooby: false };
}

function validate(values: PrizeFormValues): string | null {
  if (!isPrizeBoard(values.board)) return "เลือกกระดานก่อน";

  const { rankNo, isBooby } = parseRank(values.rank);
  if (!isBooby && (rankNo === null || rankNo < 1 || rankNo > 10)) {
    return "เลือกอันดับ 1 ถึง 10 หรือบูบี้";
  }

  const title = checkPrizeTitle(values.title);
  if (!title.ok) return title.reason;

  const detail = checkPrizeDetail(values.detail);
  if (!detail.ok) return detail.reason;

  return null;
}

/** ที่อยู่รูปต้องอยู่ในโฟลเดอร์ของคนตั้งเอง ฐานข้อมูลก็เช็กซ้ำอีกชั้น */
function imageBelongsTo(path: string, userId: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}

export async function createPrizeAction(
  values: PrizeFormValues,
): Promise<PrizeActionResult> {
  const viewer = await requireApproved();

  const problem = validate(values);
  if (problem) return { error: problem, ok: false };

  if (values.imagePath && !imageBelongsTo(values.imagePath, viewer.userId)) {
    return { error: "ที่อยู่ของรูปไม่ถูกต้อง", ok: false };
  }

  const { rankNo, isBooby } = parseRank(values.rank);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_prize", {
    p_board: values.board,
    p_rank_no: rankNo,
    p_is_booby: isBooby,
    p_title: values.title,
    p_detail: values.detail,
    p_image_path: values.imagePath,
    p_is_hidden: values.isHidden,
  });

  if (error) return { error: toThaiDbError(error), ok: false };

  refresh();
  return { error: null, ok: true };
}

export async function updatePrizeAction(
  prizeId: string,
  values: PrizeFormValues,
): Promise<PrizeActionResult> {
  const viewer = await requireApproved();

  const problem = validate(values);
  if (problem) return { error: problem, ok: false };

  if (values.imagePath && !imageBelongsTo(values.imagePath, viewer.userId)) {
    return { error: "ที่อยู่ของรูปไม่ถูกต้อง", ok: false };
  }

  const { rankNo, isBooby } = parseRank(values.rank);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_prize", {
    p_prize_id: prizeId,
    p_board: values.board,
    p_rank_no: rankNo,
    p_is_booby: isBooby,
    p_title: values.title,
    p_detail: values.detail,
    // ส่ง null แปลว่าไม่ได้เปลี่ยนรูป ฝั่งฐานข้อมูลจะเก็บของเดิมไว้
    p_image_path: values.imagePath,
  });

  if (error) return { error: toThaiDbError(error), ok: false };

  refresh();
  return { error: null, ok: true };
}

/** ใช้เป็น form action คู่กับปุ่มยืนยันสองจังหวะ */
export async function deletePrizeAction(formData: FormData) {
  await requireApproved();

  const prizeId = String(formData.get("prize_id") ?? "");
  const back = String(formData.get("back") ?? "/club?board=rewards");

  if (!prizeId) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=${encodeURIComponent("ไม่รู้ว่าจะลบชิ้นไหน")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_prize", { p_prize_id: prizeId });

  const separator = back.includes("?") ? "&" : "?";
  if (error) {
    redirect(`${back}${separator}err=${encodeURIComponent(toThaiDbError(error))}`);
  }

  refresh();
  redirect(`${back}${separator}msg=${encodeURIComponent("ลบรางวัลแล้ว")}`);
}

/** เปิดให้ทุกคนเห็น กดแล้วปิดกลับไม่ได้ */
export async function revealPrizeAction(formData: FormData) {
  await requireApproved();

  const prizeId = String(formData.get("prize_id") ?? "");
  const back = "/club?board=rewards";

  if (!prizeId) {
    redirect(`${back}&err=${encodeURIComponent("ไม่รู้ว่าจะเปิดชิ้นไหน")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reveal_prize", { p_prize_id: prizeId });

  if (error) {
    redirect(`${back}&err=${encodeURIComponent(toThaiDbError(error))}`);
  }

  refresh();
  redirect(`${back}&msg=${encodeURIComponent("เปิดให้ทุกคนเห็นแล้ว")}`);
}
