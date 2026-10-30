import { site } from "@/lib/site";

/**
 * Место для партнёрского предложения. Выключено, пока NEXT_PUBLIC_PARTNERS !== "on".
 * Всегда стоит после результатов и подписано как реклама — расчёт от него не зависит.
 */
export function PartnerSlot({ topic }: { topic: string }) {
  if (!site.partnersEnabled) return null;
  return (
    <aside aria-label="Реклама" className="mx-auto mt-10 max-w-6xl px-4">
      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Реклама · {topic}</p>
        <p className="mt-1 text-sm text-muted">Партнёрское предложение. Не влияет на результаты расчёта.</p>
      </div>
    </aside>
  );
}
