"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth";
import { bangkokToday, thaiMonthLabel } from "@/lib/date";
import { checkEntryWindow } from "@/lib/run-rules";
import { getRoundForDate } from "@/lib/runs";
import { toThaiDbError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRunSource, type Round, type Run } from "@/lib/supabase/types";

export type RunFormValues = {
  ranOn: string;
  distanceKm: string;
  source: string;
  note: string;
  /** ที่อยู่ไฟล์ที่เพิ่งอัป หรือ null เมื่อแก้ไขโดยไม่เปลี่ยนรูป */
  proofPath: string | null;
};

export type RunActionResult = { error: string | null; ok: boolean };

const MAX_DISTANCE_KM = 9999.99;
const MAX_NOTE_LENGTH = 300;

/** ตรวจช่องที่ไม่เกี่ยวกับวันที่ ส่วนวันที่แยกไปตามบริบทของแต่ละ action */
function validateFields(values: RunFormValues): string | null {
  const distance = Number(values.distanceKm);
  if (!Number.isFinite(distance) || distance <= 0) {
    return "ระยะต้องมากกว่า 0";
  }
  if (distance > MAX_DISTANCE_KM) {
    return "ระยะเยอะเกินไป ลองเช็กตัวเลขอีกที";
  }
  if (!isRunSource(values.source)) {
    return "เลือกแอปที่มาก่อน";
  }
  if (values.note.length > MAX_NOTE_LENGTH) {
    return `หมายเหตุยาวเกิน ${MAX_NOTE_LENGTH} ตัวอักษร`;
  }
  return null;
}

/**
 * รูปหลักฐานถูกอัปจากเบราว์เซอร์ก่อนแล้ว ตรงนี้ได้มาแค่ที่อยู่ไฟล์
 * Server Action ถูกยิงตรงด้วย POST ได้ จึงต้องยืนยันว่าที่อยู่นั้นอยู่ใน
 * โฟลเดอร์ของคนคนนั้นจริง ไม่งั้นใครก็อ้างไฟล์ของคนอื่นมาเป็นหลักฐานได้
 */
function proofBelongsTo(path: string, userId: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}

export async function createRunAction(
  values: RunFormValues,
): Promise<RunActionResult> {
  const viewer = await requireApproved();

  const fieldProblem = validateFields(values);
  if (fieldProblem) return { error: fieldProblem, ok: false };

  // กติกาเดียวกับ trigger runs_enforce_entry_window ในฐานข้อมูล
  // เช็กตรงนี้ด้วยเพื่อให้ข้อความอ่านง่าย ตัวบังคับจริงยังอยู่ฝั่งฐานข้อมูล
  const window = checkEntryWindow(values.ranOn, bangkokToday());
  if (!window.ok) return { error: window.reason, ok: false };

  // ผลวิ่งไปเข้ารอบของเดือนที่วิ่งจริง ไม่ใช่รอบของเดือนปัจจุบัน
  const round = await getRoundForDate(values.ranOn);
  if (!round) {
    return { error: "หารอบของเดือนนั้นไม่เจอ ลองรีเฟรชอีกครั้ง", ok: false };
  }
  if (round.status !== "open") {
    return {
      error: `รอบเดือน${thaiMonthLabel(round.month)} ปิดไปแล้ว กรอกย้อนเข้าไปไม่ได้`,
      ok: false,
    };
  }

  if (!values.proofPath) {
    return { error: "ต้องแนบรูปหลักฐานด้วย", ok: false };
  }
  if (!proofBelongsTo(values.proofPath, viewer.userId)) {
    return { error: "ที่อยู่ของรูปหลักฐานไม่ถูกต้อง", ok: false };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("runs").insert({
    profile_id: viewer.userId,
    round_id: round.id,
    ran_on: values.ranOn,
    distance_km: Number(values.distanceKm).toFixed(2),
    source: values.source,
    proof_url: values.proofPath,
    note: values.note.trim() || null,
  });

  if (error) return { error: toThaiDbError(error), ok: false };

  revalidatePath("/club");
  revalidatePath(`/club/member/${viewer.userId}`);
  return { error: null, ok: true };
}

export async function updateRunAction(
  runId: string,
  values: RunFormValues,
): Promise<RunActionResult> {
  const viewer = await requireApproved();

  const fieldProblem = validateFields(values);
  if (fieldProblem) return { error: fieldProblem, ok: false };

  const supabase = await createSupabaseServerClient();

  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle<Run>();

  if (!run) return { error: "ไม่เจอผลวิ่งรายการนี้", ok: false };

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", run.round_id)
    .maybeSingle<Round>();

  if (!round) return { error: "ไม่เจอรอบเดือนของผลวิ่งรายการนี้", ok: false };

  if (values.ranOn > bangkokToday()) {
    return { error: "กรอกวันที่ในอนาคตไม่ได้", ok: false };
  }

  // แก้วันที่ข้ามเดือนไม่ได้ ไม่งั้นผลวิ่งจะค้างอยู่ในรอบเดิมทั้งที่วันที่บอก
  // อีกเดือน ฐานข้อมูลก็กันไว้อีกชั้น
  if (values.ranOn.slice(0, 7) !== round.month.slice(0, 7)) {
    return {
      error: `รายการนี้อยู่ในรอบเดือน${thaiMonthLabel(round.month)} แก้วันที่ข้ามเดือนไม่ได้ ถ้ากรอกเดือนผิดให้ลบแล้วกรอกใหม่`,
      ok: false,
    };
  }

  if (values.proofPath && !proofBelongsTo(values.proofPath, viewer.userId)) {
    return { error: "ที่อยู่ของรูปหลักฐานไม่ถูกต้อง", ok: false };
  }

  // กติกา 24 ชั่วโมงกับสิทธิ์แอดมินถูกบังคับโดย trigger ในฐานข้อมูล
  // ถ้าไม่ผ่านจะได้ error กลับมาตรงนี้เอง
  const { error } = await supabase
    .from("runs")
    .update({
      ran_on: values.ranOn,
      distance_km: Number(values.distanceKm).toFixed(2),
      source: values.source,
      note: values.note.trim() || null,
      ...(values.proofPath ? { proof_url: values.proofPath } : {}),
    })
    .eq("id", runId);

  if (error) return { error: toThaiDbError(error), ok: false };

  revalidatePath("/club");
  revalidatePath(`/club/member/${run.profile_id}`);
  return { error: null, ok: true };
}

/** ใช้เป็น form action คู่กับปุ่มยืนยันสองจังหวะ */
export async function deleteRunAction(formData: FormData) {
  await requireApproved();

  const runId = String(formData.get("id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const back = `/club/member/${memberId}`;

  if (!runId || !memberId) {
    redirect(`${back}?err=${encodeURIComponent("ไม่รู้ว่าจะลบรายการไหน")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("runs").delete().eq("id", runId);

  if (error) {
    redirect(`${back}?err=${encodeURIComponent(toThaiDbError(error))}`);
  }

  revalidatePath("/club");
  revalidatePath(back);
  redirect(`${back}?msg=${encodeURIComponent("ลบผลวิ่งแล้ว")}`);
}
