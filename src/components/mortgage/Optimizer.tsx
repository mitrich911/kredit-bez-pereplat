"use client";

import { G } from "@/data/glossary";
import type { Constraints, Optimization } from "@/lib/finance/optimizer";
import { formatMonths } from "@/lib/finance/advisor";
import { rub } from "@/lib/format";
import { NumberField } from "../ui";

export function ConstraintsForm({ value, onChange }: { value: Constraints; onChange: (c: Constraints) => void }) {
  const set = (patch: Partial<Constraints>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 @md:grid-cols-2">
      <NumberField label="Готов доплачивать в месяц" info={G.monthlyExtra} suffix="₽" value={value.monthlyExtra} onChange={(monthlyExtra) => set({ monthlyExtra })} hint="Сверх обычного платежа, без ущерба для жизни" />
      <NumberField label="Доход семьи в месяц" info={G.income} suffix="₽" value={value.monthlyIncome} onChange={(monthlyIncome) => set({ monthlyIncome })} hint="Необязательно. Нужен, чтобы не советовать непосильную нагрузку" />
      <NumberField label="Сбережения сейчас" suffix="₽" value={value.savings} onChange={(savings) => set({ savings })} />
      <NumberField label="Неприкосновенный резерв" info={G.reserve} suffix="₽" value={value.reserve} onChange={(reserve) => set({ reserve })} hint="Подушка на 3–6 месяцев расходов — её не трогаем" />
    </div>
  );
}

export function ScenarioTable({ opt }: { opt: Optimization }) {
  return (
    <div className="space-y-2">
      {opt.scenarios.map((s) => {
        const isBest = s.id === opt.best.id && s.id !== "base";
        return (
          <div
            key={s.id}
            className={`rounded-xl border p-4 ${isBest ? "border-accent bg-accent-soft" : "border-border"} ${s.feasible ? "" : "opacity-60"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {s.title}
                  {isBest && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-ink">Лучший при вашем бюджете</span>}
                </p>
                <p className="text-sm text-muted">{s.description}</p>
              </div>
              <p className={`tabular text-lg font-bold ${s.saved.greaterThan(0) ? "text-accent" : ""}`}>
                {s.id === "base" ? rub(s.result.overpayment) : s.saved.greaterThan(0) ? `−${rub(s.saved)}` : rub(0)}
              </p>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Платёж до</dt><dd className="tabular">{rub(s.maxMonthlyLoad)}</dd></div>
              <div><dt className="text-muted">Срок</dt><dd>{formatMonths(s.result.schedule.months)}</dd></div>
              <div><dt className="text-muted">Быстрее на</dt><dd>{s.monthsSaved > 0 ? formatMonths(s.monthsSaved) : "—"}</dd></div>
              <div><dt className="text-muted">Доля дохода</dt><dd>{s.loadShare === null ? "—" : `${s.loadShare}%`}</dd></div>
            </dl>
            {s.issue && <p className="mt-2 text-sm text-loss">{s.issue}</p>}
          </div>
        );
      })}
      <p className="text-xs text-muted">Для «Платить по графику» показана полная переплата; для остальных — сколько вы сэкономите относительно неё.</p>
    </div>
  );
}

export function TermTable({ rows, current }: { rows: { years: number; payment: { toNumber(): number }; overpayment: { toNumber(): number } }[]; current: number }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="tabular w-full min-w-[420px] text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-border">
            <th className="px-4 py-2 font-medium sm:px-2">Срок</th>
            <th className="px-2 py-2 text-right font-medium">Платёж</th>
            <th className="px-4 py-2 text-right font-medium sm:px-2">Переплата</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.years} className={`border-b border-border/60 ${r.years * 12 === current ? "bg-surface-2 font-semibold" : ""}`}>
              <td className="px-4 py-2 sm:px-2">{formatMonths(r.years * 12)}</td>
              <td className="px-2 py-2 text-right">{rub(r.payment)}</td>
              <td className="px-4 py-2 text-right text-loss sm:px-2">{rub(r.overpayment)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
