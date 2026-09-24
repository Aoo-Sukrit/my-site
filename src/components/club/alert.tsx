type AlertProps = {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
};

const TONE_CLASS: Record<AlertProps["tone"], string> = {
  error: "border-club-line bg-accent-soft text-foreground",
  success: "border-accent bg-accent-soft text-foreground",
  info: "border-border bg-surface text-muted",
};

export default function Alert({ tone, children }: AlertProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASS[tone]}`}
    >
      {children}
    </p>
  );
}
