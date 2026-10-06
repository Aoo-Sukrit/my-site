"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { navLinks } from "@/lib/site";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  /**
   * บอกความสูงจริงของแถบนี้ให้ทั้งเว็บรู้ผ่านตัวแปร --site-header-h
   *
   * แถบเมนูของคลับต้องติดอยู่ "ใต้" แถบนี้ตอนเลื่อนจอ ซึ่ง CSS ล้วนทำไม่ได้
   * เพราะ sticky ต้องรู้ตัวเลข top ที่แน่นอน แต่ความสูงของแถบนี้ไม่คงที่
   * บนมือถือมันซ้อนสองบรรทัด (ชื่อหน้า + เมนู) ส่วนจอกว้างเหลือบรรทัดเดียว
   * และหน้า HOME ไม่มีชื่อหน้าจึงเตี้ยกว่าหน้าอื่น
   *
   * วัดเองแล้วเขียนลงตัวแปรจึงตรงเสมอ ไม่ว่าจอกว้างแค่ไหนหรืออยู่หน้าไหน
   */
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--site-header-h",
        `${element.offsetHeight}px`,
      );
    };

    publish();

    // ResizeObserver ไม่มีในเบราว์เซอร์เก่ามาก ถ้าไม่มีก็ใช้ค่าที่วัดครั้งแรกไป
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pathname]);

  // มุมซ้ายบนเป็นชื่อของหน้าที่เปิดอยู่ ไม่ใช่ชื่อเว็บ — หน้า HOME จึงปล่อยว่าง
  const pageTitle =
    navLinks.find((link) => isActive(pathname, link.href))?.headerTitle ?? "";

  return (
    <header
      ref={ref}
      className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
        {pageTitle ? (
          <p className="font-display text-base font-semibold tracking-tight sm:text-lg">
            {pageTitle}
          </p>
        ) : null}

        <nav aria-label="Main" className="sm:ml-auto">
          <ul className="-mx-2 flex items-center gap-1 overflow-x-auto text-[15px]">
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-3 py-2 tracking-wide whitespace-nowrap transition-colors ${
                      active
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted hover:bg-accent-soft hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
