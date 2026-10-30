"use client";

import { G } from "@/data/glossary";
import { useDeferredValue, useMemo, useState } from "react";
import { analyzeRefinance, type RefinanceInput } from "@/lib/finance/refinance";
import { formatMonths } from "@/lib/finance/advisor";
import { rub } from "@/lib/format";
import { Card, DemoNote, NumberField, Stat } from "./ui";

export function Refinance({ startDate }: { startDate: string }) {
  const [v, setV] = useState<RefinanceInput>({
    balance: 4_000_000, currentRate: 19, remainingMonths: 180, currentInsurancePercent: 0.6,
    newRate: 15.5, newTermMonths: 180, newInsurancePercent: 0.6, switchCosts: 40_000,
    paymentType: "annuity", startDate,
  });
  const set = (patch: Partial<RefinanceInput>) => setV({ ...v, ...patch });
  const deferred = useDeferredValue(v);
  const r = useMemo(() => (deferred.balance > 0 && deferred.remainingMonths > 0 && deferred.newTermMonths > 0 ? analyzeRefinance(deferred) : null), [deferred]);
  const worth = r && r.saved.greaterThan(0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Сейчас</h2>
          <div className="grid gap-3">
            <NumberField label="Остаток долга" suffix="₽" value={v.balance} onChange={(balance) => set({ balance })} />
            <div className="grid gap-3 @sm:grid-cols-2">
              <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={v.currentRate} onChange={(currentRate) => set({ currentRate })} />
              <NumberField label="Осталось" suffix="мес." value={v.remainingMonths} max={480} onChange={(m) => set({ remainingMonths: Math.round(m) })} />
            </div>
            <NumberField label="Страховка, % от долга в год" info={G.insurancePercent} suffix="%" decimals={2} value={v.currentInsurancePercent} onChange={(currentInsurancePercent) => set({ currentInsurancePercent })} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">Предложение нового банка</h2>
          <div className="grid gap-3">
            <div className="grid gap-3 @sm:grid-cols-2">
              <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={v.newRate} onChange={(newRate) => set({ newRate })} />
              <NumberField label="Срок" suffix="мес." value={v.newTermMonths} max={480} onChange={(m) => set({ newTermMonths: Math.round(m) })} />
            </div>
            <NumberField label="Страховка, % от долга в год" info={G.insurancePercent} suffix="%" decimals={2} value={v.newInsurancePercent} onChange={(newInsurancePercent) => set({ newInsurancePercent })} />
            <NumberField label="Расходы на переход" info={G.switchCosts} suffix="₽" value={v.switchCosts} onChange={(switchCosts) => set({ switchCosts })} hint="Оценка, регистрация, нотариус, комиссии, новая страховка" />
          </div>
        </Card>
        <DemoNote />
      </div>

      {r && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 sm:p-6 ${worth ? "border-accent/40 bg-accent-soft" : "border-loss/40 bg-loss-soft"}`}>
            <p className="text-sm font-medium">{worth ? "Рефинансирование выгодно" : "Рефинансирование невыгодно"}</p>
            <p className={`mt-1 text-2xl font-bold sm:text-3xl ${worth ? "text-accent" : "text-loss"}`}>
              {worth ? `Экономия ${rub(r.saved)}` : `Потеря ${rub(r.saved.abs())}`}
            </p>
            <p className="mt-2 text-[15px]">
              {r.breakEvenMonth === null
                ? "Расходы на переход не окупятся за срок кредита."
                : r.breakEvenMonth === 0
                  ? "Расходов на переход нет — выгода начинается сразу."
                  : `Расходы на переход окупятся через ${formatMonths(r.breakEvenMonth)}. Если планируете погасить кредит раньше — выгода будет меньше.`}
              {v.newTermMonths > v.remainingMonths && " Срок нового кредита длиннее: платёж ниже, но часть выгоды съедают проценты за дополнительные месяцы."}
            </p>
          </div>
          <Card>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Платёж сейчас" value={rub(r.currentPayment)} />
              <Stat label="Платёж после" value={rub(r.newPayment)} tone={r.newPayment.lessThan(r.currentPayment) ? "good" : "loss"} />
              <Stat label="Осталось заплатить сейчас" value={rub(r.currentTotal)} sub="долг + проценты + страховки" />
              <Stat label="Заплатите после перехода" value={rub(r.newTotal)} sub="с учётом расходов на переход" />
              <Stat label="Проценты сейчас" value={rub(r.currentInterest)} tone="loss" />
              <Stat label="Проценты после" value={rub(r.newInterest)} tone="loss" />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
