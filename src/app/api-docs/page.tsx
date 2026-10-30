import type { Metadata } from "next";
import { Prose, ToolHeader } from "@/components/Page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "API калькуляторов кредитов для разработчиков и ИИ-агентов",
  description: "Бесплатный JSON API: ипотека с досрочным погашением, сравнение предложений, рефинансирование, стоимость владения автомобилем, рассрочка.",
  alternates: { canonical: "/api-docs" },
};

const example = `curl -X POST ${site.url}/api/v1/mortgage \\
  -H "Content-Type: application/json" \\
  -d '{
    "propertyPrice": 7000000,
    "downPayment": 1400000,
    "annualRate": 16,
    "termMonths": 240,
    "startDate": "2026-12-01",
    "costs": { "insurancePercent": 0.5, "oneTimeCosts": 50000 },
    "prepayments": [{ "kind": "monthly", "amount": 5000, "month": 1, "mode": "term" }],
    "constraints": { "monthlyExtra": 5000, "savings": 600000, "reserve": 400000 }
  }'`;

const endpoints = [
  ["/api/v1/mortgage", "Ипотека: платёж, переплата, полная стоимость, ПСК, эффект досрочных платежей; с constraints — сценарии и разбор. includeSchedule: true добавляет график."],
  ["/api/v1/compare", "Сравнение 1–10 предложений: { startDate, offers: [{ name, amount, annualRate, termMonths, insurancePercent, oneTimeFees, extraServices, extraServicesFinanced, … }] }"],
  ["/api/v1/refinance", "Рефинансирование: { balance, currentRate, remainingMonths, newRate, newTermMonths, switchCosts, startDate }"],
  ["/api/v1/car", "Стоимость владения автомобилем: { car, financing, options }"],
  ["/api/v1/purchase", "Крупная покупка: { cashPrice, startDate, credit?, installment?, saving? }"],
];

export default function Page() {
  return (
    <>
      <ToolHeader title="API для разработчиков и ИИ-агентов" path="/api-docs" lead="Те же алгоритмы, что и в калькуляторах, доступны через JSON API. Бесплатно и без ключа." />
      <Prose>
        <h2>Как вызывать</h2>
        <p>Метод <b>POST</b>, тело — JSON, ответ — <code>{"{ result, disclaimer }"}</code>. Суммы в рублях с копейками, ставки — в процентах годовых, даты — ГГГГ-ММ-ДД. При ошибке во входных данных — статус 422 и список полей с описанием.</p>
        <div className="space-y-3">
          {endpoints.map(([path, text]) => (
            <div key={path} className="rounded-xl border border-border bg-surface p-4">
              <code className="font-semibold text-accent">POST {path}</code>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
        <h2>Пример</h2>
        <pre className="overflow-x-auto rounded-xl bg-surface-2 p-4 text-sm"><code>{example}</code></pre>
        <p>Краткое описание сайта для ИИ-агентов: <a href="/llms.txt" className="text-accent underline">/llms.txt</a>. Полная схема полей — в разделах выше и в README проекта.</p>
      </Prose>
    </>
  );
}
