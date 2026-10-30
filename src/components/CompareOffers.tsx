"use client";

import { G } from "@/data/glossary";
import { useDeferredValue, useMemo, useState } from "react";
import { compareOffers, type Offer } from "@/lib/finance/compare";
import { rub, pct } from "@/lib/format";
import { Card, DemoNote, NumberField, Segmented, Toggle } from "./ui";
import { BANK_OFFERS, PRODUCTS, type BankOffer } from "@/data/bank-offers";
import { BankDataNote, BankMarket, SourceLine } from "./BankMarket";

const pickable = BANK_OFFERS.filter((o) => o.rateMin !== null);

/** Подставляет опубликованные условия банка: минимальную ставку и ограничения срока. */
function fromBank(offer: BankOffer, current: Offer): Partial<Offer> {
  return {
    name: `${offer.bank} — ${offer.title}`,
    annualRate: offer.rateMin ?? current.annualRate,
    termMonths: offer.termMaxMonths ? Math.min(current.termMonths, offer.termMaxMonths) : current.termMonths,
    amount: offer.amountMax ? Math.min(current.amount, offer.amountMax) : current.amount,
    sourceId: offer.id,
  };
}

const blank = (name: string, patch: Partial<Offer> = {}): Offer => ({
  name, amount: 3_000_000, annualRate: 18, termMonths: 120, paymentType: "annuity",
  insurancePercent: 0, insuranceFixedYearly: 0, oneTimeFees: 0, monthlyFees: 0,
  extraServices: 0, extraServicesFinanced: false, earlyRepayment: "", ...patch,
});

export function CompareOffers({ startDate }: { startDate: string }) {
  const [offers, setOffers] = useState<Offer[]>([
    blank("Банк А", { annualRate: 17.5, insurancePercent: 0.8 }),
    blank("Банк Б", { annualRate: 16.9, extraServices: 120_000, extraServicesFinanced: true, insurancePercent: 1 }),
  ]);
  const deferred = useDeferredValue(offers);
  const cmp = useMemo(() => {
    try {
      return compareOffers(deferred.filter((o) => o.amount > 0 && o.termMonths > 0), startDate);
    } catch {
      return null;
    }
  }, [deferred, startDate]);
  const update = (i: number, patch: Partial<Offer>) => setOffers(offers.map((o, k) => (k === i ? { ...o, ...patch } : o)));

  return (
    <div className="space-y-6">
      <BankMarket
        startDate={startDate}
        onAdd={(bank, amount, termMonths) => {
          const base = blank("", { amount, termMonths });
          setOffers((prev) => [...prev.slice(prev.length >= 6 ? 1 : 0), { ...base, ...fromBank(bank, base) }]);
        }}
      />
      <h2 className="text-xl font-bold">Сравнение предложений</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((o, i) => {
          const source = BANK_OFFERS.find((b) => b.id === o.sourceId);
          return (
          <Card key={i}>
            <label className="mb-3 flex flex-col gap-1.5 text-sm font-medium">
              Банк из каталога
              <select
                value={o.sourceId ?? ""}
                onChange={(e) => {
                  const b = pickable.find((x) => x.id === e.target.value);
                  update(i, b ? fromBank(b, o) : { sourceId: undefined });
                }}
                className="w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 font-normal outline-none focus:border-accent"
              >
                <option value="">Ввести условия вручную</option>
                {PRODUCTS.map((p) => (
                  <optgroup key={p.id} label={p.title}>
                    {pickable.filter((b) => b.product === p.id).map((b) => (
                      <option key={b.id} value={b.id}>{b.bank} — {b.title} (от {b.rateMin}%)</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {source && (
              <div className="mb-3 rounded-lg bg-surface-2 p-3 text-xs">
                <p>Подставлена минимальная опубликованная ставка {source.rateMin}%{source.rateMax ? ` (диапазон до ${source.rateMax}%)` : ""}. Ваша ставка может быть выше — поправьте поле, если банк назвал другую.</p>
                <div className="mt-1"><SourceLine offer={source} /></div>
              </div>
            )}
            <div className="mb-4 flex items-center gap-2">
              <input
                value={o.name}
                onChange={(e) => update(i, { name: e.target.value })}
                aria-label="Название предложения"
                className="min-w-0 flex-1 rounded-lg bg-transparent text-lg font-bold outline-none focus:bg-surface-2"
              />
              {offers.length > 2 && (
                <button type="button" onClick={() => setOffers(offers.filter((_, k) => k !== i))} className="text-sm text-loss">Удалить</button>
              )}
            </div>
            <div className="grid gap-3">
              <NumberField label="Сумма кредита" suffix="₽" value={o.amount} onChange={(amount) => update(i, { amount })} />
              <div className="grid gap-3 @sm:grid-cols-2">
                <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={o.annualRate} onChange={(annualRate) => update(i, { annualRate })} />
                <NumberField label="Срок" suffix="мес." value={o.termMonths} max={480} onChange={(termMonths) => update(i, { termMonths: Math.round(termMonths) })} />
              </div>
              <Segmented label="Платежи" info={G.paymentType} value={o.paymentType} onChange={(paymentType) => update(i, { paymentType })}
                options={[{ value: "annuity", label: "Равные" }, { value: "differentiated", label: "Убывающие" }]} />
              <div className="grid gap-3 @sm:grid-cols-2">
                <NumberField label="Страховка, % в год" info={G.insurancePercent} suffix="%" decimals={2} value={o.insurancePercent} onChange={(insurancePercent) => update(i, { insurancePercent })} />
                <NumberField label="Страховка, ₽ в год" suffix="₽" value={o.insuranceFixedYearly} onChange={(insuranceFixedYearly) => update(i, { insuranceFixedYearly })} />
                <NumberField label="Разовые комиссии" suffix="₽" value={o.oneTimeFees} onChange={(oneTimeFees) => update(i, { oneTimeFees })} />
                <NumberField label="Комиссии в месяц" info={G.monthlyFees} suffix="₽" value={o.monthlyFees} onChange={(monthlyFees) => update(i, { monthlyFees })} />
              </div>
              <NumberField label="Доп. услуги (пакеты, сервисы)" info={G.extraServices} suffix="₽" value={o.extraServices} onChange={(extraServices) => update(i, { extraServices })} />
              <Toggle label="Услуги включены в сумму кредита" info={G.extrasFinanced} checked={o.extraServicesFinanced} onChange={(extraServicesFinanced) => update(i, { extraServicesFinanced })} />
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Условия досрочного погашения
                <input value={o.earlyRepayment ?? ""} onChange={(e) => update(i, { earlyRepayment: e.target.value })} placeholder="например: без ограничений, через приложение"
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 font-normal outline-none focus:border-accent" />
              </label>
            </div>
          </Card>
          );
        })}
        {offers.length < 6 && (
          <button type="button" onClick={() => setOffers([...offers, blank(`Банк ${String.fromCharCode(1040 + offers.length)}`)])}
            className="min-h-40 rounded-2xl border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent">
            + Добавить предложение
          </button>
        )}
      </div>
      {offers.some((o) => o.sourceId) ? <BankDataNote /> : <DemoNote />}

      {cmp && (
        <Card>
          <h2 className="text-lg font-bold">Результат сравнения</h2>
          <p className="mt-1 text-[15px]">
            Выгоднее всего — <b className="text-accent">{cmp.best.offer.name}</b>
            {cmp.spread.greaterThan(0) && <> : разница с самым дорогим вариантом — <b>{rub(cmp.spread)}</b></>}.
          </p>
          {!cmp.sameTerms && (
            <p className="mt-2 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
              У предложений разные суммы или сроки, поэтому места расставлены по ПСК — переплата в рублях у короткого кредита всегда меньше. Для честного сравнения задайте одинаковые сумму и срок.
            </p>
          )}
          <div className="-mx-4 mt-4 overflow-x-auto sm:mx-0">
            <table className="tabular w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium sm:px-2">Место</th>
                  <th className="px-2 py-2 font-medium">Предложение</th>
                  <th className="px-2 py-2 text-right font-medium">Платёж</th>
                  <th className="px-2 py-2 text-right font-medium">Всего отдадите</th>
                  <th className="px-2 py-2 text-right font-medium">Переплата</th>
                  <th className="px-4 py-2 text-right font-medium sm:px-2">ПСК</th>
                </tr>
              </thead>
              <tbody>
                {[...cmp.results].sort((a, b) => a.rank - b.rank).map((r) => (
                  <tr key={r.offer.name + r.rank} className={`border-b border-border/60 ${r.rank === 1 ? "bg-accent-soft" : ""}`}>
                    <td className="px-4 py-2.5 font-semibold sm:px-2">{r.rank}</td>
                    <td className="px-2 py-2.5">
                      {r.offer.name}
                      <span className="block text-xs text-muted">{r.offer.annualRate}% · {r.offer.termMonths} мес.{r.offer.earlyRepayment ? ` · ${r.offer.earlyRepayment}` : ""}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right">{rub(r.payment)}</td>
                    <td className="px-2 py-2.5 text-right">{rub(r.totalOutflow)}</td>
                    <td className="px-2 py-2.5 text-right text-loss">{rub(r.overpayment)}</td>
                    <td className="px-4 py-2.5 text-right sm:px-2">{r.psk === null ? "—" : pct(r.psk, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Переплата — всё, что вы отдадите сверх полученной суммы: проценты, страховки, комиссии и услуги. Если услуги включены в кредит, на них тоже начисляются проценты. ПСК — оценка по формуле 353-ФЗ по введённым данным.
          </p>
        </Card>
      )}
    </div>
  );
}
