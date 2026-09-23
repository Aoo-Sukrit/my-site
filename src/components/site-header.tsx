"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navLinks } from "@/lib/site";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function SiteHeader() {
  const pathname = usePathname();

  // มุมซ้ายบนเป็นชื่อของหน้าที่เปิดอยู่ ไม่ใช่ชื่อเว็บ — หน้า HOME จึงปล่อยว่าง
  const pageTitle =
    navLinks.find((link) => isActive(pathname, link.href))?.headerTitle ?? "";

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
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
