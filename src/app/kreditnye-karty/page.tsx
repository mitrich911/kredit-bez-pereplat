import type { Metadata } from "next";
import { CardCalculator } from "@/components/CardCalculator";
import { Faq, Prose, ToolHeader, Wrap } from "@/components/Page";
import { CREDIT_CARDS } from "@/data/credit-cards";
import { formatRuDate } from "@/lib/finance/dates";

const ru = (v: number) => `${v.toLocaleString("ru-RU")}%`;

export const metadata: Metadata = {
  title: "Кредитные карты: скрытые условия, реальный льготный период и переплата",
  description: "Какой льготный период у кредитной карты на самом деле, сколько стоит платить только минимальный платёж и снимать наличные. Условия карт Сбербанка, Т-Банка, Ozon, Альфы, ВТБ и других.",
  alternates: { canonical: "/kreditnye-karty" },
};

const faq = [
  { q: "Почему «до 120 дней без процентов» на деле меньше?", a: "Длинный срок часто действует только на часть операций: на перевод долга из другого банка, на товары с пометкой в одном магазине, на покупки первого месяца или с платной подпиской. Для обычных покупок льготный период обычно 50–60 дней. Мы показываем оба числа." },
  { q: "Что будет, если не успеть погасить долг в льготный период?", a: "У большинства карт проценты начисляются за весь срок с даты покупки, а не с конца льготного периода. Поэтому опоздание даже на день может стоить процентов за несколько месяцев." },
  { q: "Можно ли платить только минимальный платёж?", a: "Можно — просрочки не будет. Но минимальный платёж уменьшается вместе с долгом, и погашение растягивается на годы, а почти весь платёж в начале уходит на проценты. Калькулятор показывает, во сколько это обойдётся." },
  { q: "Почему снимать наличные с кредитки дорого?", a: "Обычно на снятие и переводы берут комиссию, льготный период на них не действует, а ставка бывает выше, чем на покупки. Бесплатное снятие чаще всего — временная акция." },
];

export default function Page() {
  const checked = CREDIT_CARDS[0]?.checkedAt;
  return (
    <>
      <ToolHeader
        title="Кредитные карты: скрытые условия"
        path="/kreditnye-karty"
        lead="«До 120 дней без процентов» — не всегда правда для ваших покупок. Посмотрите реальный льготный период, сколько стоит платить минимальный платёж и снимать наличные."
      />
      <Wrap>
        <CardCalculator />

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Реклама и реальность: популярные карты</h2>
          <div className="-mx-4 mt-4 overflow-x-auto sm:mx-0">
            <table className="tabular w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium sm:px-2">Карта</th>
                  <th className="px-2 py-2 text-right font-medium">Обещают без %</th>
                  <th className="px-2 py-2 text-right font-medium">На обычные покупки</th>
                  <th className="px-2 py-2 text-right font-medium">Ставка</th>
                  <th className="px-2 py-2 text-right font-medium">Мин. платёж</th>
                  <th className="px-4 py-2 font-medium sm:px-2">Главное условие</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_CARDS.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 align-top">
                    <td className="px-4 py-2.5 sm:px-2"><a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:underline">{c.bank}</a><span className="block text-xs text-muted">{c.name}</span></td>
                    <td className="px-2 py-2.5 text-right">{c.graceAdvertised ? `${c.graceAdvertised} дн.` : "нет"}</td>
                    <td className={`px-2 py-2.5 text-right ${c.graceRegular < c.graceAdvertised ? "font-semibold text-loss" : ""}`}>{c.graceRegular ? `${c.graceRegular} дн.` : "нет"}</td>
                    <td className="px-2 py-2.5 text-right">{c.rateMin === c.rateMax ? ru(c.rateMin) : `${ru(c.rateMin)}–${ru(c.rateMax)}`}</td>
                    <td className="px-2 py-2.5 text-right">{ru(c.minPayPercent)}{c.minPayPlusInterest ? " + проценты" : ""}</td>
                    <td className="px-4 py-2.5 text-muted sm:px-2">{c.traps[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            Условия карт взяты с banki.ru (данные на {checked ? formatRuDate(checked) : "дату проверки"}) и могут быть неточными или уже измениться. Ставку и лимит банк назначает индивидуально, акции заканчиваются. Это не реклама и не рекомендация конкретной карты — сверяйте условия в тарифах банка.
          </p>
        </section>
      </Wrap>
      <Prose>
        <h2>Пять ловушек кредитных карт</h2>
        <ul>
          <li><b>Длинный льготный период — не для всех покупок.</b> «До 120–415 дней» часто действует на одну категорию, первый месяц или с платной подпиской.</li>
          <li><b>Проценты задним числом.</b> Не успели вернуть всё в срок — проценты обычно начисляются с даты покупки.</li>
          <li><b>Минимальный платёж.</b> Он защищает от просрочки, но не гасит долг быстро: при ставке 30–60% годовых большая часть уходит на проценты.</li>
          <li><b>Наличные и переводы.</b> Комиссия, проценты с первого дня, иногда повышенная ставка. Бесплатное снятие — чаще акция на время.</li>
          <li><b>Платы вместо процентов.</b> «0%» с ежедневной платой, платные подписки и продление льготного периода — тоже цена кредита.</li>
        </ul>
      </Prose>
      <Faq items={faq} />
    </>
  );
}
