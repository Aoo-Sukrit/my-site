"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navLinks, site } from "@/lib/site";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight transition-colors hover:text-accent"
        >
          {site.name}
        </Link>

        <nav aria-label="เมนูหลัก">
          <ul className="-mx-2 flex items-center gap-1 overflow-x-auto text-[15px]">
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-3 py-2 whitespace-nowrap transition-colors ${
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
