import Decimal from "decimal.js";

// Отдельный конструктор, чтобы настройки точности не зависели от чужого кода.
export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof Dec>;

export type Num = Dec | number | string;

export const ZERO = new Dec(0);

export function d(value: Num): Dec {
  return value instanceof Dec ? value : new Dec(value);
}

/** Округление до копеек по правилам арифметики (половина — вверх). */
export function kop(value: Num): Dec {
  return d(value).toDecimalPlaces(2, Dec.ROUND_HALF_UP);
}

/** Деньги наружу (API, интерфейс) отдаём числом с двумя знаками. */
export function money(value: Num): number {
  return kop(value).toNumber();
}

export function sum(values: Num[]): Dec {
  return values.reduce<Dec>((acc, v) => acc.plus(d(v)), ZERO);
}

export function max(a: Dec, b: Dec): Dec {
  return a.greaterThan(b) ? a : b;
}

export function min(a: Dec, b: Dec): Dec {
  return a.lessThan(b) ? a : b;
}
