"use client";

import { useId, useState, type ReactNode } from "react";
import { Hint } from "./Hint";

const parse = (raw: string) => {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : 0;
};

const display = (v: number, decimals: number) =>
  v.toLocaleString("ru-RU", { maximumFractionDigits: decimals, useGrouping: true });

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  decimals = 0,
  min = 0,
  max,
  info,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: ReactNode;
  decimals?: number;
  min?: number;
  max?: number;
  /** Справка для значка «?» */
  info?: string;
}) {
  const id = useId();
  // Пока поле в фокусе, показываем то, что набирает человек; иначе — отформатированное значение
  const [text, setText] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <LabelRow htmlFor={id} label={label} info={info} />
      <div className="flex items-center rounded-xl border border-border bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <input
          id={id}
          inputMode={decimals ? "decimal" : "numeric"}
          className="tabular w-full min-w-0 bg-transparent px-3.5 py-3 text-[17px] outline-none"
          value={text ?? display(value, decimals)}
          onFocus={() => setText(display(value, decimals))}
          onBlur={() => setText(null)}
          onChange={(e) => {
            setText(e.target.value);
            let v = parse(e.target.value);
            if (v < min) v = min;
            if (max !== undefined && v > max) v = max;
            onChange(v);
          }}
        />
        {suffix && <span className="shrink-0 whitespace-nowrap pr-3.5 text-muted">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Подпись поля со значком «?»; `relative` — якорь для всплывающей справки. */
function LabelRow({ htmlFor, label, info }: { htmlFor?: string; label: string; info?: string }) {
  return (
    <div className="relative flex items-center">
      {htmlFor ? <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label> : <span className="text-sm font-medium">{label}</span>}
      {info && <Hint text={info} label={`Что такое «${label}»?`} />}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  info,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  info?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      {/* legend для скринридеров; видимая подпись — рядом, со значком справки */}
      <legend className="sr-only">{label}</legend>
      <LabelRow label={label} info={info} />
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-2 py-2.5 text-sm font-medium transition ${
              value === o.value ? "bg-surface text-text shadow-sm" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange, info }: { label: string; checked: boolean; onChange: (v: boolean) => void; info?: string }) {
  return (
    <div className="relative flex items-center">
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--accent)]" />
        {label}
      </label>
      {info && <Hint text={info} label={`Что такое «${label}»?`} />}
    </div>
  );
}

export function DateField({ label, value, onChange, info }: { label: string; value: string; onChange: (v: string) => void; info?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <LabelRow htmlFor={id} label={label} info={info} />
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="rounded-xl border border-border bg-surface px-3.5 py-3 text-[17px] outline-none focus:border-accent"
      />
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`@container rounded-2xl border border-border bg-surface p-4 sm:p-6 ${className}`}>{children}</section>;
}

export function Stat({
  label,
  value,
  tone = "neutral",
  sub,
  info,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "loss" | "good";
  sub?: string;
  info?: string;
}) {
  const color = tone === "loss" ? "text-loss" : tone === "good" ? "text-accent" : "text-text";
  return (
    <div className="relative rounded-xl bg-surface-2 p-3.5">
      <p className="flex items-center text-xs text-muted">{label}{info && <Hint text={info} label={`Что такое «${label}»?`} />}</p>
      <p className={`tabular mt-1 text-lg leading-tight font-bold break-words sm:text-xl 2xl:text-2xl ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Details({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
        {title}
        <span aria-hidden className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      {/* Колонки зависят от ширины блока, а не экрана: в узкой боковой панели поля идут в одну колонку */}
      <div className="@container border-t border-border p-4">
        <div className="grid gap-4 @md:grid-cols-2">{children}</div>
      </div>
    </details>
  );
}

export function DemoNote() {
  return (
    <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      Цифры в полях — пример для демонстрации, а не рыночные ставки. Введите условия из вашего предложения банка.
    </p>
  );
}
