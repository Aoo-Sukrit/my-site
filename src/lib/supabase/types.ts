export const PROFILE_STATUSES = [
  "pending",
  "approved",
  "blocked",
  "removed",
] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export type Profile = {
  id: string;
  nickname: string;
  caption: string | null;
  about: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * คอลัมน์ที่ผู้ใช้ทั่วไปอ่านได้
 *
 * ต้องระบุชื่อคอลัมน์เองแทนการใช้ * เพราะ supabase/migrations/20260924000001_schema.sql ข้อ 7 ถอนสิทธิ์ select
 * คอลัมน์ email ออกจาก role authenticated ไปแล้ว ถ้ายิง select * Postgres
 * จะตอบ permission denied for column email
 */
export const PROFILE_COLUMNS =
  "id, nickname, caption, about, avatar_url, status, is_admin, created_at, updated_at";

/** เฉพาะหน้าแอดมิน ได้มาจากฟังก์ชัน admin_member_list() เท่านั้น */
export type ProfileWithEmail = Profile & { email: string | null };

export const STATUS_LABEL: Record<ProfileStatus, string> = {
  pending: "รออนุมัติ",
  approved: "สมาชิก",
  blocked: "ถูกระงับ",
  removed: "เอาออกจากคลับแล้ว",
};

/** สถานะที่ยังไม่ถือว่าจบเรื่อง แอดมินอาจต้องกลับมาจัดการอีก */
export function isInactiveStatus(status: ProfileStatus) {
  return status === "blocked" || status === "removed";
}

export function isProfileStatus(value: unknown): value is ProfileStatus {
  return (
    typeof value === "string" &&
    (PROFILE_STATUSES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
//  ผลวิ่ง (supabase/migrations/20260925000003_runs.sql)
// ---------------------------------------------------------------------------

export type RoundStatus = "open" | "closed";

export type Round = {
  id: string;
  /** วันที่ 1 ของเดือนนั้น เช่น 2026-09-01 */
  month: string;
  status: RoundStatus;
  /** เริ่มให้ตั้งเป้าและโหวต แอดมินแก้ได้ ไม่ได้ฝังไว้ในโค้ด */
  target_opens_at: string;
  /** ปิดรับเป้าและโหวต หลังเวลานี้ผลถึงเปิดให้ทุกคนเห็น */
  target_locks_at: string;
  /**
   * เวลาตัดสินผลของรอบนี้ แอดมินเลื่อนได้จากหน้าแอดมิน
   * ค่าเริ่มต้นคือเที่ยงวันที่ 1 ของเดือนถัดไป เวลาไทย
   *
   * ค่าเดียวนี้คุมสี่อย่าง กรอกผลย้อนหลัง แก้ผลวิ่ง รางวัลพลิกเป็นได้ไปแล้ว
   * และการตัดสินคำท้า (supabase/migrations/20261001090000_results_at.sql)
   */
  results_at: string;
  created_at: string;
};

/** เดือนที่มีรอบอยู่จริง ใช้ทำตัวเลือกเดือน มาจาก round_months() */
export type RoundMonth = {
  month: string;
  results_at: string;
  is_current: boolean;
};

// ---------------------------------------------------------------------------
//  เกมตั้งเป้ารายเดือน (supabase/migrations/20260925000006_targets.sql)
//  ทุกชนิดข้างล่างมาจากฟังก์ชัน security definer ไม่ได้ query ตารางตรง
//  เพราะตาราง targets กับ target_votes ถูกปิดสิทธิ์ไว้ทั้งหมด
// ---------------------------------------------------------------------------

export type MyTargetState = {
  has_target: boolean;
  base_km: string | null;
  vote_count: number;
};

export type VotableMember = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  /** เป้าที่เขาตั้งไว้ เปิดให้เห็นได้ ต่างจากผลรวมโหวตที่ยังปิดตาอยู่ */
  base_km: string;
  /** ระยะจริงของเขาในรอบเดือนก่อน null เมื่อไม่มีข้อมูล */
  last_month_km: string | null;
};

export type MyVote = {
  subject_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  /** null ได้ ถ้าแอดมินรีเซ็ตเป้าของเขาไประหว่างรอบ */
  base_km: string | null;
  /** ค่าที่เรากดเอง ไม่ใช่ผลรวมของทุกคน */
  delta: number;
  created_at: string;
};

export type RoundTargetRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  base_km: string;
  total_delta: number;
  final_km: string;
  vote_count: number;
};

/** หนึ่งแถวคือหนึ่งโหวต มาจาก round_vote_breakdown() ซึ่งเปิดหลังเวลาเปิดผล */
export type VoteBreakdownRow = {
  subject_id: string;
  subject_nickname: string;
  subject_avatar_url: string | null;
  voter_id: string;
  voter_nickname: string;
  voter_avatar_url: string | null;
  delta: number;
};

export type PercentRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  base_km: string | null;
  final_km: string | null;
  total_km: string;
  percent: string | null;
  rank_no: number;
};

export type Run = {
  id: string;
  profile_id: string;
  round_id: string;
  ran_on: string;
  /** PostgREST ส่ง numeric กลับมาเป็น string เพื่อไม่ให้ความละเอียดหาย */
  distance_km: string;
  source: string;
  /** ที่อยู่ไฟล์ในบัคเก็ต proofs ไม่ใช่ URL เต็ม ต้องขอ signed url ก่อนแสดง */
  proof_url: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type RunEdit = {
  id: string;
  run_id: string;
  profile_id: string | null;
  edited_by: string | null;
  action: "update" | "delete";
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  edited_at: string;
};

/** หนึ่งแถวบนกระดาน มาจากฟังก์ชัน month_leaderboard() */
export type LeaderboardRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  total_km: string;
  run_count: number;
  rank_no: number;
};

/** แอปที่มาของผลวิ่ง เรียงตามที่เพื่อนๆ ใช้กันบ่อย */
export const RUN_SOURCES = [
  "Garmin",
  "Strava",
  "Suunto",
  "COROS",
  "Mi Fitness",
  "Samsung Health",
  "อื่นๆ",
] as const;

export type RunSource = (typeof RUN_SOURCES)[number];

export function isRunSource(value: unknown): value is RunSource {
  return (
    typeof value === "string" && (RUN_SOURCES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
//  ระบบรางวัล (20260930120000_prizes.sql)
//  มาจากฟังก์ชัน round_prizes() เท่านั้น ตาราง prizes ถูกปิดสิทธิ์ไว้หมด
// ---------------------------------------------------------------------------

export type PrizeRow = {
  prize_id: string;
  board: "distance" | "percent";
  rank_no: number | null;
  is_booby: boolean;
  /** null เมื่อยังปิดอุบและคนดูไม่ใช่คนให้ */
  title: string | null;
  detail: string | null;
  image_path: string | null;
  /** ยังปิดอุบอยู่ไหม ณ ตอนที่ถาม */
  is_secret: boolean;
  is_mine: boolean;
  revealed_at: string | null;
  created_at: string;
  sponsor_id: string;
  sponsor_nickname: string;
  sponsor_avatar_url: string | null;
};

// ---------------------------------------------------------------------------
//  คำท้า (20260930203000_challenges.sql)
//  มาจากฟังก์ชัน security definer เท่านั้น ตาราง challenges กับ
//  challenge_stakes ถูกปิดสิทธิ์ไว้หมด แม้ข้อมูลจะไม่ได้ปิดอุบก็ตาม
// ---------------------------------------------------------------------------

/** เวลาสำคัญของรอบเดือนหนึ่ง มาจาก round_deadlines() */
export type RoundDeadlines = {
  month: string;
  /** สิ้นวันสุดท้ายที่ยังท้า รับ หรือลงเบียร์เพิ่มได้ */
  lock_at: string;
  /** เวลาที่ถือว่าผลของเดือนนั้นนิ่งแล้ว ใช้ทั้งคำท้าและระบบรางวัล */
  settle_at: string;
  /** เที่ยงคืนขึ้นเดือนใหม่ ใช้เปิดของขวัญที่ปิดอุบ */
  month_end: string;
};

export type ChallengeRow = {
  challenge_id: string;
  round_month: string;
  challenger_id: string;
  challenger_nickname: string;
  challenger_avatar_url: string | null;
  runner_id: string;
  runner_nickname: string;
  runner_avatar_url: string | null;
  /** PostgREST ส่ง numeric กลับมาเป็น string เพื่อไม่ให้ความละเอียดหาย */
  target_km: string;
  /** ระยะของคนถูกท้า ณ วินาทีที่ถูกท้า */
  baseline_km: string;
  bottles: number;
  /** หนึ่งในเจ็ดแบบ ดู CHALLENGE_STATUS_LABEL ใน challenge-rules.ts */
  status: string;
  /** ระยะรวมทั้งเดือนของคนถูกท้า ตัวเดียวกับบนกระดานระยะรวม */
  runner_total_km: string;
  reach_bottles: number;
  miss_bottles: number;
  /** ข้างที่เราลงไว้ หรือ null เมื่อยังไม่ได้ลง */
  my_side: string | null;
  i_am_challenger: boolean;
  i_am_runner: boolean;
  lock_at: string;
  settle_at: string;
  created_at: string;
  decided_at: string | null;
};

export type ChallengeStakeRow = {
  challenge_id: string;
  profile_id: string;
  nickname: string;
  avatar_url: string | null;
  side: string;
  bottles: number;
  is_me: boolean;
  created_at: string;
};

/** คนที่ท้าได้ พร้อมระยะรวมตอนนี้ มาจาก challengeable_members() */
export type ChallengeableMember = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  total_km: string;
};

// ---------------------------------------------------------------------------
//  ระบบโพสต์ (20261001140000_posts.sql)
//  มาจากฟังก์ชัน security definer เท่านั้น ตาราง posts post_media
//  post_sections ถูกปิดสิทธิ์ไว้หมด เพราะโพสต์แบบลิงก์ลับต้องไม่มีทางหลุด
// ---------------------------------------------------------------------------

export type PostSection = {
  slug: string;
  title: string;
  kind: "blog" | "work" | "hobby";
  intro: string | null;
  cover_url: string | null;
  /** รูปแรกของโพสต์ล่าสุดในหมวด ใช้เป็นรูปปกเมื่อแอดมินยังไม่ได้ตั้งเอง */
  fallback_cover: string | null;
  /** ฐานข้อมูลคืนชื่อนี้ ไม่ใช่ position เพราะ Postgres ใช้ชื่อนั้นเป็นพารามิเตอร์ไม่ได้ */
  sort_order: number;
  hidden: boolean;
  /** จำนวนโพสต์ที่ "คนที่กำลังดูอยู่" เห็นได้ ไม่ใช่จำนวนทั้งหมด */
  post_count: number;
};

/** รูปหรือวิดีโอหนึ่งชิ้น url ของรูปคือที่อยู่ไฟล์ในบัคเก็ต ไม่ใช่ URL เต็ม */
export type PostMedia = {
  id: string;
  position: number;
  kind: "image" | "youtube";
  url: string | null;
  youtube_id: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

/** หนึ่งการ์ดในฟีด มาจาก post_feed() ซึ่งไม่คืนโพสต์ลิงก์ลับเลย */
export type PostCard = {
  id: string;
  title: string;
  body: string;
  section_slug: string;
  section_title: string;
  section_kind: "blog" | "work" | "hobby";
  visibility: string;
  status: string;
  /** ปักหมุดให้ขึ้นการ์ดใหญ่บนหน้า ABOUT */
  pinned: boolean;
  published_at: string | null;
  created_at: string;
  media_count: number;
  cover_kind: "image" | "youtube" | null;
  cover_url: string | null;
  cover_youtube: string | null;
};

/** โพสต์เต็ม มาจาก post_by_id() หรือ post_by_token() */
export type PostDetail = {
  id: string;
  title: string;
  body: string;
  section_slug: string;
  section_title: string;
  section_kind: "blog" | "work" | "hobby";
  visibility: string;
  status: string;
  published_at: string | null;
  created_at: string;
  /** คืนเฉพาะแอดมิน หรือตอนเข้ามาทางลิงก์ลับ */
  share_token: string | null;
  media: PostMedia[];
};

// ---------------------------------------------------------------------------
//  หน้า ABOUT (20261002090000_about.sql)
// ---------------------------------------------------------------------------

/** ข้อความสั้นหนึ่งชิ้นในแถบตัวเลขเด่น */
export type AboutStat = { value: string; label: string };

export type AboutProfile = {
  display_name: string | null;
  tagline: string | null;
  story: string | null;
  /** ที่อยู่ไฟล์ในบัคเก็ต post-media ไม่ใช่ URL เต็ม */
  avatar_url: string | null;
  chips: string[];
  line_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  strava_url: string | null;
  email: string | null;
  stats: AboutStat[];
};

/** รูปหนึ่งใบในแกลเลอรีของหมวด กดแล้วไปที่โพสต์ต้นทาง */
export type GalleryImage = {
  post_id: string;
  post_title: string;
  url: string;
  caption: string | null;
};

export type RunningStats = {
  year_km: string;
  month_km: string;
  month_rank: number | null;
  months: { month: string; km: string }[] | null;
};

// ---------------------------------------------------------------------------
//  หน้าแรก (20261002140000_home.sql)
// ---------------------------------------------------------------------------

export type HomeContent = {
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  intro: string | null;
  /** บรรทัด "ช่วงนี้ทำอะไรอยู่" ว่างไว้ได้ หน้าเว็บซ่อนให้เอง */
  now_line: string | null;
  club_blurb: string | null;
};

/** หัวข้อและประโยคใต้หัวข้อของหน้า BLOG */
export type BlogContent = {
  title: string;
  /** null เมื่อเว้นว่างไว้ หน้าเว็บซ่อนให้เอง */
  subtitle: string | null;
};

/** ตัวเลขสดของคลับเดือนปัจจุบัน สำหรับการ์ดบนหน้าแรก */
export type ClubSummary = {
  round_month: string;
  member_count: number;
  total_km: string;
  /** null เมื่อเดือนนี้ยังไม่มีใครกรอกผล */
  leader_nickname: string | null;
  leader_avatar_url: string | null;
  leader_km: string | null;
};
