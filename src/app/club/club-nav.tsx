"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  clubChips,
  hideClubNav,
  isAccountActive,
  isChipActive,
} from "@/lib/club-nav-rules";

import { logoutAction } from "./actions";

/**
 * แถบเมนูของคลับ ติดอยู่ใต้เมนูหลักตอนเลื่อนจอ
 *
 * ของเดิมเมนูพวกนี้อยู่ท้ายหน้า /club ต้องเลื่อนผ่านกระดานทั้งใบถึงจะเจอ
 * เพื่อนหลายคนเลยไม่รู้ว่ามีหน้าอื่นอยู่
 *
 * เป็น client component เพราะต้องรู้ว่าตอนนี้อยู่หน้าไหนถึงจะไฮไลต์ชิปถูกใบ
 * และต้องเปิดปิดเมนูบัญชีได้ ส่วนข้อมูลคนที่ล็อกอินรับมาทางพรอพจาก layout
 * ซึ่งเป็น Server Component จะได้ไม่ต้องยิงถามฐานข้อมูลจากฝั่งเบราว์เซอร์
 *
 * ซ่อนตัวเองในหน้าที่ยังไม่ผ่านประตู (ล็อกอิน สมัคร รออนุมัติ) เพราะเมนูพาไป
 * หน้าที่คนยังเข้าไม่ได้อยู่ดี
 */

export default function ClubNav({
  userId,
  nickname,
  avatarUrl,
  isAdmin,
}: {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    // pointerdown ไม่ใช่ click เพราะบนมือถือ click มาช้ากว่าและบางทีไม่มาเลย
    // ถ้าแตะแล้วนิ้วขยับนิดหน่อย
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (hideClubNav(pathname)) return null;

  const chips = clubChips();
  const onMyPages = isAccountActive(pathname, userId);

  return (
    // top อิงความสูงจริงของเมนูหลักที่ SiteHeader วัดแล้วเขียนไว้ให้
    // ค่าสำรอง 3.5rem ใช้ตอนจังหวะแรกก่อน JS จะทำงาน จะได้ไม่กระโดด
    //
    // -mt ดึงขึ้นไปลบระยะ py ด้านบนของ <main> ในโครงหลัก ไม่งั้นแถบนี้จะลอย
    // ห่างจากเมนูหลักลงมา 40px แล้วตอนเลื่อนจอจะเห็นเนื้อหาไหลผ่านช่องว่างนั้น
    <div className="sticky top-[var(--site-header-h,3.5rem)] z-10 -mx-5 -mt-10 mb-6 border-b border-border bg-background/85 px-5 backdrop-blur sm:-mt-14 sm:mb-8">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-1.5 py-2">
        {/* ชิปสามใบพอดีจอ 375px อยู่แล้ว overflow-x-auto เผื่อไว้สำหรับเครื่อง
            ที่ตั้งฟอนต์ใหญ่กว่าปกติ ซึ่งจะทำให้ล้นได้ no-scrollbar ซ่อนแถบเลื่อน
            ที่ไม่งั้นจะโผล่เป็นเส้นใต้แถว แต่ยังปัดเลื่อนได้ตามปกติ */}
        <nav aria-label="เมนูคลับ" className="min-w-0 flex-1">
          <ul className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
            {chips.map((chip) => {
              const active = isChipActive(pathname, chip);

              return (
                <li key={chip.href}>
                  <Link
                    href={chip.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                      active
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted hover:bg-accent-soft hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="เมนูบัญชี"
            aria-current={onMyPages ? "page" : undefined}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-accent-soft"
          >
            {/* อยู่หน้าของตัวเองจะมีวงแหวนรอบรูป แทนการไฮไลต์ชิป
                เพราะสองหน้านั้นไม่มีชิปของตัวเองอยู่ในแถบแล้ว */}
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                onMyPages ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
              }`}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full border border-border object-cover object-top"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent-strong"
                >
                  {nickname.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
          </button>

          {open ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
            >
              <p className="truncate border-b border-border px-4 py-2 text-xs text-muted">
                {nickname}
              </p>

              {/* ปิดเมนูตอนกดเอง ไม่ได้รอให้ effect มาปิดตอนเปลี่ยนหน้า
                  เพราะการสั่ง setState จาก effect ทำให้วาดสองรอบโดยไม่จำเป็น
                  (กฎ react-hooks/set-state-in-effect) */}
              <MenuLink href="/club/me" onSelect={() => setOpen(false)}>
                โปรไฟล์ของฉัน
              </MenuLink>
              <MenuLink
                href={`/club/member/${userId}`}
                onSelect={() => setOpen(false)}
              >
                ผลวิ่งของฉัน
              </MenuLink>
              {isAdmin ? (
                <MenuLink href="/club/admin" onSelect={() => setOpen(false)}>
                  จัดการสมาชิก
                </MenuLink>
              ) : null}

              <form action={logoutAction} className="border-t border-border">
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center px-4 text-left text-sm text-muted transition-colors hover:bg-accent-soft hover:text-foreground"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** แถวในเมนูบัญชี สูง 44px ตามขนาดที่นิ้วจิ้มไม่พลาด */
function MenuLink({
  href,
  children,
  onSelect,
}: {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex min-h-11 items-center px-4 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-foreground"
    >
      {children}
    </Link>
  );
}
