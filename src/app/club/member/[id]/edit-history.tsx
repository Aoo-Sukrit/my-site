import { formatKm, thaiDateTime, thaiShortDate } from "@/lib/date";
import type { RunEdit } from "@/lib/supabase/types";

function readField(value: Record<string, unknown> | null, key: string) {
  const raw = value?.[key];
  return raw === null || raw === undefined ? null : String(raw);
}

/**
 * สรุปว่าการแก้ครั้งนั้นเปลี่ยนอะไรไปบ้าง
 *
 * old_value กับ new_value เก็บทั้งแถวเป็น jsonb เลยเทียบเฉพาะช่องที่คนสนใจ
 * ไม่ต้องโชว์ updated_at ที่เปลี่ยนทุกครั้งอยู่แล้ว
 */
function describe(edit: RunEdit): string[] {
  const before = edit.old_value;

  if (edit.action === "delete") {
    const km = readField(before, "distance_km");
    const ranOn = readField(before, "ran_on");
    return [
      `ลบผลวิ่ง ${km ? formatKm(km) : "?"} กม.` +
        (ranOn ? ` วันที่ ${thaiShortDate(ranOn)}` : ""),
    ];
  }

  const after = edit.new_value;
  const changes: string[] = [];

  const ranOnBefore = readField(before, "ran_on");
  const ranOnAfter = readField(after, "ran_on");
  if (ranOnBefore !== ranOnAfter && ranOnBefore && ranOnAfter) {
    changes.push(
      `วันที่ ${thaiShortDate(ranOnBefore)} → ${thaiShortDate(ranOnAfter)}`,
    );
  }

  const kmBefore = readField(before, "distance_km");
  const kmAfter = readField(after, "distance_km");
  if (kmBefore !== kmAfter && kmBefore && kmAfter) {
    changes.push(`ระยะ ${formatKm(kmBefore)} → ${formatKm(kmAfter)} กม.`);
  }

  const sourceBefore = readField(before, "source");
  const sourceAfter = readField(after, "source");
  if (sourceBefore !== sourceAfter) {
    changes.push(`แอป ${sourceBefore ?? "—"} → ${sourceAfter ?? "—"}`);
  }

  if (readField(before, "proof_url") !== readField(after, "proof_url")) {
    changes.push("เปลี่ยนรูปหลักฐาน");
  }

  if (readField(before, "note") !== readField(after, "note")) {
    changes.push("แก้หมายเหตุ");
  }

  return changes.length > 0 ? changes : ["แก้ไขข้อมูล"];
}

export default function EditHistory({
  edits,
  editorNames,
}: {
  edits: RunEdit[];
  editorNames: Map<string, string>;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">ประวัติการแก้</h2>
        <p className="text-sm text-muted">
          ทุกการแก้และการลบถูกบันทึกอัตโนมัติ สมาชิกทุกคนเห็นได้
        </p>
      </div>

      {edits.length === 0 ? (
        <p className="text-sm text-muted">ยังไม่มีการแก้ไข</p>
      ) : (
        <ul className="space-y-2">
          {edits.map((edit) => (
            <li
              key={edit.id}
              className="rounded-xl border border-border px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={
                    edit.action === "delete"
                      ? "rounded-full bg-accent-soft px-2 py-0.5 text-xs text-club-line"
                      : "rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong"
                  }
                >
                  {edit.action === "delete" ? "ลบ" : "แก้"}
                </span>
                <span className="text-xs text-muted">
                  {thaiDateTime(edit.edited_at)} ·{" "}
                  {edit.edited_by
                    ? (editorNames.get(edit.edited_by) ?? "ไม่ทราบชื่อ")
                    : "ระบบ"}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5 text-muted">
                {describe(edit).map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
