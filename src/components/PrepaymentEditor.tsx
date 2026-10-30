"use client";

import { G } from "@/data/glossary";
import type { Prepayment } from "@/lib/finance/loan";
import { addMonths, formatRuMonth } from "@/lib/finance/dates";
import { NumberField, Segmented } from "./ui";

const KIND_LABEL = { once: "Разово", monthly: "Каждый месяц", yearly: "Раз в год" } as const;

export function PrepaymentEditor({
  items,
  onChange,
  startDate,
  termMonths,
}: {
  items: Prepayment[];
  onChange: (items: Prepayment[]) => void;
  startDate: string;
  termMonths: number;
}) {
  const update = (i: number, patch: Partial<Prepayment>) =>
    onChange(items.map((p, k) => (k === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted">Досрочных платежей нет. Добавьте разовый взнос или регулярную доплату — расчёт обновится сразу.</p>
      )}
      {items.map((p, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium">Досрочный платёж {i + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded-lg px-2 py-1 text-sm text-loss hover:bg-loss-soft">
              Удалить
            </button>
          </div>
          <div className="grid gap-4 @md:grid-cols-2">
            <Segmented
              label="Как часто"
              value={p.kind}
              onChange={(kind) => update(i, { kind, untilMonth: kind === "once" ? undefined : p.untilMonth ?? termMonths })}
              options={(["once", "monthly", "yearly"] as const).map((v) => ({ value: v, label: KIND_LABEL[v] }))}
            />
            <Segmented
              label="Что уменьшать" info={G.prepaymentMode}
              value={p.mode}
              onChange={(mode) => update(i, { mode })}
              options={[{ value: "term", label: "Срок" }, { value: "payment", label: "Платёж" }]}
            />
            <NumberField label="Сумма" suffix="₽" value={p.amount} onChange={(amount) => update(i, { amount })} />
            <NumberField
              label={p.kind === "once" ? "С каким платежом (№)" : "Начиная с платежа №"}
              value={p.month}
              min={1}
              max={termMonths}
              onChange={(month) => update(i, { month: Math.max(1, Math.round(month)) })}
              hint={formatRuMonth(addMonths(startDate, Math.max(1, p.month)))}
            />
            {p.kind !== "once" && (
              <NumberField
                label="До платежа № (включительно)"
                value={p.untilMonth ?? termMonths}
                min={1}
                max={termMonths}
                onChange={(untilMonth) => update(i, { untilMonth: Math.round(untilMonth) })}
                hint={formatRuMonth(addMonths(startDate, Math.max(1, p.untilMonth ?? termMonths)))}
              />
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange([...items, { kind: "monthly", amount: 5000, month: 1, untilMonth: termMonths, mode: "term" }])} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
          + Ежемесячная доплата
        </button>
        <button type="button" onClick={() => onChange([...items, { kind: "once", amount: 300_000, month: 12, mode: "term" }])} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
          + Разовый платёж
        </button>
        <button type="button" onClick={() => onChange([...items, { kind: "yearly", amount: 100_000, month: 12, untilMonth: termMonths, mode: "term" }])} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
          + Ежегодный платёж
        </button>
      </div>
    </div>
  );
}
