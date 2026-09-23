import type { Metadata } from "next";

import ClubLogo from "@/components/club-logo";

export const metadata: Metadata = {
  title: "BEER NOW RUN LATER",
};

export default function ClubPage() {
  return (
    <div className="space-y-6">
      <ClubLogo
        className="w-40 rounded-2xl sm:w-48"
        sizes="(min-width: 640px) 192px, 160px"
        eager
      />
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          BEER NOW RUN LATER
        </h1>
        <p className="text-muted">กำลังย้ายตารางขึ้นเว็บอยู่ เดี๋ยวมา</p>
      </div>
    </div>
  );
}
