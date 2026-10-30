"use client";

import { useId, useState } from "react";

/**
 * Значок «?» с короткой справкой. Показывается при наведении, при фокусе
 * с клавиатуры и по нажатию на телефоне; закрывается повторным нажатием или Esc.
 * Справка растягивается по ширине ближайшего блока с `relative` (поле, строка),
 * поэтому не вылезает за край экрана даже у значка возле границы.
 */
export function Hint({ text, label = "Что это?" }: { text: string; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="group/hint inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="ml-1 grid size-[18px] shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-[11px] leading-none font-bold text-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute inset-x-0 top-full z-40 mt-1 max-w-md rounded-xl border border-border bg-surface p-3 text-left text-[13px] leading-snug font-normal text-text shadow-lg ${
          open ? "block" : "hidden group-hover/hint:block group-focus-within/hint:block"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
