"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { rub, short } from "@/lib/format";

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" },
  labelStyle: { color: "var(--muted)" },
};

export function BalanceChart({ data, compare }: { data: { year: number; base: number; plan?: number }[]; compare: boolean }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Остаток долга по годам">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" {...axis} tickFormatter={(v) => `${v} г.`} />
          <YAxis {...axis} width={56} tickFormatter={short} />
          <Tooltip {...tooltipStyle} formatter={(v) => rub(Number(v))} labelFormatter={(l) => `${l}-й год`} />
          <Area type="monotone" dataKey="base" name="Без досрочных" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.12} strokeWidth={2} />
          {compare && <Area type="monotone" dataKey="plan" name="С досрочными" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} strokeWidth={2} />}
          {compare && <Legend wrapperStyle={{ fontSize: 13 }} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearSplitChart({ data }: { data: { year: number; interest: number; principal: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Проценты и основной долг по годам">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" {...axis} />
          <YAxis {...axis} width={56} tickFormatter={short} />
          <Tooltip {...tooltipStyle} formatter={(v) => rub(Number(v))} labelFormatter={(l) => `${l}-й год`} cursor={{ fill: "var(--surface-2)" }} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="interest" name="Проценты" stackId="a" fill="var(--chart-2)" />
          <Bar dataKey="principal" name="Долг" stackId="a" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Горизонтальная полоса «из чего состоит сумма» — без библиотеки, читается и без графики. */
export function CostBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-full" aria-hidden>
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-2 text-sm xl:grid-cols-2 xl:gap-x-6">
        {parts.filter((p) => p.value > 0).map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="text-muted">{p.label}</span>
            <span className="tabular ml-auto font-medium">{rub(p.value)}</span>
            <span className="tabular w-11 text-right text-xs text-muted">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
