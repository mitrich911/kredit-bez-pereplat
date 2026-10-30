"use client";

import { G } from "@/data/glossary";
import { useDeferredValue, useMemo, useState } from "react";
import { prepaymentEffect, type MortgageInput } from "@/lib/finance/mortgage";
import { optimize, termTable, type Constraints } from "@/lib/finance/optimizer";
import { adviseMortgage } from "@/lib/finance/advisor";
import { balanceOn, type Prepayment } from "@/lib/finance/loan";
import { rubKop } from "@/lib/format";
import { Card, DateField, DemoNote, Details, NumberField, Segmented, Toggle } from "../ui";
import { PrepaymentEditor } from "../PrepaymentEditor";
import { ScheduleTable } from "../ScheduleTable";
import { Advice } from "../Advice";
import { MortgageCharts, PrepaymentSummary, Summary } from "./Results";
import { ConstraintsForm, ScenarioTable, TermTable } from "./Optimizer";
import { BankRateHint } from "../BankMarket";

interface State {
  price: number;
  down: number;
  rate: number;
  years: number;
  paymentType: MortgageInput["paymentType"];
  accrual: NonNullable<MortgageInput["accrual"]>;
  startDate: string;
  insurancePercent: number;
  insuranceFixedYearly: number;
  oneTimeCosts: number;
  monthlyFees: number;
  existing: boolean;
}

export function MortgageCalculator({ defaultStart }: { defaultStart: string }) {
  const [s, setS] = useState<State>({
    price: 7_000_000, down: 1_400_000, rate: 16, years: 20, paymentType: "annuity", accrual: "daily",
    startDate: defaultStart, insurancePercent: 0.5, insuranceFixedYearly: 0, oneTimeCosts: 50_000, monthlyFees: 0, existing: false,
  });
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [limits, setLimits] = useState<Constraints>({ monthlyExtra: 5000, savings: 0, reserve: 0, monthlyIncome: 0 });
  const [debtDate, setDebtDate] = useState("");
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  const deferred = useDeferredValue({ s, prepayments, limits });
  const calc = useMemo(() => {
    const { s, prepayments, limits } = deferred;
    if (s.down >= s.price || s.price <= 0) return { error: "Первоначальный взнос должен быть меньше стоимости недвижимости" } as const;
    if (s.years < 1 || s.years > 40) return { error: "Срок — от 1 до 40 лет" } as const;
    const input: MortgageInput = {
      propertyPrice: s.price, downPayment: s.down, annualRate: s.rate, termMonths: Math.round(s.years * 12),
      paymentType: s.paymentType, accrual: s.accrual, startDate: s.startDate,
      costs: { insurancePercent: s.insurancePercent, insuranceFixedYearly: s.insuranceFixedYearly, oneTimeCosts: s.oneTimeCosts, monthlyFees: s.monthlyFees },
    };
    const effect = prepaymentEffect(input, prepayments);
    const opt = optimize(input, limits, s.existing ? "existing" : "planning");
    const advice = adviseMortgage(s.price, effect.base, opt);
    const terms = termTable(input, [5, 10, 15, 20, 25, 30].filter((y) => y <= 40));
    return { input, effect, opt, advice, terms };
  }, [deferred]);

  const stale = deferred.s !== s || deferred.prepayments !== prepayments || deferred.limits !== limits;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Условия кредита</h2>
          <div className="grid gap-4">
            <NumberField label="Стоимость недвижимости" suffix="₽" value={s.price} onChange={(price) => set({ price })} />
            <NumberField label="Первоначальный взнос" info={G.downPayment} suffix="₽" value={s.down} onChange={(down) => set({ down })} hint={s.price > 0 ? `${Math.round((s.down / s.price) * 100)}% от стоимости` : undefined} />
            <div className="grid gap-3 @sm:grid-cols-2">
              <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={s.rate} onChange={(rate) => set({ rate })} max={100} />
              <NumberField label="Срок" suffix="лет" value={s.years} onChange={(years) => set({ years })} max={40} />
            </div>
            <Segmented label="Тип платежей" info={G.paymentType} value={s.paymentType} onChange={(paymentType) => set({ paymentType })}
              options={[{ value: "annuity", label: "Равные (аннуитет)" }, { value: "differentiated", label: "Убывающие" }]} />
            <DateField label="Дата выдачи кредита" value={s.startDate} onChange={(startDate) => set({ startDate })} />
            <Toggle label="Кредит уже оформлен (считать досрочку, а не больший взнос)" info={G.existing} checked={s.existing} onChange={(existing) => set({ existing })} />
          </div>
        </Card>
        <BankRateHint products={["mortgage", "family"]} onPick={(rate) => set({ rate })} amount={s.price - s.down} termMonths={Math.round(s.years * 12)} />
        <Details title="Страховки и комиссии">
          <NumberField label="Страхование, % от долга в год" info={G.insurancePercent} suffix="%" decimals={2} value={s.insurancePercent} onChange={(insurancePercent) => set({ insurancePercent })} hint="Жизнь, залог, титул вместе" />
          <NumberField label="Страхование, фиксированно в год" suffix="₽" value={s.insuranceFixedYearly} onChange={(insuranceFixedYearly) => set({ insuranceFixedYearly })} />
          <NumberField label="Разовые расходы" info={G.oneTimeCosts} suffix="₽" value={s.oneTimeCosts} onChange={(oneTimeCosts) => set({ oneTimeCosts })} hint="Оценка, нотариус, регистрация, комиссии" />
          <NumberField label="Ежемесячные комиссии" info={G.monthlyFees} suffix="₽" value={s.monthlyFees} onChange={(monthlyFees) => set({ monthlyFees })} />
        </Details>
        <Details title="Как начисляются проценты">
          <div className="sm:col-span-2">
            <Segmented label="Начисление" info={G.accrualDaily} value={s.accrual} onChange={(accrual) => set({ accrual })}
              options={[{ value: "daily", label: "По дням (как в банке)" }, { value: "monthly", label: "Ставка / 12" }]} />
            <p className="mt-2 text-xs text-muted">Большинство банков начисляют проценты за фактическое число дней в месяце. «Ставка / 12» — упрощённый вариант, как в большинстве онлайн-калькуляторов.</p>
          </div>
        </Details>
        <DemoNote />
      </div>

      <div className={`space-y-6 transition-opacity ${stale ? "opacity-70" : ""}`} aria-live="polite">
        {"error" in calc ? (
          <Card><p className="text-loss">{calc.error}</p></Card>
        ) : (
          <>
            <Summary price={s.price} down={s.down} result={calc.effect.base} />

            <Card>
              <h2 className="text-lg font-bold">Финансовый разбор</h2>
              <p className="mb-4 text-sm text-muted">Укажите, сколько вы можете откладывать, — подберём самый выгодный вариант, который не ударит по бюджету.</p>
              <ConstraintsForm value={limits} onChange={setLimits} />
              <div className="mt-5"><Advice blocks={calc.advice} /></div>
              <h3 className="mt-6 mb-3 font-semibold">Все варианты</h3>
              <ScenarioTable opt={calc.opt} />
            </Card>

            <Card>
              <h2 className="text-lg font-bold">Досрочное погашение</h2>
              <p className="mb-4 text-sm text-muted">Добавьте свои платежи: разовые, ежемесячные или ежегодные, — и выберите, что уменьшать.</p>
              <PrepaymentEditor items={prepayments} onChange={setPrepayments} startDate={s.startDate} termMonths={Math.round(s.years * 12)} />
            </Card>
            <PrepaymentSummary effect={calc.effect} />
            <MortgageCharts effect={calc.effect} />

            <Card>
              <h2 className="text-lg font-bold">Какой срок выбрать</h2>
              <p className="mb-3 text-sm text-muted">Короче срок — выше платёж, но намного меньше переплата. Выберите самый короткий срок с посильным платежом.</p>
              <TermTable rows={calc.terms} current={Math.round(s.years * 12)} />
            </Card>

            <Card>
              <h2 className="text-lg font-bold">График платежей</h2>
              <div className="my-4 grid max-w-md gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <DateField label="Остаток долга на дату" value={debtDate || s.startDate} onChange={setDebtDate} />
                <p className="tabular pb-3 font-semibold">
                  {rubKop(balanceOn(calc.effect.withPrepayments.schedule, calc.effect.base.loanAmount.toNumber(), debtDate || s.startDate))}
                </p>
              </div>
              <ScheduleTable rows={calc.effect.withPrepayments.schedule.rows} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
