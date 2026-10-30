"use client";

import { G } from "@/data/glossary";
import { useDeferredValue, useMemo, useState } from "react";
import { carCostOfOwnership, type CarFinancing, type CarProfile, type CarResult } from "@/lib/finance/car";
import { rub } from "@/lib/format";
import { Card, DemoNote, Details, NumberField, Stat, Toggle } from "./ui";
import { CostBar } from "./charts";
import { BankRateHint } from "./BankMarket";
import { DEALER_SERVICES, VERDICT_LABEL } from "@/data/dealer-services";
import { useBrowserStartDate } from "@/lib/use-browser-start-date";

const NEW_CAR: CarProfile = {
  name: "Новый", price: 2_500_000, depreciationFirstYear: 15, depreciationNextYears: 10,
  kaskoYearly: 90_000, osagoYearly: 9_000, maintenanceYearly: 30_000, repairsYearly: 5_000,
  kmPerYear: 15_000, litersPer100: 8, fuelPrice: 60, horsepower: 150, taxPerHp: 25,
};
const USED_CAR: CarProfile = {
  ...NEW_CAR, name: "С пробегом", price: 1_600_000, depreciationFirstYear: 8, depreciationNextYears: 8,
  kaskoYearly: 60_000, maintenanceYearly: 40_000, repairsYearly: 40_000,
};

function CarFields({ car, onChange }: { car: CarProfile; onChange: (c: CarProfile) => void }) {
  const set = (patch: Partial<CarProfile>) => onChange({ ...car, ...patch });
  return (
    <div className="grid gap-3 @md:col-span-2 @md:grid-cols-2">
      <NumberField label="Цена" suffix="₽" value={car.price} onChange={(price) => set({ price })} />
      <NumberField label="Мощность" suffix="л. с." value={car.horsepower} onChange={(horsepower) => set({ horsepower })} />
      <NumberField label="Потеря цены в 1-й год" info={G.depreciation} suffix="%" decimals={1} value={car.depreciationFirstYear} max={100} onChange={(depreciationFirstYear) => set({ depreciationFirstYear })} />
      <NumberField label="Потеря цены в следующие годы" suffix="%/год" decimals={1} value={car.depreciationNextYears} max={100} onChange={(depreciationNextYears) => set({ depreciationNextYears })} />
      <NumberField label="КАСКО в год" info={G.kasko} suffix="₽" value={car.kaskoYearly} onChange={(kaskoYearly) => set({ kaskoYearly })} />
      <NumberField label="ОСАГО в год" info={G.osago} suffix="₽" value={car.osagoYearly} onChange={(osagoYearly) => set({ osagoYearly })} />
      <NumberField label="ТО в год" info={G.maintenance} suffix="₽" value={car.maintenanceYearly} onChange={(maintenanceYearly) => set({ maintenanceYearly })} />
      <NumberField label="Ремонт в год" suffix="₽" value={car.repairsYearly} onChange={(repairsYearly) => set({ repairsYearly })} />
      <NumberField label="Пробег в год" suffix="км" value={car.kmPerYear} onChange={(kmPerYear) => set({ kmPerYear })} />
      <NumberField label="Расход" suffix="л/100" decimals={1} value={car.litersPer100} onChange={(litersPer100) => set({ litersPer100 })} />
      <NumberField label="Цена топлива" suffix="₽/л" decimals={2} value={car.fuelPrice} onChange={(fuelPrice) => set({ fuelPrice })} />
      <NumberField label="Ставка транспортного налога" info={G.taxPerHp} suffix="₽/л. с." decimals={1} value={car.taxPerHp} onChange={(taxPerHp) => set({ taxPerHp })} hint="Зависит от региона и мощности — проверьте на сайте ФНС" />
    </div>
  );
}

function Breakdown({ r }: { r: CarResult }) {
  const b = r.breakdown;
  return (
    <CostBar parts={[
      { label: "Потеря стоимости", value: b.depreciation.toNumber(), color: "var(--chart-3)" },
      { label: "Проценты по кредиту", value: b.interest.toNumber(), color: "var(--chart-2)" },
      { label: "Доп. услуги и комиссии", value: b.dealerExtras.plus(b.loanFees).toNumber(), color: "var(--loss)" },
      { label: "КАСКО и ОСАГО", value: b.insurance.toNumber(), color: "var(--chart-4)" },
      { label: "Топливо", value: b.fuel.toNumber(), color: "var(--chart-1)" },
      { label: "ТО и ремонт", value: b.maintenance.toNumber(), color: "var(--muted)" },
      { label: "Транспортный налог", value: b.tax.toNumber(), color: "var(--border)" },
    ]} />
  );
}

export function CarCalculator({ startDate }: { startDate: string }) {
  const currentStartDate = useBrowserStartDate(startDate);
  const [car, setCar] = useState(NEW_CAR);
  const [alt, setAlt] = useState(USED_CAR);
  const [baseFin, setFin] = useState<CarFinancing>({ kind: "credit", downPayment: 500_000, annualRate: 18, termMonths: 60, dealerExtras: 0, extrasFinanced: true, loanFees: 0 });
  const [services, setServices] = useState(() =>
    Object.fromEntries(DEALER_SERVICES.map((s) => [s.id, { on: s.defaultOn, amount: s.defaultAmount }])),
  );
  const [years, setYears] = useState(5);
  const [yieldPct, setYield] = useState(12);
  const [inflation, setInflation] = useState(7);
  const setF = (patch: Partial<CarFinancing>) => setFin({ ...baseFin, ...patch });
  const extrasSum = DEALER_SERVICES.reduce((a, s) => a + (services[s.id].on ? services[s.id].amount : 0), 0);
  const fin = { ...baseFin, dealerExtras: extrasSum };

  const d = useDeferredValue({ car, alt, fin, years, yieldPct, inflation, services });
  const res = useMemo(() => {
    if (d.years <= 0 || d.car.price <= 0) return null;
    const opt = { ownershipYears: d.years, savingsYield: d.yieldPct, costInflation: d.inflation, startDate: currentStartDate };
    const down = Math.min(d.fin.downPayment, d.car.price);
    const credit = carCostOfOwnership(d.car, { ...d.fin, kind: "credit", downPayment: down }, opt);
    // Цена каждой услуги с учётом процентов: насколько дешевле владение без неё
    const serviceCost = Object.fromEntries(
      DEALER_SERVICES.filter((s) => d.services[s.id].on).map((s) => [
        s.id,
        credit.total.minus(carCostOfOwnership(d.car, { ...d.fin, kind: "credit", downPayment: down, dealerExtras: d.fin.dealerExtras - d.services[s.id].amount }, opt).total),
      ]),
    );
    const noExtras = carCostOfOwnership(d.car, { ...d.fin, kind: "credit", downPayment: down, dealerExtras: 0 }, opt);
    const cash = carCostOfOwnership(d.car, { ...d.fin, kind: "cash", dealerExtras: 0 }, opt);
    const altDown = Math.min(down, d.alt.price);
    const altCredit = d.alt.price > 0 ? carCostOfOwnership(d.alt, { ...d.fin, kind: "credit", downPayment: altDown }, opt) : null;
    const terms = [24, 36, 60, 84].map((t) => ({ t, r: carCostOfOwnership(d.car, { ...d.fin, kind: "credit", downPayment: down, termMonths: t }, opt) }));
    return { credit, noExtras, cash, altCredit, terms, serviceCost };
  }, [d, currentStartDate]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Покупка</h2>
          <div className="grid gap-3">
            <div className="grid gap-3 @sm:grid-cols-2">
              <NumberField label="Взнос" suffix="₽" value={fin.downPayment} onChange={(downPayment) => setF({ downPayment })} />
              <NumberField label="Владеть" suffix="лет" decimals={1} value={years} max={30} onChange={setYears} />
              <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={fin.annualRate} onChange={(annualRate) => setF({ annualRate })} />
              <NumberField label="Срок кредита" suffix="мес." value={fin.termMonths} max={120} onChange={(t) => setF({ termMonths: Math.max(1, Math.round(t)) })} />
              <NumberField label="Комиссии по кредиту" info={G.loanFees} suffix="₽" value={fin.loanFees} onChange={(loanFees) => setF({ loanFees })} />
            </div>
          </div>
        </Card>
        <BankRateHint products={["auto"]} onPick={(annualRate) => setF({ annualRate })} amount={Math.max(car.price - fin.downPayment + (fin.extrasFinanced ? extrasSum : 0), 0)} termMonths={fin.termMonths} />
        <Details title={`Услуги салона: ${rub(extrasSum)}`} open>
          <div className="space-y-3 @md:col-span-2">
            {DEALER_SERVICES.map((s) => (
              <div key={s.id} className="grid gap-2">
                <Toggle label={s.title} info={s.what} checked={services[s.id].on} onChange={(on) => setServices({ ...services, [s.id]: { ...services[s.id], on } })} />
                {services[s.id].on && (
                  <NumberField label="Цена" suffix="₽" value={services[s.id].amount} onChange={(amount) => setServices({ ...services, [s.id]: { ...services[s.id], amount } })} />
                )}
              </div>
            ))}
            <Toggle label="Услуги включены в сумму кредита" info={G.extrasFinanced} checked={fin.extrasFinanced} onChange={(extrasFinanced) => setF({ extrasFinanced })} />
            <p className="text-xs text-muted">Отметьте, что предлагает салон, и укажите цены из договора. Цены по умолчанию — пример.</p>
          </div>
        </Details>
        <Details title="Автомобиль и расходы на него" open><CarFields car={car} onChange={setCar} /></Details>
        <Details title="Для сравнения: автомобиль с пробегом"><CarFields car={alt} onChange={setAlt} /></Details>
        <Details title="Доходность и инфляция">
          <NumberField label="Доходность сбережений" info={G.savingsYield} suffix="%" decimals={1} value={yieldPct} onChange={setYield} hint="Например, ставка по вкладу. Нужна для сравнения с покупкой за наличные" />
          <NumberField label="Рост цен на содержание" info={G.costInflation} suffix="%/год" decimals={1} value={inflation} onChange={setInflation} />
        </Details>
        <DemoNote />
      </div>

      {res && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold">Сколько стоит владеть машиной</h2>
            <p className="text-sm text-muted">Все расходы за {years} {years === 1 ? "год" : "лет"} минус то, за сколько машину можно будет продать</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              <Stat label="В месяц" value={rub(res.credit.perMonth)} tone="loss" />
              <Stat label="В год" value={rub(res.credit.perYear)} />
              <Stat label="За весь срок" value={rub(res.credit.total)} />
              <Stat label="Платёж по кредиту" value={rub(res.credit.monthlyLoanPayment)} />
            </div>
            <div className="mt-5"><Breakdown r={res.credit} /></div>
            <p className="mt-4 text-sm text-muted">
              Через {years} {years === 1 ? "год" : "лет"} машина будет стоить около {rub(res.credit.resaleValue)}
              {res.credit.debtAtSale.greaterThan(0) ? `, при этом останется долг ${rub(res.credit.debtAtSale)} — он гасится из выручки от продажи` : ""}.
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold">Сравнение вариантов</h2>
            <div className="-mx-4 mt-4 overflow-x-auto sm:mx-0">
              <table className="tabular w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium sm:px-2">Вариант</th>
                    <th className="px-2 py-2 text-right font-medium">В месяц</th>
                    <th className="px-2 py-2 text-right font-medium">За период</th>
                    <th className="px-4 py-2 text-right font-medium sm:px-2">В сегодняшних деньгах</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["В кредит, как предлагает салон", res.credit],
                    ["В кредит без доп. услуг", res.noExtras],
                    ["За наличные, без доп. услуг", res.cash],
                    ...(res.altCredit ? [[`${alt.name}, в кредит`, res.altCredit] as const] : []),
                    ...res.terms.filter((x) => x.t !== fin.termMonths).map((x) => [`Кредит на ${x.t} мес.`, x.r] as const),
                  ].map(([label, r]) => (
                    <tr key={label as string} className="border-b border-border/60">
                      <td className="px-4 py-2.5 sm:px-2">{label as string}</td>
                      <td className="px-2 py-2.5 text-right">{rub((r as CarResult).perMonth)}</td>
                      <td className="px-2 py-2.5 text-right">{rub((r as CarResult).total)}</td>
                      <td className="px-4 py-2.5 text-right sm:px-2">{rub((r as CarResult).presentValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              «В сегодняшних деньгах» учитывает, что деньги, не потраченные сразу, могли бы приносить доход по указанной доходности. Так честнее сравнивать покупку за наличные и в кредит.
            </p>
          </Card>

          {Object.keys(res.serviceCost).length > 0 && (
            <Card>
              <h2 className="text-lg font-bold">Услуги салона: что это и стоит ли платить</h2>
              <p className="mt-1 text-[15px]">
                Все отмеченные услуги обходятся вам в <b className="text-loss">{rub(res.credit.total.minus(res.noExtras.total))}</b>
                {fin.extrasFinanced ? " с учётом процентов: они включены в кредит, и на них тоже начисляется ставка" : ""}.
              </p>
              <div className="mt-4 space-y-3">
                {DEALER_SERVICES.filter((s) => res.serviceCost[s.id]).map((s) => (
                  <article key={s.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold">{s.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.verdict === "refuse" ? "bg-loss-soft text-loss" : s.verdict === "think" ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted"}`}>
                        {VERDICT_LABEL[s.verdict]}
                      </span>
                    </div>
                    <p className="tabular mt-1 text-sm">
                      Цена {rub(services[s.id].amount)} → с процентами <b className="text-loss">{rub(res.serviceCost[s.id])}</b>
                    </p>
                    <p className="mt-2 text-sm leading-relaxed"><b>Что это.</b> {s.what}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted"><b className="text-text">Как поступить.</b> {s.advice}</p>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Пояснения общие и не заменяют юридическую консультацию. Перед подписанием читайте договор: что входит в услугу, кто её оказывает и как от неё отказаться. Если салон даёт скидку на машину за покупку услуг, сравните скидку с их ценой с учётом процентов.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
