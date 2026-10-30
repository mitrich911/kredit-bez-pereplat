import { site, tools } from "@/lib/site";

// Краткое описание сайта для ИИ-агентов (формат llms.txt).
export function GET() {
  const body = `# ${site.name}

> ${site.tagline}. Независимые калькуляторы для жителей России: ипотека, автокредит, крупные покупки, сравнение предложений банков, рефинансирование. Все суммы считаются алгоритмами с точной десятичной арифметикой, а не генерируются ИИ.

## Инструменты
${tools.map((t) => `- [${t.title}](${site.url}${t.href}): ${t.text}`).join("\n")}

## Методика и API
- [Методика расчётов](${site.url}/metodika): формулы аннуитета, начисление процентов по дням, досрочное погашение, ПСК по 353-ФЗ
- [API](${site.url}/api-docs): POST JSON на ${site.url}/api/v1/{mortgage,compare,refinance,car,purchase}

## Важно
- Сайт не публикует ставки банков: условия вводит пользователь.
- Результаты — оценка по введённым данным; точный график и ПСК указаны в договоре.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
