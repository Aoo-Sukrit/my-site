import Link from "next/link";

import BeerMug from "@/components/club/beer-mug";
import { BUBBLE_STYLES, shortenForBubble } from "@/lib/wall-rules";
import type { WallMessage } from "@/lib/supabase/types";

/**
 * หัวโปรไฟล์ตาม docs/mockups/member-profile.jpg
 *
 * พื้นหลังคือรูปโปรไฟล์ใบเดียวกันกับที่อยู่ข้างหน้า แต่เบลอจัดและจางลง
 * ได้สีที่เข้ากับรูปของแต่ละคนโดยไม่ต้องไปอ่านสีจากรูปจริง
 * ทับด้วยม่านสีพื้นอีกชั้น ไม่งั้นตัวหนังสือบนรูปสว่างๆ จะอ่านไม่ออก
 *
 * คนที่ยังไม่ลงรูปได้แก้วเบียร์สีทองกับตัวอักษรแรกของชื่อ แบบเดียวกับบนโพเดียม
 * ส่ง rank เป็น null เพื่อไม่ให้มีริบบิ้นอันดับติดมาด้วย
 */
export default function ProfileHeader({
  nickname,
  caption,
  avatarUrl,
  rankNo,
  monthLabel,
  bubbles,
}: {
  nickname: string;
  caption: string | null;
  avatarUrl: string | null;
  /** null เมื่อเดือนนี้ยังไม่มีระยะ ป้ายอันดับจะไม่ขึ้น */
  rankNo: number | null;
  monthLabel: string | null;
  /** ข้อความล่าสุดไม่เกิน 3 อัน ว่างได้ ถ้าว่างก็ไม่มีบับเบิล */
  bubbles: WallMessage[];
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border">
      {avatarUrl ? (
        <>
          {/* aria-hidden เพราะเป็นรูปเดียวกับที่อยู่ข้างหน้า ไม่ได้บอกอะไรเพิ่ม */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-background/70 dark:bg-background/75"
          />
        </>
      ) : (
        <span aria-hidden className="absolute inset-0 bg-accent-soft/60" />
      )}

      {/* ที่ว่างด้านบนมีไว้ให้บับเบิลลอย ถ้าไม่มีข้อความแซวก็ไม่ต้องเว้น
          ไม่งั้นการ์ดจะโล่งเป็นช่องว่างเปล่าๆ โดยไม่มีเหตุผล */}
      <div
        className={`relative flex items-end gap-4 p-4 sm:gap-6 sm:p-6 ${
          bubbles.length > 0 ? "pt-24 sm:pt-28" : ""
        }`}
      >
        <div className="w-32 shrink-0 sm:w-40">
          {avatarUrl ? (
            <div className="aspect-[5/8] w-full overflow-hidden rounded-2xl border-2 border-club-cream bg-accent-soft shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={`รูปโปรไฟล์ของ ${nickname}`}
                className="h-full w-full object-cover object-top"
              />
            </div>
          ) : (
            <BeerMug
              uid="profile"
              src={null}
              nickname={nickname}
              rank={null}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 pb-1">
          {rankNo !== null && monthLabel ? (
            <p className="inline-flex items-baseline gap-1.5 rounded-full bg-club-ink px-3 py-1 text-xs text-club-cream">
              <span>อันดับ</span>
              <span className="font-display text-sm font-semibold text-club-gold">
                {rankNo}
              </span>
              <span className="opacity-70">· {monthLabel}</span>
            </p>
          ) : null}

          <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {nickname}
          </h1>

          {caption ? (
            <p className="line-clamp-2 text-sm text-muted">{caption}</p>
          ) : null}
        </div>
      </div>

      {/* บับเบิลลอยทับทุกอย่าง วางเป็นชั้นของตัวเองที่กดทะลุไม่ได้
          ยกเว้นตัวบับเบิลเอง ไม่งั้นมันจะไปบังลิงก์ที่อยู่ข้างใต้ */}
      {bubbles.length > 0 ? (
        <div className="pointer-events-none absolute inset-0">
          {bubbles.slice(0, BUBBLE_STYLES.length).map((message, index) => {
            const style = BUBBLE_STYLES[index];
            return (
              <Link
                key={message.id}
                href="#wall"
                className={`pointer-events-auto absolute flex items-center gap-2 rounded-full border border-border py-1.5 pr-3 pl-1.5 shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.03] ${style.position} ${style.tone} ${style.tilt}`}
              >
                {message.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.author_avatar}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full border border-club-cream object-cover object-top"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-club-line text-[10px] font-medium text-background"
                  >
                    {message.author_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-xs leading-snug">
                  {shortenForBubble(message.body)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
