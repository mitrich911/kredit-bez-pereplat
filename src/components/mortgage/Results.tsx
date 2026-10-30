"use client";

import { G } from "@/data/glossary";
import type { MortgageResult, PrepaymentEffect } from "@/lib/finance/mortgage";
import { formatInRuMonth, formatRuMonth } from "@/lib/finance/dates";
import { formatMonths } from "@/lib/finance/advisor";
import { rub, pct } from "@/lib/format";
import { Card, Stat } from "../ui";
import { BalanceChart, CostBar, YearSplitChart } from "../charts";

export function Summary({ price, down, result }: { price: number; down: number; result: MortgageResult }) {
  const s = result.schedule;
  return (
    <Card>
      <h2 className="text-lg font-bold">Сколько вы заплатите на самом деле</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <Stat label="Ежемесячный платёж" value={rub(s.firstPayment)} sub="первый платёж по графику" />
        <Stat label="Переплата" info={G.overpayment} value={rub(result.overpayment)} tone="loss" sub="проценты + страховки + комиссии" />
        <Stat label="Полная стоимость покупки" info={G.fullCost} value={rub(result.fullCost)} sub={`при цене ${rub(price)}`} />
        <Stat label="ПСК (оценка)" info={G.psk} value={result.psk === null ? "—" : pct(result.psk, 3)} sub="с учётом введённых расходов" />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">Из чего складывается сумма</p>
        <CostBar
          parts={[
            { label: "Первоначальный взнос", value: down, color: "var(--chart-3)" },
            { label: "Кредит (сам долг)", value: result.loanAmount.toNumber(), color: "var(--chart-1)" },
            { label: "Проценты банку", value: s.totalInterest.toNumber(), color: "var(--chart-2)" },
            { label: "Страховки", value: result.insurance.toNumber(), color: "var(--chart-4)" },
            { label: "Комиссии и расходы", value: result.fees.toNumber(), color: "var(--muted)" },
          ]}
        />
      </div>
      <p className="mt-4 text-sm text-muted">
        Последний платёж — {formatRuMonth(s.payoffDate)}, всего {s.months} платежей ({formatMonths(s.months)}).
      </p>
    </Card>
  );
}

export function PrepaymentSummary({ effect }: { effect: PrepaymentEffect }) {
  if (effect.withPrepayments.schedule.totalExtra.isZero()) return null;
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4 sm:p-6">
      <p className="text-sm font-medium text-accent">С вашими досрочными платежами</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl">
        Экономия {rub(effect.totalSaved)}
      </p>
      <p className="mt-2 text-[15px]">
        {effect.monthsSaved > 0
          ? `Кредит закроется на ${formatMonths(effect.monthsSaved)} раньше — ${formatInRuMonth(effect.withPrepayments.schedule.payoffDate)}. `
          : `Срок прежний, платёж снизится до ${rub(effect.paymentAfter)}. `}
        Проценты меньше на {rub(effect.interestSaved)}
        {effect.insuranceSaved.greaterThan(0) ? `, страховки — на ${rub(effect.insuranceSaved)}` : ""}. Досрочно вы внесёте {rub(effect.withPrepayments.schedule.totalExtra)}.
      </p>
    </div>
  );
}

export function MortgageCharts({ effect }: { effect: PrepaymentEffect }) {
  const compare = !effect.withPrepayments.schedule.totalExtra.isZero();
  const base = effect.base.years;
  const plan = effect.withPrepayments.years;
  const balance = [{ year: 0, base: effect.base.loanAmount.toNumber(), plan: effect.base.loanAmount.toNumber() }].concat(
    base.map((y, i) => ({ year: y.year, base: y.balanceEnd.toNumber(), plan: plan[i]?.balanceEnd.toNumber() ?? 0 })),
  );
  const split = (compare ? plan : base).map((y) => ({
    year: y.year,
    interest: Math.round(y.interest.toNumber()),
    principal: Math.round(y.principal.plus(y.extra).toNumber()),
  }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="font-semibold">Остаток долга</h3>
        <p className="mb-3 text-sm text-muted">Чем быстрее падает линия, тем меньше процентов вы платите</p>
        <BalanceChart data={balance} compare={compare} />
      </Card>
      <Card>
        <h3 className="font-semibold">Куда уходят платежи по годам</h3>
        <p className="mb-3 text-sm text-muted">В первые годы большая часть платежа — проценты</p>
        <YearSplitChart data={split} />
      </Card>
    </div>
  );
}
