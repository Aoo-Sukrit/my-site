import Avatar from "@/components/club/avatar";
import ConfirmSubmit from "@/components/club/confirm-submit";
import { getViewer } from "@/lib/auth";
import { getRuleSuggestions } from "@/lib/rule-suggestions";
import { relativeThai } from "@/lib/wall-rules";

import {
  deleteRuleSuggestionAction,
  voteRuleSuggestionAction,
} from "./actions";
import SuggestionComposer from "./suggestion-composer";
import VoteButton from "./vote-button";

/**
 * กล่อง "อยากแก้กติกาเดือนหน้า?" ท้ายแท็บคำท้า
 *
 * เพื่อนเขียนข้อเสนอแล้วกด 👍 ให้กัน ข้อที่คนเห็นด้วยเยอะขึ้นบนสุด
 * เจ้าของเว็บดูแล้วไปแก้กติกาเอง ระบบไม่ได้เปลี่ยนอะไรให้อัตโนมัติ
 *
 * โชว์เฉพาะของเดือนปัจจุบัน ขึ้นเดือนใหม่กระดานว่างเอง
 * ฝั่งที่เรียกจึงวางกล่องนี้เฉพาะตอนดูเดือนปัจจุบัน ไม่ใช่ตอนย้อนดูเดือนเก่า
 */
export default async function RuleSuggestions() {
  const [suggestions, viewer] = await Promise.all([
    getRuleSuggestions(),
    getViewer(),
  ]);
  const isAdmin = viewer?.profile.is_admin ?? false;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium">
          อยากแก้กติกาเดือนหน้า?
        </h2>
        <p className="text-sm text-muted">
          เสนอมาได้เลย แล้วกด 👍 ให้ข้อที่เห็นด้วย
          ข้อที่คนเห็นด้วยเยอะจะขึ้นบนสุด
        </p>
      </div>

      <SuggestionComposer />

      {suggestions.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted">
          ยังไม่มีใครเสนอ เป็นคนแรกสิ
        </p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <Avatar
                src={item.avatar_url}
                nickname={item.nickname}
                size={36}
              />

              <div className="min-w-0 flex-1 rounded-2xl bg-background px-3.5 py-2.5">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                  {item.nickname}
                  <span className="text-xs font-normal text-muted">
                    {relativeThai(item.created_at)}
                  </span>
                </p>
                {/* ข้อความล้วน ไม่ตีความเป็น HTML */}
                <p className="mt-0.5 text-sm break-words whitespace-pre-line">
                  {item.body}
                </p>

                {item.is_mine || isAdmin ? (
                  <form action={deleteRuleSuggestionAction} className="mt-1">
                    <input type="hidden" name="suggestion_id" value={item.id} />
                    <ConfirmSubmit
                      label="ลบ"
                      question="ลบข้อเสนอนี้ใช่ไหม 👍 ที่ได้มาจะหายไปด้วย"
                      confirmLabel="ใช่ ลบเลย"
                      pendingLabel="กำลังลบ…"
                      compact
                    />
                  </form>
                ) : null}
              </div>

              {/* ข้อของตัวเองกด 👍 ไม่ได้ (ฐานข้อมูลกันไว้ด้วย) โชว์แค่ตัวเลข */}
              {item.is_mine ? (
                <span
                  title="จำนวนคนที่เห็นด้วย"
                  className="inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center gap-1 rounded-full bg-accent-soft px-3 text-sm tabular-nums text-accent-strong"
                >
                  <span aria-hidden>👍</span>
                  {item.vote_count}
                </span>
              ) : (
                <form action={voteRuleSuggestionAction} className="shrink-0">
                  <input type="hidden" name="suggestion_id" value={item.id} />
                  <input
                    type="hidden"
                    name="on"
                    value={item.i_voted ? "false" : "true"}
                  />
                  <VoteButton count={item.vote_count} voted={item.i_voted} />
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
