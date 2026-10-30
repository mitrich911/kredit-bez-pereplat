"use client";

import { G } from "@/data/glossary";
import { useDeferredValue, useMemo, useState } from "react";
import { comparePurchase, type PurchaseInput } from "@/lib/finance/purchase";
import { formatMonths } from "@/lib/finance/advisor";
import { formatRuDate } from "@/lib/finance/dates";
import { WB_CASH_NOTE } from "@/data/bank-offers";
import { rub, pct } from "@/lib/format";
import { Card, DemoNote, Details, NumberField } from "./ui";
import { useBrowserStartDate } from "@/lib/use-browser-start-date";

type Credit = NonNullable<PurchaseInput["credit"]>;
type Inst = NonNullable<PurchaseInput["installment"]>;
type Saving = NonNullable<PurchaseInput["saving"]>;

export function PurchaseCalculator({ startDate }: { startDate: string }) {
  const currentStartDate = useBrowserStartDate(startDate);
  const [price, setPrice] = useState(150_000);
  const [yieldPct, setYield] = useState(12);
  const [inflation, setInflation] = useState(7);
  const [credit, setCredit] = useState<Credit>({ annualRate: 25, termMonths: 12, oneTimeFees: 0, monthlyFees: 0, extraServices: 0 });
  const [inst, setInst] = useState<Inst>({ price: 165_000, termMonths: 12, downPayment: 0, oneTimeFee: 0, monthlyFee: 0, extraServices: 5_000 });
  const [saving, setSaving] = useState<Saving>({ monthlyAmount: 15_000, alreadySaved: 30_000 });

  const d = useDeferredValue({ price, yieldPct, inflation, credit, inst, saving });
  const options = useMemo(
    () => (d.price > 0 ? comparePurchase({ cashPrice: d.price, savingsYield: d.yieldPct, priceInflation: d.inflation, startDate: currentStartDate, credit: d.credit.termMonths > 0 ? d.credit : undefined, installment: d.inst.termMonths > 0 ? d.inst : undefined, saving: d.saving }) : []),
    [d, currentStartDate],
  );
  const cheapest = options.length ? options.reduce((a, o) => (o.presentValue.lessThan(a.presentValue) ? o : a)) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Покупка</h2>
          <div className="grid gap-3">
            <NumberField label="Цена при оплате сразу" suffix="₽" value={price} onChange={setPrice} hint="С учётом скидки за оплату сразу, если она есть" />
            <div className="grid gap-3 @sm:grid-cols-2">
              <NumberField label="Доходность сбережений" info={G.savingsYield} suffix="%" decimals={1} value={yieldPct} onChange={setYield} />
              <NumberField label="Рост цены товара" info={G.priceInflation} suffix="%/год" decimals={1} value={inflation} onChange={setInflation} />
            </div>
          </div>
        </Card>
        <Details title="Рассрочка" open>
          <NumberField label="Цена в рассрочку" info={G.installmentPrice} suffix="₽" value={inst.price} onChange={(p) => setInst({ ...inst, price: p })} hint="Часто выше цены за наличные" />
          <NumberField label="Срок" suffix="мес." value={inst.termMonths} max={60} onChange={(t) => setInst({ ...inst, termMonths: Math.round(t) })} />
          <NumberField label="Первый взнос" suffix="₽" value={inst.downPayment} onChange={(v) => setInst({ ...inst, downPayment: v })} />
          <NumberField label="Разовая комиссия" suffix="₽" value={inst.oneTimeFee} onChange={(v) => setInst({ ...inst, oneTimeFee: v })} />
          <NumberField label="Плата в месяц (подписка, СМС)" info={G.installmentFee} suffix="₽" value={inst.monthlyFee} onChange={(v) => setInst({ ...inst, monthlyFee: v })} />
          <NumberField label="Страховки и сервисы" suffix="₽" value={inst.extraServices} onChange={(v) => setInst({ ...inst, extraServices: v })} />
        </Details>
        <Details title="Кредит">
          <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={credit.annualRate} onChange={(v) => setCredit({ ...credit, annualRate: v })} />
          <NumberField label="Срок" suffix="мес." value={credit.termMonths} max={120} onChange={(t) => setCredit({ ...credit, termMonths: Math.round(t) })} />
          <NumberField label="Разовые комиссии" suffix="₽" value={credit.oneTimeFees} onChange={(v) => setCredit({ ...credit, oneTimeFees: v })} />
          <NumberField label="Страховки и услуги" suffix="₽" value={credit.extraServices} onChange={(v) => setCredit({ ...credit, extraServices: v })} />
        </Details>
        <Details title="Накопить">
          <NumberField label="Откладывать в месяц" suffix="₽" value={saving.monthlyAmount} onChange={(v) => setSaving({ ...saving, monthlyAmount: v })} />
          <NumberField label="Уже накоплено" suffix="₽" value={saving.alreadySaved} onChange={(v) => setSaving({ ...saving, alreadySaved: v })} />
        </Details>
        <DemoNote />
      </div>

      <div className="space-y-4">
        {options.map((o) => {
          const best = cheapest?.id === o.id;
          return (
            <Card key={o.id} className={best ? "border-accent" : ""}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold">
                  {o.title}
                  {best && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-ink align-middle">Дешевле всего</span>}
                </h3>
                <p className={`tabular text-lg font-bold ${o.overpayment.greaterThan(0) ? "text-loss" : "text-accent"}`}>
                  {o.overpayment.greaterThan(0) ? `+${rub(o.overpayment)}` : o.overpayment.lessThan(0) ? `−${rub(o.overpayment.abs())}` : "без переплаты"}
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div><dt className="text-muted">Заплатите всего</dt><dd className="tabular font-medium">{rub(o.totalPaid)}</dd></div>
                <div><dt className="text-muted">В месяц</dt><dd className="tabular font-medium">{o.monthlyPayment.isZero() ? "—" : rub(o.monthlyPayment)}</dd></div>
                <div><dt className="text-muted">Эффективная ставка</dt><dd className="tabular font-medium">{o.effectiveRate === null ? "—" : pct(o.effectiveRate)}</dd></div>
                <div><dt className="text-muted">Вещь у вас</dt><dd className="font-medium">{o.monthsToGet === 0 ? "сразу" : o.monthsToGet < 0 ? "не получится" : `через ${formatMonths(o.monthsToGet)}`}</dd></div>
              </dl>
              <p className="mt-2 text-sm text-muted">В сегодняшних деньгах: <span className="tabular">{rub(o.presentValue)}</span></p>
              {o.note && <p className={`mt-2 text-sm ${o.id === "installment" && o.effectiveRate && o.effectiveRate > 0.001 ? "text-loss" : ""}`}>{o.note}</p>}
            </Card>
          );
        })}
        <Card>
          <h3 className="font-semibold">Пример с рынка: {WB_CASH_NOTE.title}</h3>
          <p className="mt-1 text-sm">{WB_CASH_NOTE.text} Вывод: «без процентов» — только если вернуть всё в срок.</p>
          <p className="mt-1 text-xs text-muted">
            Источник: <a href={WB_CASH_NOTE.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">сайт банка</a>, проверено {formatRuDate(WB_CASH_NOTE.checkedAt)}. Условия могут измениться — уточняйте в банке.
          </p>
        </Card>
        <p className="text-xs text-muted">
          «В сегодняшних деньгах» — сколько стоит вариант с учётом того, что деньги, которые вы платите позже, пока могут лежать на вкладе. Самый дешёвый вариант выбран по этой величине. Накопление выгодно по деньгам, но вещь вы получите позже.
        </p>
      </div>
    </div>
  );
}
