import type { ReactNode } from "react";

export function ToolMetricCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="panel-plate rounded-[22px] px-4 py-4">
      <p className="eyebrow">{label}</p>
      <div className="mt-3 text-3xl font-semibold text-ink">{value}</div>
    </div>
  );
}

export function ToolNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-[var(--warning)]/16 bg-[color:rgba(180,79,50,0.08)] text-ink"
      : tone === "success"
        ? "border-[var(--signal)]/16 bg-[color:rgba(31,151,134,0.08)] text-ink"
        : "border-black/6 bg-white/55 text-ink/72";

  return (
    <div className={`rounded-[20px] border px-4 py-3 text-sm leading-6 ${toneClass}`}>
      {children}
    </div>
  );
}

export function ToolLog({
  emptyMessage,
  lines,
}: {
  emptyMessage: string;
  lines: string[];
}) {
  return (
    <div className="panel-shell rounded-[28px] p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-white/42">Run Log</p>
          <p className="display-title text-3xl">Console</p>
        </div>
        <div className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
          {lines.length} lines
        </div>
      </div>

      <div className="mt-4 steel-inset min-h-[260px] rounded-[24px] p-4">
        {lines.length === 0 ? (
          <p className="text-sm leading-6 text-white/52">{emptyMessage}</p>
        ) : (
          <pre className="bench-scroll max-h-[440px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-white/78">
            {lines.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}
