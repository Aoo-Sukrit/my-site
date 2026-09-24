import Avatar from "@/components/club/avatar";
import { SubmitButton } from "@/components/club/form-controls";
import { NICKNAME_MAX, NICKNAME_MIN } from "@/lib/club-limits";
import {
  PROFILE_STATUSES,
  STATUS_LABEL,
  type ProfileWithEmail,
} from "@/lib/supabase/types";

import { setAdminAction, setNicknameAction, setStatusAction } from "./actions";

function StatusBadge({ profile }: { profile: ProfileWithEmail }) {
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-strong">
      {STATUS_LABEL[profile.status]}
      {profile.is_admin ? " · แอดมิน" : ""}
    </span>
  );
}

/** ฉายากับอีเมลคู่กัน ไว้ยืนยันว่าคนที่กำลังจะกดอนุมัติคือใคร */
function Identity({
  profile,
  suffix,
}: {
  profile: ProfileWithEmail;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-display text-base font-medium">
        {profile.nickname}
        {suffix}
      </p>
      <p className="truncate text-xs text-muted" title={profile.email ?? ""}>
        {profile.email ?? "ไม่มีอีเมล"}
      </p>
    </div>
  );
}

/** การ์ดในคิวรออนุมัติ ปุ่มใหญ่สองปุ่ม จบในหน้าจอเดียว */
export function PendingCard({ profile }: { profile: ProfileWithEmail }) {
  return (
    <li className="space-y-4 rounded-2xl border border-club-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar src={profile.avatar_url} nickname={profile.nickname} />
        <Identity profile={profile} />
      </div>

      <p className="text-xs text-muted">
        สมัครเมื่อ{" "}
        {new Date(profile.created_at).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>

      <div className="flex flex-wrap gap-2">
        <form action={setStatusAction}>
          <input type="hidden" name="id" value={profile.id} />
          <input type="hidden" name="status" value="approved" />
          <SubmitButton pendingLabel="กำลังอนุมัติ…">อนุมัติ</SubmitButton>
        </form>

        <form action={setStatusAction}>
          <input type="hidden" name="id" value={profile.id} />
          <input type="hidden" name="status" value="blocked" />
          <SubmitButton variant="danger" pendingLabel="กำลังปฏิเสธ…">
            ปฏิเสธ
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}

/** การ์ดในรายชื่อสมาชิกทั้งหมด แก้ได้ทั้งฉายา สถานะ และสิทธิ์แอดมิน */
export function MemberCard({
  profile,
  isSelf,
}: {
  profile: ProfileWithEmail;
  isSelf: boolean;
}) {
  return (
    <li className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar src={profile.avatar_url} nickname={profile.nickname} />
        <Identity
          profile={profile}
          suffix={isSelf ? <span className="text-muted"> (คุณ)</span> : null}
        />
      </div>

      <StatusBadge profile={profile} />

      <form action={setNicknameAction} className="space-y-2">
        <input type="hidden" name="id" value={profile.id} />
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">ฉายา</span>
          <input
            name="nickname"
            defaultValue={profile.nickname}
            required
            minLength={NICKNAME_MIN}
            maxLength={NICKNAME_MAX}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-accent"
          />
        </label>
        <SubmitButton variant="ghost" pendingLabel="กำลังบันทึก…">
          บันทึกฉายา
        </SubmitButton>
      </form>

      <form action={setStatusAction} className="space-y-2">
        <input type="hidden" name="id" value={profile.id} />
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">สถานะ</span>
          <select
            name="status"
            defaultValue={profile.status}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-accent"
          >
            {PROFILE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton variant="ghost" pendingLabel="กำลังบันทึก…">
          บันทึกสถานะ
        </SubmitButton>
      </form>

      <form action={setAdminAction}>
        <input type="hidden" name="id" value={profile.id} />
        <input
          type="hidden"
          name="is_admin"
          value={profile.is_admin ? "false" : "true"}
        />
        <SubmitButton
          variant={profile.is_admin ? "danger" : "ghost"}
          pendingLabel="กำลังบันทึก…"
        >
          {profile.is_admin ? "ถอดสิทธิ์แอดมิน" : "ตั้งเป็นแอดมิน"}
        </SubmitButton>
      </form>
    </li>
  );
}
