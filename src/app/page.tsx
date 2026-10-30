import Link from "next/link";
import { Faq, JsonLd, Wrap } from "@/components/Page";
import { site, tools } from "@/lib/site";
import { analyzeMortgage } from "@/lib/finance/mortgage";
import { optimize } from "@/lib/finance/optimizer";
import { rub } from "@/lib/format";
import { formatMonths } from "@/lib/finance/advisor";

// Пример на главной считается тем же движком, что и калькулятор.
const example = {
  propertyPrice: 7_000_000, downPayment: 1_400_000, annualRate: 16, termMonths: 240,
  paymentType: "annuity" as const, startDate: "2026-11-01", accrual: "monthly" as const,
  costs: { insurancePercent: 0.5, insuranceFixedYearly: 0, oneTimeCosts: 50_000, monthlyFees: 0 },
};
const base = analyzeMortgage(example);
const plus5 = optimize(example, { monthlyExtra: 5000, savings: 0, reserve: 0, monthlyIncome: 0 }).scenarios.find((s) => s.id === "monthly-term")!;

const faq = [
  { q: "Это бесплатно? Нужна регистрация?", a: "Все калькуляторы бесплатны и работают без регистрации. Расчёт выполняется прямо в вашем браузере — введённые данные никуда не отправляются." },
  { q: "Откуда берутся ставки банков?", a: "Мы не подставляем ставки банков: без проверенного источника они быстро устаревают. Вы вводите условия своего предложения, а мы показываем, сколько оно стоит на самом деле. Цифры в полях по умолчанию — только пример." },
  { q: "Вы продаёте кредиты или работаете на банки?", a: "Нет. Расчёты независимы. Если на сайте появятся партнёрские предложения, они будут отдельно подписаны как реклама и никогда не заменят результат расчёта." },
  { q: "Насколько точны расчёты?", a: "Используется точная десятичная арифметика с округлением до копеек, все формулы покрыты автоматическими тестами. Но точный график и ПСК банк указывает в договоре — сверяйтесь с ним перед подписанием." },
];

export default function Home() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <Wrap>
          <div className="grid gap-10 py-10 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
                Банк показывает ежемесячный платёж.<br />
                <span className="text-accent">Мы покажем, сколько вы потеряете за весь срок</span> — и как этого избежать.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted">
                Полная стоимость ипотеки, автокредита и крупных покупок: переплата, скрытые расходы, досрочное погашение и лучший вариант под ваш бюджет.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/ipoteka" className="rounded-xl bg-accent px-6 py-4 text-[17px] font-semibold text-accent-ink shadow-sm hover:opacity-90">
                  Рассчитать свою экономию
                </Link>
                <Link href="/sravnenie-kreditov" className="rounded-xl border border-border px-6 py-4 text-[17px] font-semibold hover:bg-surface-2">
                  Сравнить предложения банков
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted">Без регистрации · Бесплатно · Данные не покидают ваш браузер</p>
            </div>
            <figure className="rounded-2xl border border-border bg-bg p-5 sm:p-6">
              <figcaption className="text-sm text-muted">Пример: квартира за {rub(7_000_000)}, взнос 20%, 16% на 20 лет</figcaption>
              <dl className="mt-4 space-y-3">
                <div className="flex justify-between gap-3"><dt>Платёж в месяц</dt><dd className="tabular font-semibold">{rub(base.schedule.firstPayment)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Квартира обойдётся в</dt><dd className="tabular font-semibold">{rub(base.fullCost)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Из них переплата</dt><dd className="tabular font-bold text-loss">{rub(base.overpayment)}</dd></div>
              </dl>
              <div className="mt-5 rounded-xl bg-accent-soft p-4">
                <p className="text-sm">Если доплачивать <b>5 000 ₽</b> в месяц:</p>
                <p className="mt-1 text-xl font-bold text-accent">экономия {rub(plus5.saved)}</p>
                <p className="text-sm">кредит закроется на {formatMonths(plus5.monthsSaved)} раньше</p>
              </div>
              <p className="mt-3 text-xs text-muted">Ставка условная, для примера. Посчитано тем же алгоритмом, что и в калькуляторе.</p>
            </figure>
          </div>
        </Wrap>
      </section>

      <Wrap>
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Инструменты</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <Link key={t.href} href={t.href} className="group rounded-2xl border border-border bg-surface p-5 transition hover:border-accent">
                <h3 className="text-lg font-semibold group-hover:text-accent">{t.title}</h3>
                <p className="mt-2 text-muted">{t.text}</p>
                <span className="mt-4 inline-block text-sm font-medium text-accent">Посчитать →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Сколько вы заплатите", "Не только платёж, а вся сумма: долг, проценты, страховки, комиссии."],
            ["Где переплата", "Наглядно: какая часть уходит банку и почему."],
            ["Как заплатить меньше", "Досрочка, срок, взнос, рефинансирование — с точной экономией в рублях."],
            ["Что подходит именно вам", "Лучший вариант с учётом бюджета и подушки безопасности."],
          ].map(([h, p], i) => (
            <div key={h} className="rounded-2xl bg-surface-2 p-5">
              <p className="text-sm font-bold text-accent">{i + 1}</p>
              <h3 className="mt-1 font-semibold">{h}</h3>
              <p className="mt-1.5 text-sm text-muted">{p}</p>
            </div>
          ))}
        </section>
      </Wrap>
      <Faq items={faq} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url, inLanguage: "ru", description: site.tagline }} />
    </>
  );
}
