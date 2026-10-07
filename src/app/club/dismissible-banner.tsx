"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * แถบประกาศที่กด × ปิดได้ แล้วจำไว้ในเครื่องว่าปิดไปแล้ว
 *
 * ใช้กับแถบ "ผลเดือนที่แล้วออกแล้ว" บนหน้ากระดาน storageKey ต้องผูกกับเดือน
 * ปิดของเดือนกันยายนไปแล้ว เดือนตุลาคมจะยังขึ้นตามปกติ
 *
 * อ่าน localStorage ผ่าน useSyncExternalStore ไม่ใช่ useEffect + setState
 * เพราะกฎ react-hooks/set-state-in-effect ของโปรเจกต์ และฝั่งเซิร์ฟเวอร์
 * (getServerSnapshot) ตอบว่า "ยังไม่ได้ปิด" เสมอ HTML แรกจึงตรงกันทั้งสองฝั่ง
 *
 * localStorage อาจใช้ไม่ได้ (โหมดส่วนตัวของ Safari บางรุ่น หรือปิดคุกกี้)
 * ทุกครั้งที่แตะจึงครอบ try/catch ไว้ ถ้าจำไม่ได้ ก็แค่ซ่อนในหน้านี้ไปก่อน
 */

/** event ภายในหน้า บอก component ตัวอื่นที่ใช้ key เดียวกันว่ามีคนกดปิดแล้ว */
const DISMISS_EVENT = "club-banner-dismiss";

function readDismissed(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

export default function DismissibleBanner({
  storageKey,
  label,
  children,
}: {
  storageKey: string;
  /** สิ่งที่โปรแกรมอ่านจอพูดตอนโฟกัสปุ่ม × */
  label: string;
  children: React.ReactNode;
}) {
  const remembered = useSyncExternalStore(
    subscribe,
    () => readDismissed(storageKey),
    () => false,
  );
  // กดปิดแล้วแต่เครื่องจำไม่ได้ ก็ยังต้องหายไปทันทีในหน้านี้
  const [closedHere, setClosedHere] = useState(false);

  if (remembered || closedHere) return null;

  function dismiss() {
    setClosedHere(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // จำไม่ได้ก็ไม่เป็นไร รอบหน้าแถบจะกลับมาอีกครั้ง
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={dismiss}
        aria-label={label}
        className="absolute top-1/2 right-1.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-xl leading-none text-muted transition hover:bg-accent-soft hover:text-foreground active:scale-90"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
