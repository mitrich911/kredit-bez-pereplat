import { annuityPayment } from "@/lib/finance/loan";

// Проверка для Docker healthcheck: сервер жив и движок считает эталонный пример.
export function GET() {
  const ok = annuityPayment(1_000_000, 12, 12).toFixed(2) === "88848.79";
  return Response.json({ ok }, { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}
