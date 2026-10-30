import type { z } from "zod";
import { Dec } from "../finance/money";

/** Переводит результат движка в JSON: Decimal → число с копейками, Map → объект. */
export function toJson(value: unknown): unknown {
  if (value instanceof Dec) return value.toDecimalPlaces(2).toNumber();
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [String(k), toJson(v)]));
  if (Array.isArray(value)) return value.map(toJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJson(v)]));
  }
  return value;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export function preflight() {
  return new Response(null, { status: 204, headers });
}

/** Общая обёртка: валидация входа, расчёт, понятные ошибки на русском. */
export async function handle<S extends z.ZodType>(req: Request, schema: S, run: (input: z.infer<S>) => unknown) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Тело запроса должно быть JSON" }, { status: 400, headers });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Некорректные параметры", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422, headers },
    );
  }
  try {
    return Response.json(
      { result: toJson(run(parsed.data)), disclaimer: "Оценка по введённым данным. Точные условия — в договоре с банком." },
      { headers },
    );
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Ошибка расчёта" }, { status: 422, headers });
  }
}
