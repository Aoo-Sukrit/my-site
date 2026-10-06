import ConfirmSubmit from "@/components/club/confirm-submit";
import type { WallMessage } from "@/lib/supabase/types";

import { deleteWallMessageAction, toggleWallHiddenAction } from "./actions";
import WallComposer from "./wall-composer";

/**
 * กระดานแซว
 *
 * ช่องพิมพ์อยู่บนสุด ข้อความใหม่สุดอยู่บน ตาม mockup
 *
 * ข้อความแสดงเป็นข้อความธรรมดาเสมอ React ใส่ค่าใน JSX แบบ escape ให้อยู่แล้ว
 * จึงไม่มีทางที่ใครพิมพ์แท็กลงไปแล้วกลายเป็น HTML จริง
 * (ห้ามเปลี่ยนไปใช้ dangerouslySetInnerHTML ตรงนี้เด็ดขาด)
 *
 * เวลาแบบ "3 ชม." คำนวณมาจากฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็นข้อความสำเร็จรูป
 * ไม่ได้คำนวณในนี้ เพราะการเรียก Date.now() ตอน render ทำให้ผลไม่คงที่
 */
export default function WallBoard({
  ownerId,
  ownerName,
  messages,
  count,
  viewerName,
  viewerAvatar,
  viewerIsOwner,
}: {
  ownerId: string;
  ownerName: string;
  /** มาพร้อม timeLabel ที่คิดไว้แล้ว */
  messages: (WallMessage & { timeLabel: string })[];
  count: number;
  viewerName: string;
  viewerAvatar: string | null;
  /** เจ้าของกระดานเท่านั้นที่เห็นปุ่มซ่อน และเห็นข้อความที่ซ่อนอยู่ */
  viewerIsOwner: boolean;
}) {
  return (
    <section id="wall" className="scroll-mt-20 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium">กระดานแซว</h2>
        {count > 0 ? (
          <span className="text-sm text-muted">{count} ข้อความ</span>
        ) : null}
      </div>

      <WallComposer
        ownerId={ownerId}
        ownerName={ownerName}
        viewerAvatar={viewerAvatar}
        viewerName={viewerName}
      />

      {messages.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          ยังไม่มีใครแซวเลย เป็นคนแรกสิ
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="flex items-start gap-2.5">
              {message.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.author_avatar}
                  alt=""
                  loading="lazy"
                  className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-border object-cover object-top"
                />
              ) : (
                <span
                  aria-hidden
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent-strong"
                >
                  {message.author_name.slice(0, 1).toUpperCase()}
                </span>
              )}

              <div
                className={`min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 ${
                  message.hidden ? "opacity-55" : ""
                }`}
              >
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                  {message.author_name}
                  {message.hidden ? (
                    <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-normal text-muted">
                      ซ่อนอยู่
                    </span>
                  ) : null}
                </p>

                {/* ข้อความล้วน ขึ้นบรรทัดตามที่พิมพ์ แต่ไม่ตีความเป็น HTML */}
                <p className="mt-0.5 text-sm break-words whitespace-pre-line">
                  {message.body}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-muted">
                    {message.timeLabel}
                  </span>

                  {viewerIsOwner ? (
                    <form action={toggleWallHiddenAction}>
                      <input
                        type="hidden"
                        name="message_id"
                        value={message.id}
                      />
                      <input type="hidden" name="owner_id" value={ownerId} />
                      <input
                        type="hidden"
                        name="hidden"
                        value={message.hidden ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="text-xs text-muted underline transition-colors hover:text-foreground"
                      >
                        {message.hidden ? "เลิกซ่อน" : "ซ่อน"}
                      </button>
                    </form>
                  ) : null}

                  {message.can_delete ? (
                    <form action={deleteWallMessageAction}>
                      <input
                        type="hidden"
                        name="message_id"
                        value={message.id}
                      />
                      <input type="hidden" name="owner_id" value={ownerId} />
                      <ConfirmSubmit
                        label="ลบ"
                        question="ลบข้อความนี้ใช่ไหม ลบแล้วกู้คืนไม่ได้"
                        confirmLabel="ใช่ ลบเลย"
                        pendingLabel="กำลังลบ…"
                        compact
                      />
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
