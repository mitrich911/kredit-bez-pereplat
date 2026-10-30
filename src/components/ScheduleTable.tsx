"use client";

import { useState } from "react";
import type { ScheduleRow } from "@/lib/finance/loan";
import { formatRuDate } from "@/lib/finance/dates";
import { rubKop } from "@/lib/format";

function toCsv(rows: ScheduleRow[]): string {
  const head = "№;Дата;Платёж;Проценты;Основной долг;Досрочно;Остаток";
  const body = rows.map((r) =>
    [r.n, r.date, r.payment, r.interest, r.principal, r.extra, r.balance]
      .map((v) => (typeof v === "object" ? v.toFixed(2).replace(".", ",") : v))
      .join(";"),
  );
  return "﻿" + [head, ...body].join("\n");
}

export function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 24);

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "grafik-platezhey.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="tabular w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-medium sm:px-2">№</th>
              <th className="px-2 py-2 font-medium">Дата</th>
              <th className="px-2 py-2 text-right font-medium">Платёж</th>
              <th className="px-2 py-2 text-right font-medium">Проценты</th>
              <th className="px-2 py-2 text-right font-medium">Долг</th>
              <th className="px-2 py-2 text-right font-medium">Досрочно</th>
              <th className="px-4 py-2 text-right font-medium sm:px-2">Остаток</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.n} className={`border-b border-border/60 ${r.extra.greaterThan(0) ? "bg-accent-soft" : ""}`}>
                <td className="px-4 py-2 text-muted sm:px-2">{r.n}</td>
                <td className="px-2 py-2 whitespace-nowrap">{formatRuDate(r.date)}</td>
                <td className="px-2 py-2 text-right">{rubKop(r.payment)}</td>
                <td className="px-2 py-2 text-right text-loss">{rubKop(r.interest)}</td>
                <td className="px-2 py-2 text-right">{rubKop(r.principal)}</td>
                <td className="px-2 py-2 text-right text-accent">{r.extra.greaterThan(0) ? rubKop(r.extra) : "—"}</td>
                <td className="px-4 py-2 text-right sm:px-2">{rubKop(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.length > 24 && (
          <button type="button" onClick={() => setAll(!all)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
            {all ? "Свернуть" : `Показать все ${rows.length} платежей`}
          </button>
        )}
        <button type="button" onClick={download} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
          Скачать график (CSV для Excel)
        </button>
      </div>
    </div>
  );
}
