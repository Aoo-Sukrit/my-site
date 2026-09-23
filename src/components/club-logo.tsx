import Image from "next/image";

type ClubLogoProps = {
  className?: string;
  /** ขนาดที่รูปถูกแสดงจริงในแต่ละ breakpoint ให้ next/image เลือกไฟล์ถูกขนาด */
  sizes: string;
  /** ใส่เมื่อรูปอยู่ครึ่งบนของจอ จะได้ไม่ต้องรอ lazy load */
  eager?: boolean;
};

export default function ClubLogo({ className, sizes, eager }: ClubLogoProps) {
  return (
    <Image
      src="/club-logo.jpg"
      alt="โลโก้คลับ Beer Now Run Later"
      width={720}
      height={720}
      sizes={sizes}
      className={className}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}
