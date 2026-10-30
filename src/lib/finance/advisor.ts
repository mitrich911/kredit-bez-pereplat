import type { Optimization, Scenario } from "./optimizer";
import type { MortgageResult } from "./mortgage";
import { formatInRuMonth } from "./dates";

// Финансовый разбор собирается из готовых расчётов по шаблонам.
// Ни одна цифра здесь не придумывается — всё берётся из графиков.

export interface AdviceBlock {
  tone: "info" | "good" | "warn";
  title: string;
  text: string;
}

const rub = (v: { toNumber(): number } | number) =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(typeof v === "number" ? v : v.toNumber())} ₽`;

function months(n: number): string {
  const y = Math.floor(n / 12);
  const m = n % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${plural(y, "год", "года", "лет")}`);
  if (m) parts.push(`${m} ${plural(m, "месяц", "месяца", "месяцев")}`);
  return parts.join(" ") || "0 месяцев";
}

export function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function adviseMortgage(price: number, base: MortgageResult, opt: Optimization): AdviceBlock[] {
  const blocks: AdviceBlock[] = [];
  const interestShare = base.schedule.totalInterest.div(base.loanAmount).mul(100).round().toNumber();
  blocks.push({
    tone: "info",
    title: "Сколько вы заплатите на самом деле",
    text:
      `Квартира стоит ${rub(price)}, но при выбранных условиях вся покупка обойдётся в ${rub(base.fullCost)}. ` +
      `Банку вы вернёте ${rub(base.loanAmount)} долга и ${rub(base.schedule.totalInterest)} процентов — ` +
      `это ${interestShare}% от суммы кредита сверху.` +
      (base.insurance.greaterThan(0) ? ` Страховки за весь срок — ещё ${rub(base.insurance)}.` : "") +
      (base.fees.greaterThan(0) ? ` Комиссии и разовые расходы — ${rub(base.fees)}.` : ""),
  });

  const firstYears = base.years.slice(0, 5);
  const fiveInterest = firstYears.reduce((a, y) => a + y.interest.toNumber(), 0);
  const fivePaid = firstYears.reduce((a, y) => a + y.interest.toNumber() + y.principal.toNumber(), 0);
  if (fivePaid > 0) {
    blocks.push({
      tone: "info",
      title: "Где возникает переплата",
      text:
        `Главная причина переплаты — длинный срок: проценты начисляются на остаток долга, а он долго остаётся большим. ` +
        `За первые ${firstYears.length} ${plural(firstYears.length, "год", "года", "лет")} из ${rub(fivePaid)} платежей ` +
        `${Math.round((fiveInterest / fivePaid) * 100)}% уходит на проценты и только остальное — на сам долг. ` +
        `Поэтому досрочные платежи в первые годы дают наибольший эффект.`,
    });
  }

  const alternatives = opt.scenarios.filter((s) => s.id !== "base");
  if (alternatives.length) {
    const lines = alternatives
      .map((s, i) => `${i + 1}. ${s.title}: ${describe(s)}${s.feasible ? "" : ` — не подходит: ${s.issue?.toLowerCase()}`}.`)
      .join(" ");
    blocks.push({ tone: "info", title: "Что можно сделать", text: lines });
  }

  const best = opt.best;
  if (best.id !== "base" && best.saved.greaterThan(0)) {
    blocks.push({
      tone: "good",
      title: `Наиболее выгодно при вашем бюджете: ${best.title.toLowerCase()}`,
      text:
        `Экономия — ${rub(best.saved)}` +
        (best.monthsSaved > 0 ? `, кредит закроется на ${months(best.monthsSaved)} раньше — ${formatInRuMonth(best.result.schedule.payoffDate)}` : "") +
        `. Нагрузка — до ${rub(best.maxMonthlyLoad)} в месяц` +
        (best.loadShare !== null ? ` (${best.loadShare}% дохода)` : "") +
        ", подушка безопасности остаётся нетронутой.",
    });
    if (opt.safest && opt.safest.id !== best.id) {
      const rows = opt.safest.result.schedule.rows;
      const later = rows[Math.min(12, rows.length - 1)].payment;
      blocks.push({
        tone: "info",
        title: "Если важнее запас прочности",
        text:
          `${opt.safest.title}: экономия меньше — ${rub(opt.safest.saved)}, зато обязательный платёж снижается: ` +
          `через год он составит ${rub(later)} вместо ${rub(base.schedule.rows[Math.min(12, base.schedule.rows.length - 1)].payment)}. ` +
          `Если доход упадёт, доплаты можно прекратить и платить меньше.`,
      });
    }
  } else {
    blocks.push({
      tone: "warn",
      title: "Сэкономить в рамках бюджета не получится",
      text: "Укажите сумму, которую готовы доплачивать каждый месяц, или свободные сбережения сверх резерва — и мы посчитаем варианты.",
    });
  }

  const risky = opt.scenarios.find((s) => s.loadShare !== null && s.loadShare > 50 && s.id === "base");
  if (risky) {
    blocks.push({
      tone: "warn",
      title: "Высокая нагрузка на бюджет",
      text: `Уже обычный платёж забирает ${risky.loadShare}% дохода. Банки считают опасной нагрузку выше 50%. Прежде чем гасить досрочно, соберите резерв на 3–6 месяцев платежей и расходов.`,
    });
  }
  return blocks;
}

function describe(s: Scenario): string {
  const parts = [`экономия ${rub(s.saved)}`];
  if (s.monthsSaved > 0) parts.push(`на ${months(s.monthsSaved)} быстрее`);
  parts.push(`платёж до ${rub(s.maxMonthlyLoad)}`);
  return parts.join(", ");
}

export { months as formatMonths };
