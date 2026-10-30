"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CREDIT_CARDS } from "@/data/credit-cards";
import { G } from "@/data/glossary";
import { simulateCard, type CardInput, type CardResult } from "@/lib/finance/card";
import { formatMonths, plural } from "@/lib/finance/advisor";
import { formatRuDate } from "@/lib/finance/dates";
import { rub } from "@/lib/format";
import { Card, NumberField, Segmented, Toggle } from "./ui";

const pct = (v: number) => `${v.toLocaleString("ru-RU")}%`;
const days = (n: number) => plural(n, "день", "дня", "дней");

function fromCard(id: string, prev: CardInput): CardInput {
  const c = CREDIT_CARDS.find((x) => x.id === id);
  if (!c) return prev;
  return {
    ...prev,
    annualRate: c.rateMin,
    graceDays: c.graceRegular,
    minPayPercent: c.minPayPercent,
    minPayMin: c.minPayMin,
    minPayPlusInterest: c.minPayPlusInterest,
    // У «Резервного лимита» ВТБ плата 10–50 ₽ в день в зависимости от лимита — берём верхнюю
    dailyFee: c.id === "vtb-reserve" ? 50 : 0,
  };
}

function Scenario({ title, r, note, term }: { title: string; r: CardResult; note?: string; term?: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="font-semibold">{title}</h3>
      {r.neverEnds ? (
        <p className="mt-2 text-sm text-loss">Этот платёж не покрывает проценты и платы — долг не уменьшается. Увеличьте сумму.</p>
      ) : (
        <dl className="tabular mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm @lg:grid-cols-4">
          <div><dt className="text-muted">Срок</dt><dd>{term ?? formatMonths(r.months)}</dd></div>
          <div><dt className="text-muted">Первый платёж</dt><dd>{rub(r.firstPayment)}</dd></div>
          <div><dt className="text-muted">Проценты</dt><dd className={r.interest.greaterThan(0) ? "text-loss" : "text-accent"}>{rub(r.interest)}</dd></div>
          <div><dt className="text-muted">Платы и комиссии</dt><dd className={r.fees.greaterThan(0) ? "text-loss" : ""}>{rub(r.fees)}</dd></div>
        </dl>
      )}
      {!r.neverEnds && <p className="mt-2 text-sm">Всего отдадите <b>{rub(r.totalPaid)}</b></p>}
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

export function CardCalculator() {
  const [cardId, setCardId] = useState("ozon");
  const [op, setOp] = useState<"purchase" | "cash">("purchase");
  const [fixed, setFixed] = useState(10_000);
  const [input, setInput] = useState<CardInput>(() =>
    fromCard("ozon", { debt: 50_000, annualRate: 30, graceDays: 55, minPayPercent: 5, minPayMin: 300, minPayPlusInterest: false, monthlyFee: 0, dailyFee: 0, cashFeePercent: 0, cashFeeMin: 0 }),
  );
  const set = (patch: Partial<CardInput>) => setInput({ ...input, ...patch });
  const card = CREDIT_CARDS.find((c) => c.id === cardId);

  const d = useDeferredValue({ input, op, fixed });
  const res = useMemo(() => {
    // Наличные и переводы обычно без льготного периода — по умолчанию считаем так
    const i = d.op === "cash" ? { ...d.input, graceDays: 0 } : { ...d.input, cashFeePercent: 0, cashFeeMin: 0 };
    if (i.debt <= 0) return null;
    return {
      grace: simulateCard(i, { kind: "grace" }),
      minimum: simulateCard(i, { kind: "minimum" }),
      fixed: simulateCard(i, { kind: "fixed", amount: d.fixed }),
    };
  }, [d]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Карта и долг</h2>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Карта
              <select
                value={cardId}
                onChange={(e) => { setCardId(e.target.value); setInput(fromCard(e.target.value, input)); }}
                className="w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 font-normal outline-none focus:border-accent"
              >
                {CREDIT_CARDS.map((c) => <option key={c.id} value={c.id}>{c.bank} — {c.name}</option>)}
                <option value="manual">Ввести условия своей карты</option>
              </select>
            </label>
            <Segmented label="Что делаете" value={op} onChange={setOp}
              options={[{ value: "purchase", label: "Покупка" }, { value: "cash", label: "Наличные / перевод" }]} />
            <NumberField label="Сумма" suffix="₽" value={input.debt} onChange={(debt) => set({ debt })} />
            <div className="grid gap-3 @sm:grid-cols-2">
              <NumberField label="Ставка" info={G.rate} suffix="%" decimals={2} value={input.annualRate} onChange={(annualRate) => set({ annualRate })} hint={card && card.rateMin !== card.rateMax ? `у карты ${pct(card.rateMin)}–${pct(card.rateMax)}` : undefined} />
              {op === "purchase" && <NumberField label="Льготный период" info={G.grace} suffix="дн." value={input.graceDays} max={500} onChange={(g) => set({ graceDays: Math.round(g) })} />}
              <NumberField label="Мин. платёж, % долга" info={G.minPay} suffix="%" decimals={1} value={input.minPayPercent} onChange={(minPayPercent) => set({ minPayPercent })} />
              <NumberField label="Мин. платёж не меньше" suffix="₽" value={input.minPayMin} onChange={(minPayMin) => set({ minPayMin })} />
              <NumberField label="Плата за день с долгом" info={G.dailyFee} suffix="₽" value={input.dailyFee} onChange={(dailyFee) => set({ dailyFee })} />
              <NumberField label="Подписки и платы в месяц" info={G.cardMonthlyFee} suffix="₽" value={input.monthlyFee} onChange={(monthlyFee) => set({ monthlyFee })} />
              {op === "cash" && (
                <>
                  <NumberField label="Комиссия за снятие" info={G.cashFee} suffix="%" decimals={1} value={input.cashFeePercent} onChange={(cashFeePercent) => set({ cashFeePercent })} />
                  <NumberField label="Комиссия не меньше" suffix="₽" value={input.cashFeeMin} onChange={(cashFeeMin) => set({ cashFeeMin })} />
                </>
              )}
            </div>
            <Toggle label="Проценты добавляются к минимальному платежу" checked={input.minPayPlusInterest} onChange={(minPayPlusInterest) => set({ minPayPlusInterest })} />
            <NumberField label="Сколько готовы платить в месяц" suffix="₽" value={fixed} onChange={setFixed} />
            {op === "cash" && <p className="text-xs text-muted">Комиссию за снятие возьмите из тарифа карты — она у всех разная, а по акциям бывает нулевой. Льготный период на наличные и переводы обычно не действует, поэтому считаем проценты с первого дня.</p>}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        {card && (
          <Card>
            <h2 className="text-lg font-bold">{card.bank} — {card.name}: что важно знать</h2>
            {card.graceAdvertised > card.graceRegular && (
              <div className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-warn">
                <p className="font-semibold">Без процентов — {card.graceRegular} {days(card.graceRegular)}, а не {card.graceAdvertised}.</p>
                <p className="mt-1 text-sm">
                  {card.graceAdvertised} {days(card.graceAdvertised)} дают только {card.graceAdvertisedWhen ?? "при особых условиях"}. На обычные покупки — {card.graceRegular} {days(card.graceRegular)}. Мы считаем по {card.graceRegular}.
                </p>
              </div>
            )}
            <ul className="mt-3 space-y-1.5 text-[15px]">{card.traps.map((t) => <li key={t}>• {t}</li>)}</ul>
            <p className="mt-3 text-xs text-muted">
              Ставка {card.rateMin === card.rateMax ? pct(card.rateMin) : `${pct(card.rateMin)}–${pct(card.rateMax)}`}, ПСК {pct(card.pskMin)}–{pct(card.pskMax)}. Источник: <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">banki.ru</a>, данные на {formatRuDate(card.checkedAt)}.
            </p>
          </Card>
        )}
        {res && (
          <Card>
            <h2 className="text-lg font-bold">Сколько стоит этот долг</h2>
            <div className="mt-4 space-y-3">
              <Scenario title={op === "purchase" && input.graceDays > 0 ? `Вернуть всё за ${input.graceDays} дней (льготный период)` : "Вернуть всё через месяц"} r={res.grace}
                term={op === "purchase" && input.graceDays > 0 ? `${input.graceDays} дн.` : "1 месяц"} />
              <Scenario title={`Платить ${rub(fixed)} в месяц`} r={res.fixed} />
              <Scenario title="Платить только минимальный платёж" r={res.minimum}
                note={res.minimum.adjustedMinimum ? "По тарифу минимальный платёж меньше начисляемых процентов. Посчитали вариант, где проценты добавляются к платежу, — уточните правило в тарифе карты." : "Минимальный платёж уменьшается вместе с долгом, поэтому последние годы вы платите понемногу, а проценты продолжают начисляться."} />
            </div>
            <p className="mt-3 text-xs text-muted">Проценты считаются помесячно как остаток × ставка / 12 — это оценка: банк начисляет по дням. Если долг не погашен в льготный период, проценты обычно начисляются с первого дня.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
