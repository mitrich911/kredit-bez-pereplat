"use client";

import { useMemo, useState } from "react";
import { BANK_OFFERS, PRODUCTS, type BankOffer, type Product } from "@/data/bank-offers";
import { rankOffers } from "@/lib/finance/bank-pick";
import { annuityPayment } from "@/lib/finance/loan";
import { formatRuDate } from "@/lib/finance/dates";
import { rub } from "@/lib/format";
import { Card, NumberField, Segmented } from "./ui";
import { isBankOfferCurrent } from "@/lib/bank-freshness";
import { useBrowserToday } from "@/lib/use-browser-start-date";

const pctRange = (a: number | null, b: number | null) =>
  a === null && b === null ? "не опубликована" : b === null ? `от ${a!.toLocaleString("ru-RU")}%` : `${a!.toLocaleString("ru-RU")}–${b.toLocaleString("ru-RU")}%`;

export const latestCheck = BANK_OFFERS.reduce((a, o) => (o.checkedAt > a ? o.checkedAt : a), "");

/** Обязательное предупреждение везде, где показываются условия банков. */
export function BankDataNote({ date = latestCheck }: { date?: string }) {
  return (
    <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      Условия банков взяты с их официальных сайтов и с banki.ru {formatRuDate(date)} и могут быть неточными или уже измениться. Ставку банк назначает индивидуально, поэтому подбор ориентировочный и не является рекомендацией. Точные условия узнавайте в банке перед подписанием договора.
    </p>
  );
}

export function SourceLine({ offer }: { offer: BankOffer }) {
  const today = useBrowserToday();
  const outdated = today !== null && !isBankOfferCurrent(offer.checkedAt, today);
  return (
    <p className="text-xs text-muted">
      Источник: <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-text">{offer.sourceName ?? "сайт банка"}</a>, проверено {formatRuDate(offer.checkedAt)}
      {outdated && <span className="font-semibold text-warn"> · Данные устарели: проверьте условия в банке</span>}
    </p>
  );
}

/**
 * Свёрнутый блок в калькуляторе: банки с их ставками и платежом на сумму и срок
 * из калькулятора — сравнение на месте, без отдельной страницы.
 */
export function BankRateHint({ products, onPick, amount, termMonths }: { products: Product[]; onPick: (rate: number) => void; amount: number; termMonths: number }) {
  const today = useBrowserToday();
  // Сначала банки с опубликованной ставкой (по возрастанию), затем те, у кого есть только ПСК или ничего
  const list = BANK_OFFERS.filter((o) => products.includes(o.product)).sort(
    (a, b) => (a.rateMin ?? 999) - (b.rateMin ?? 999) || (a.pskMin ?? 999) - (b.pskMin ?? 999),
  );
  if (!list.length) return null;
  return (
    <details className="group rounded-xl border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
        Ставки банков
        <span aria-hidden className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-border p-4">
        {list.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {o.bank} <span className="text-muted">· {o.title}</span>
              <span className="block text-xs text-muted">ставка {pctRange(o.rateMin, o.rateMax)}, ПСК {pctRange(o.pskMin, o.pskMax)} · <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{o.sourceName ?? "сайт банка"}</a></span>
              {o.rateMin !== null && amount > 0 && termMonths > 0 && (
                <span className="tabular block text-xs">
                  платёж от {rub(annuityPayment(amount, o.rateMin, termMonths))}
                  {o.amountMax && amount > o.amountMax ? <span className="text-loss"> · сумма больше лимита банка</span> : null}
                </span>
              )}
            </span>
            {o.rateMin !== null && (today === null || isBankOfferCurrent(o.checkedAt, today)) ? (
              <button type="button" onClick={() => onPick(o.rateMin!)} className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:border-accent">
                {o.rateMin.toLocaleString("ru-RU")}%
              </button>
            ) : (
              <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="shrink-0 text-xs text-muted underline">в калькуляторе банка ↗</a>
            )}
          </div>
        ))}
        <p className="text-xs text-muted">Кнопка подставит минимальную опубликованную ставку — ваша может оказаться выше. Для данных старше 30 дней подстановка отключена. Если банк не пишет ставку на странице продукта, она есть только в его калькуляторе после ввода ваших данных.</p>
        <BankDataNote />
      </div>
    </details>
  );
}

export function BankMarket({ startDate, onAdd }: { startDate: string; onAdd: (offer: BankOffer, amount: number, termMonths: number) => void }) {
  const today = useBrowserToday();
  const [product, setProduct] = useState<Product>("cash");
  const [amount, setAmount] = useState(1_000_000);
  const [termMonths, setTerm] = useState(36);
  const ranked = useMemo(() => rankOffers(BANK_OFFERS, product, amount, termMonths, startDate), [product, amount, termMonths, startDate]);
  const first = ranked.find((r) => r.limits.length === 0 && r.best && (today === null || isBankOfferCurrent(r.offer.checkedAt, today)));

  return (
    <Card>
      <h2 className="text-lg font-bold">Подбор по опубликованным условиям банков</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Выберите вид кредита, сумму и срок — покажем, сколько вы заплатите в лучшем и худшем случае по ставкам, которые банки указывают на своих сайтах.</p>
      <div className="grid gap-4 @2xl:grid-cols-[2fr_1fr_1fr]">
        <Segmented label="Вид кредита" value={product} onChange={(p) => { setProduct(p); if (p === "mortgage" || p === "family") { setAmount(5_000_000); setTerm(240); } else if (p === "auto") { setAmount(2_000_000); setTerm(60); } else { setAmount(1_000_000); setTerm(36); } }}
          options={PRODUCTS.map((p) => ({ value: p.id, label: p.title.replace("Ипотека на вторичное жильё", "Ипотека, вторичка") }))} />
        <NumberField label="Сумма кредита" suffix="₽" value={amount} onChange={setAmount} />
        <NumberField label="Срок" suffix="мес." value={termMonths} max={480} onChange={(t) => setTerm(Math.max(1, Math.round(t)))} />
      </div>

      {first && (
        <p className="mt-5 text-[15px]">
          По опубликованным данным ниже всего полная стоимость у <b className="text-accent">{first.offer.bank}</b> ({first.offer.title.toLowerCase()}): ПСК {pctRange(first.offer.pskMin, first.offer.pskMax)}. В лучшем случае платёж {rub(first.best!.payment)}, переплата по процентам {rub(first.best!.overpayment)}.
        </p>
      )}
      {today !== null && !first && ranked.length > 0 && (
        <p className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Актуальных проверенных условий для этого подбора нет. Сверьте ставки на сайтах банков и введите предложение вручную.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {ranked.map((r) => (
          <article key={r.offer.id} className={`rounded-xl border p-4 ${r === first ? "border-accent bg-accent-soft" : "border-border"} ${r.limits.length ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{r.offer.bank} <span className="font-normal text-muted">· {r.offer.title}</span></h3>
                <p className="text-sm">Ставка {pctRange(r.offer.rateMin, r.offer.rateMax)} · ПСК {pctRange(r.offer.pskMin, r.offer.pskMax)}</p>
              </div>
              {r.offer.rateMin !== null && (today === null || isBankOfferCurrent(r.offer.checkedAt, today)) ? (
                <button type="button" onClick={() => onAdd(r.offer, amount, termMonths)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:border-accent">
                  + В сравнение
                </button>
              ) : (
                <a href={r.offer.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-text">
                  Ставка — на сайте банка ↗
                </a>
              )}
            </div>
            {(r.best || r.worst) && (
              <dl className="tabular mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm @lg:grid-cols-4">
                <div><dt className="text-muted">Платёж от</dt><dd>{r.best ? rub(r.best.payment) : "—"}</dd></div>
                <div><dt className="text-muted">Платёж до</dt><dd>{r.worst ? rub(r.worst.payment) : "—"}</dd></div>
                <div><dt className="text-muted">Переплата от</dt><dd className="text-loss">{r.best ? rub(r.best.overpayment) : "—"}</dd></div>
                <div><dt className="text-muted">Переплата до</dt><dd className="text-loss">{r.worst ? rub(r.worst.overpayment) : "—"}</dd></div>
              </dl>
            )}
            {r.limits.length > 0 && <p className="mt-2 text-sm text-loss">Не подходит: {r.limits.join(", ")}</p>}
            <ul className="mt-2 space-y-0.5 text-sm text-muted">
              {r.offer.conditions.map((c) => <li key={c}>• {c}</li>)}
            </ul>
            <div className="mt-2"><SourceLine offer={r.offer} /></div>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Переплата — только проценты по ставке, без страховок и комиссий. Порядок — по минимальной ПСК: она учитывает обязательные платежи. Банки без опубликованных цифр — в конце списка; их условия смотрите в калькуляторе на сайте банка.
      </p>
      <div className="mt-3"><BankDataNote /></div>
    </Card>
  );
}
