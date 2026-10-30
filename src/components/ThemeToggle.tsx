"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  // На сервере тема неизвестна — кнопка рисуется нейтрально, затем уточняется.
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    listeners.forEach((l) => l());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-lg border border-border bg-surface text-lg"
      aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
      title="Сменить тему"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : theme === "light" ? "☾" : "◐"}</span>
    </button>
  );
}
