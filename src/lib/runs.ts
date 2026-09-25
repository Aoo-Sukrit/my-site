import { createSupabaseServerClient } from "./supabase/server";
import type {
  LeaderboardRow,
  Round,
  Run,
  RunEdit,
} from "./supabase/types";

export const PROOF_BUCKET = "proofs";
export const AVATAR_BUCKET = "avatars";
export const EDIT_WINDOW_HOURS = 24;

/**
 * รอบของเดือนปัจจุบัน ถ้ายังไม่มีฐานข้อมูลจะสร้างให้เอง
 *
 * เรียกผ่าน RPC ไม่ใช่ select ตรงๆ เพราะฟังก์ชันฝั่งฐานข้อมูลเป็นตัวตัดสิน
 * ว่า "เดือนนี้" คือเดือนอะไร โดยคิดตามเวลาไทย ถ้าฝั่งเว็บคำนวณเองจะมีโอกาส
 * เห็นไม่ตรงกันช่วงเปลี่ยนเดือน
 */
export async function getCurrentRound(): Promise<Round | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("current_round");
  return (data as Round | null) ?? null;
}

/**
 * รอบของเดือนที่วันนั้นอยู่ สร้างให้ถ้ายังไม่มี
 *
 * ใช้ตอนกรอกผลวิ่ง เพราะผลวิ่งต้องไปเข้ารอบของเดือนที่วิ่งจริง ไม่ใช่รอบ
 * ของเดือนปัจจุบัน คนที่วิ่งเย็นวันสิ้นเดือนแล้วมากรอกวันที่ 1 จึงยังนับถูกรอบ
 */
export async function getRoundForDate(isoDate: string): Promise<Round | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_for_date", { target: isoDate });
  return (data as Round | null) ?? null;
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("month_leaderboard");
  return (data ?? []) as LeaderboardRow[];
}

export async function getMemberRuns(
  memberId: string,
  roundId: string,
): Promise<Run[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("runs")
    .select("*")
    .eq("profile_id", memberId)
    .eq("round_id", roundId)
    .order("ran_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Run[]>();

  return data ?? [];
}

export async function getMemberEdits(memberId: string): Promise<RunEdit[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("run_edits")
    .select("*")
    .eq("profile_id", memberId)
    .order("edited_at", { ascending: false })
    .limit(50)
    .returns<RunEdit[]>();

  return data ?? [];
}

/**
 * ขอลิงก์ชั่วคราวสำหรับรูปหลักฐาน
 *
 * บัคเก็ต proofs เป็นแบบส่วนตัว จะเอา URL ไปแปะตรงๆ ไม่ได้ ต้องขอลิงก์
 * ที่มีลายเซ็นและวันหมดอายุทุกครั้งที่เรนเดอร์ ตั้งไว้ 1 ชั่วโมงพอ
 */
export async function signProofUrls(
  paths: string[],
): Promise<Map<string, string>> {
  return signStorageUrls(PROOF_BUCKET, paths);
}

/**
 * ลิงก์ชั่วคราวของรูปโปรไฟล์
 *
 * บัคเก็ต avatars ตั้งเป็น public ไว้ ลิงก์ตรงๆ จึงเปิดได้อยู่แล้วและปกติ
 * ไม่ต้องเซ็น แต่รูปสตอรี่ขอผ่านทางนี้ก่อน เพื่อให้ยังทำงานได้ถ้าวันหนึ่ง
 * เปลี่ยนบัคเก็ตเป็นส่วนตัว โดยไม่ต้องกลับมาแก้โค้ดตรงนั้นอีก
 */
export async function signAvatarUrls(
  paths: string[],
): Promise<Map<string, string>> {
  return signStorageUrls(AVATAR_BUCKET, paths);
}

async function signStorageUrls(
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return signed;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, 60 * 60);

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }

  return signed;
}

/**
 * ยังอยู่ในช่วง 24 ชั่วโมงที่แก้เองได้ไหม
 *
 * ใช้ตัดสินแค่ว่าจะโชว์ปุ่มแก้กับลบหรือเปล่า ตัวบังคับจริงคือ trigger
 * runs_enforce_edit_window ในฐานข้อมูล ตรงนี้พังก็ไม่ได้ทำให้กติกาหลุด
 */
export function withinEditWindow(run: Run): boolean {
  const created = new Date(run.created_at).getTime();
  return Date.now() - created < EDIT_WINDOW_HOURS * 60 * 60 * 1000;
}

/** เหลือเวลาแก้อีกกี่ชั่วโมง ปัดขึ้น ใช้บอกผู้ใช้ */
export function hoursLeftToEdit(run: Run): number {
  const created = new Date(run.created_at).getTime();
  const msLeft = created + EDIT_WINDOW_HOURS * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));
}
