import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";

import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "SUPABASE TEST",
  // หน้าชั่วคราว ไม่ต้องให้ Google เก็บ
  robots: { index: false, follow: false },
};

// ตารางที่ไม่มีอยู่จริง เราสนแค่ว่า Supabase ตอบกลับมาไหม ไม่ได้สนข้อมูล
const PROBE_TABLE = "__connection_check__";

// รหัสที่ PostgREST ตอบเมื่อหาตารางไม่เจอ ได้รหัสพวกนี้ = ต่อติดแล้ว
// เพราะแปลว่าเซิร์ฟเวอร์รับ key และตอบกลับมาได้
const TABLE_NOT_FOUND = new Set(["PGRST205", "PGRST106", "42P01"]);

type TestResult =
  | { status: "missing-env"; missing: string[] }
  | { status: "connected"; detail: string }
  | { status: "failed"; detail: string; hint: string };

function describeFailure(error: {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}) {
  return [
    `message: ${error.message}`,
    error.code ? `code: ${error.code}` : null,
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function guessCause(message: string, code: string) {
  const text = `${message} ${code}`.toLowerCase();
  if (text.includes("invalid api key") || text.includes("401")) {
    return "ดูเหมือน NEXT_PUBLIC_SUPABASE_ANON_KEY จะผิดหรือไม่ตรงกับโปรเจกต์";
  }
  if (text.includes("fetch failed") || text.includes("enotfound")) {
    return "ดูเหมือนต่อไปหา URL ไม่ได้ เช็ก NEXT_PUBLIC_SUPABASE_URL ว่าพิมพ์ถูกและโปรเจกต์ยังไม่ถูก pause";
  }
  return "ลองเทียบค่าใน .env.local กับหน้า Project Settings > API ของ Supabase อีกรอบ";
}

async function runConnectionTest(): Promise<TestResult> {
  const env = readSupabaseEnv();
  if (env.missing.length > 0) {
    return { status: "missing-env", missing: env.missing };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from(PROBE_TABLE).select("*").limit(1);

    if (!error) {
      return {
        status: "connected",
        detail: `ยิงไปที่ตาราง ${PROBE_TABLE} แล้วผ่านฉลุย (มีตารางนี้อยู่จริงด้วย)`,
      };
    }

    if (TABLE_NOT_FOUND.has(error.code ?? "")) {
      return {
        status: "connected",
        detail:
          `Supabase ตอบกลับมาว่าไม่มีตาราง ${PROBE_TABLE} ซึ่งเป็นคำตอบที่ถูก ` +
          `แปลว่า URL กับ anon key ใช้งานได้จริง`,
      };
    }

    return {
      status: "failed",
      detail: describeFailure(error),
      hint: guessCause(error.message, error.code ?? ""),
    };
  } catch (error) {
    unstable_rethrow(error);

    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      detail: message,
      hint: guessCause(message, ""),
    };
  }
}

export default async function SupabaseTestPage() {
  // บังคับให้หน้านี้เรนเดอร์ตอนมีคน request ไม่ใช่ตอน build
  // จะได้เห็นผลทดสอบสดทุกครั้งที่รีเฟรช
  await connection();

  const env = readSupabaseEnv();
  const result = await runConnectionTest();

  const badge = {
    "missing-env": { text: "ยังไม่ได้กรอกค่า", className: "bg-border" },
    connected: { text: "ต่อติด", className: "bg-club-line text-background" },
    failed: { text: "ต่อไม่ติด", className: "bg-club-line text-background" },
  }[result.status];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm tracking-[0.2em] text-accent-strong">
          TEMPORARY
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          ทดสอบการเชื่อมต่อ Supabase
        </h1>
        <p className="text-muted">
          หน้านี้ไว้เช็กว่าท่อต่อถึง Supabase แล้วหรือยัง ใช้เสร็จลบทิ้งได้เลย
          ที่ <code className="text-sm">src/app/club/test/</code>
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${badge.className}`}
          >
            {badge.text}
          </span>
          <span className="text-sm text-muted">
            ทดสอบเมื่อ {new Date().toLocaleString("th-TH")}
          </span>
        </div>

        {result.status === "missing-env" ? (
          <div className="space-y-2">
            <p>ยังขาดค่าพวกนี้ในไฟล์ .env.local:</p>
            <ul className="space-y-1">
              {result.missing.map((name) => (
                <li key={name} className="font-mono text-sm">
                  · {name}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              กรอกค่าแล้วต้องรีสตาร์ท dev server ด้วย ค่าพวกนี้ถูกอ่านตอนเริ่ม
              เซิร์ฟเวอร์ครั้งเดียว
            </p>
          </div>
        ) : null}

        {result.status === "connected" ? (
          <p className="text-muted">{result.detail}</p>
        ) : null}

        {result.status === "failed" ? (
          <div className="space-y-3">
            <p className="text-muted">{result.hint}</p>
            <pre className="overflow-x-auto rounded-xl border border-border bg-background p-4 text-xs whitespace-pre-wrap">
              {result.detail}
            </pre>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 rounded-2xl border border-border p-5 text-sm">
        <h2 className="font-display text-base font-medium">ค่าที่เซิร์ฟเวอร์อ่านได้</h2>
        <p className="font-mono break-all">
          NEXT_PUBLIC_SUPABASE_URL = {env.url || "(ว่าง)"}
        </p>
        <p className="font-mono">
          NEXT_PUBLIC_SUPABASE_ANON_KEY ={" "}
          {env.anonKey
            ? `(ตั้งค่าแล้ว ยาว ${env.anonKey.length} ตัวอักษร)`
            : "(ว่าง)"}
        </p>
        <p className="text-muted">
          ไม่แสดง key เต็มๆ ตรงนี้ ถึงมันจะเป็น anon key ที่เปิดเผยได้ก็ตาม
        </p>
      </section>

      <Link
        href="/club"
        className="inline-block rounded-full border border-border px-4 py-2 text-sm tracking-wide text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        ← กลับหน้า CLUB
      </Link>
    </div>
  );
}
