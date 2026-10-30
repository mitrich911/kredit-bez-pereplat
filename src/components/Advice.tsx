import type { AdviceBlock } from "@/lib/finance/advisor";

const TONE = {
  info: "border-border bg-surface",
  good: "border-accent/40 bg-accent-soft",
  warn: "border-warn/40 bg-warn-soft",
} as const;

export function Advice({ blocks }: { blocks: AdviceBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <article key={i} className={`rounded-xl border p-4 ${TONE[b.tone]}`}>
          <h3 className="font-semibold">{b.title}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed">{b.text}</p>
        </article>
      ))}
      <p className="text-xs text-muted">
        Разбор собран автоматически из расчёта: каждая цифра посчитана по графику платежей, а не придумана. Это не индивидуальная инвестиционная рекомендация.
      </p>
    </div>
  );
}
