import { analyzeMortgage, type MortgageInput, type MortgageResult } from "./mortgage";
import type { Prepayment } from "./loan";
import { annuityPayment } from "./loan";
import { Dec, d, ZERO } from "./money";

export interface Constraints {
  /** Сколько можно добавлять к платежу каждый месяц */
  monthlyExtra: number;
  /** Свободные сбережения сейчас */
  savings: number;
  /** Неприкосновенный резерв (подушка безопасности) */
  reserve: number;
  /** Ежемесячный доход семьи; 0 — не указан */
  monthlyIncome: number;
}

export type ScenarioId =
  | "base"
  | "monthly-term"
  | "monthly-payment"
  | "lump-term"
  | "lump-payment"
  | "combo-term"
  | "bigger-down"
  | "shorter-term";

export interface Scenario {
  id: ScenarioId;
  title: string;
  description: string;
  result: MortgageResult;
  /** Экономия относительно базового сценария: проценты + страховки + комиссии */
  saved: Dec;
  monthsSaved: number;
  /** Максимальная ежемесячная нагрузка: платёж + доплата + комиссии */
  maxMonthlyLoad: Dec;
  /** Сколько нужно внести разово из сбережений */
  lumpUsed: Dec;
  feasible: boolean;
  /** Почему сценарий не подходит */
  issue?: string;
  /** Доля дохода, уходящая на кредит, % (если доход указан) */
  loadShare: number | null;
}

export interface Optimization {
  scenarios: Scenario[];
  best: Scenario;
  /** Самый щадящий по нагрузке среди дающих экономию */
  safest: Scenario | null;
  freeCash: Dec;
}

const MAX_LOAD_SHARE = 50;

function maxLoad(result: MortgageResult, monthlyFees: number): Dec {
  return result.schedule.rows.reduce(
    (acc, r) => {
      const v = r.payment.plus(monthlyFees);
      return v.greaterThan(acc) ? v : acc;
    },
    ZERO,
  );
}

function monthlyLoad(result: MortgageResult, monthlyFees: number, monthlyExtra: number): Dec {
  // Доплата по графику тоже нагрузка: считаем первый платёж + регулярную доплату
  return maxLoad(result, monthlyFees).plus(monthlyExtra);
}

/**
 * Перебирает типовые стратегии и выбирает лучшую по экономии среди тех,
 * что укладываются в бюджет и не трогают резерв. Все цифры — из графика.
 */
export function optimize(input: MortgageInput, c: Constraints, mode: "planning" | "existing" = "planning"): Optimization {
  const fees = input.costs.monthlyFees;
  const freeCash = Dec.max(d(c.savings).minus(c.reserve), 0);
  const lump = freeCash.toNumber();
  const extra = Math.max(c.monthlyExtra, 0);
  const term = input.termMonths;
  const base = analyzeMortgage({ ...input, prepayments: [] });
  const baseCost = base.overpayment;
  const basePayment = base.schedule.firstPayment;
  const budget = basePayment.plus(extra).plus(fees);

  const monthly = (mode: Prepayment["mode"]): Prepayment => ({ kind: "monthly", amount: extra, month: 1, untilMonth: term, mode });
  const once = (mode: Prepayment["mode"]): Prepayment => ({ kind: "once", amount: lump, month: 1, mode });

  const make = (
    id: ScenarioId,
    title: string,
    description: string,
    result: MortgageResult,
    regularExtra: number,
    lumpUsed: number,
  ): Scenario => {
    const load = monthlyLoad(result, fees, regularExtra);
    const loadShare = c.monthlyIncome > 0 ? load.div(c.monthlyIncome).mul(100).toDecimalPlaces(1).toNumber() : null;
    let issue: string | undefined;
    if (load.greaterThan(budget.plus(0.01))) issue = "Платёж выше вашего ежемесячного бюджета";
    else if (d(lumpUsed).greaterThan(freeCash)) issue = "Не хватает свободных сбережений сверх резерва";
    else if (loadShare !== null && loadShare > MAX_LOAD_SHARE && id !== "base") issue = `На кредит уйдёт ${loadShare}% дохода — это опасно`;
    return {
      id,
      title,
      description,
      result,
      saved: baseCost.minus(result.overpayment),
      monthsSaved: base.schedule.months - result.schedule.months,
      maxMonthlyLoad: load,
      lumpUsed: d(lumpUsed),
      feasible: !issue,
      issue,
      loadShare,
    };
  };

  const scenarios: Scenario[] = [make("base", "Платить по графику", "Без досрочных платежей", base, 0, 0)];

  if (extra > 0) {
    scenarios.push(
      make("monthly-term", `+${fmt(extra)} ₽ в месяц, сокращать срок`, "Каждый месяц доплачивать к платежу, срок кредита уменьшается", analyzeMortgage({ ...input, prepayments: [monthly("term")] }), extra, 0),
      make("monthly-payment", `+${fmt(extra)} ₽ в месяц, уменьшать платёж`, "Каждый месяц доплачивать, банк пересчитывает платёж вниз", analyzeMortgage({ ...input, prepayments: [monthly("payment")] }), extra, 0),
    );
  }
  if (lump > 0) {
    if (mode === "planning") {
      const down = Math.min(lump, input.propertyPrice - input.downPayment - 1);
      scenarios.push(
        make("bigger-down", `Увеличить взнос на ${fmt(down)} ₽`, "Внести свободные сбережения сверх резерва в первоначальный взнос", analyzeMortgage({ ...input, downPayment: input.downPayment + down, prepayments: [] }), 0, down),
      );
    } else {
      scenarios.push(
        make("lump-term", `Разово ${fmt(lump)} ₽, сокращать срок`, "Внести свободные сбережения сверх резерва досрочно", analyzeMortgage({ ...input, prepayments: [once("term")] }), 0, lump),
        make("lump-payment", `Разово ${fmt(lump)} ₽, уменьшать платёж`, "Внести сбережения и снизить ежемесячный платёж", analyzeMortgage({ ...input, prepayments: [once("payment")] }), 0, lump),
      );
    }
    if (extra > 0) {
      const combo: Prepayment[] = mode === "planning" ? [monthly("term")] : [once("term"), monthly("term")];
      const comboInput = mode === "planning"
        ? { ...input, downPayment: input.downPayment + Math.min(lump, input.propertyPrice - input.downPayment - 1) }
        : input;
      scenarios.push(
        make("combo-term", "Сбережения сразу + доплата каждый месяц", "Оба способа вместе, срок сокращается", analyzeMortgage({ ...comboInput, prepayments: combo }), extra, lump),
      );
    }
  }

  // Самый короткий срок, при котором платёж укладывается в бюджет
  if (extra > 0) {
    const loan = d(input.propertyPrice).minus(input.downPayment);
    let shortest = term;
    for (let m = term - 12; m >= 12; m -= 12) {
      if (annuityPayment(loan, input.annualRate, m).plus(fees).greaterThan(budget)) break;
      shortest = m;
    }
    if (shortest < term && input.paymentType === "annuity") {
      scenarios.push(
        make("shorter-term", `Взять кредит на ${shortest / 12} ${yearsWord(shortest / 12)}`, "Сразу оформить более короткий срок: платёж выше, но в пределах бюджета. Минус — нет запаса гибкости", analyzeMortgage({ ...input, termMonths: shortest, prepayments: [] }), 0, 0),
      );
    }
  }

  const feasible = scenarios.filter((s) => s.feasible);
  const best = feasible.reduce((a, s) => (s.saved.greaterThan(a.saved) ? s : a), feasible[0] ?? scenarios[0]);
  // «Запас прочности» — только варианты, которые снижают платёж и не связывают обязательствами
  const flexible: ScenarioId[] = ["monthly-payment", "lump-payment", "bigger-down"];
  const gaining = feasible.filter((s) => s.saved.greaterThan(0) && flexible.includes(s.id));
  const safest = gaining.length
    ? gaining.reduce((a, s) => (s.maxMonthlyLoad.lessThan(a.maxMonthlyLoad) ? s : a))
    : null;
  return { scenarios, best, safest, freeCash };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function yearsWord(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "год";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "года";
  return "лет";
}

/** Таблица «срок → платёж → переплата» для выбора оптимального срока. */
export function termTable(input: MortgageInput, termsYears: number[]) {
  return termsYears.map((years) => {
    const r = analyzeMortgage({ ...input, termMonths: years * 12, prepayments: [] });
    return { years, payment: r.schedule.firstPayment, overpayment: r.overpayment, interest: r.schedule.totalInterest };
  });
}
