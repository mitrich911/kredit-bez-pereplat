"use client";

import { useSyncExternalStore } from "react";

type ThemeMode = "system" | "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getMode(): ThemeMode {
  const mode = document.documentElement.dataset.themeMode;
  return mode === "light" || mode === "dark" ? mode : "system";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "system" as ThemeMode);

  function select(next: ThemeMode) {
    document.documentElement.dataset.themeMode = next;
    document.documentElement.dataset.theme = next === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : next;
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
    listeners.forEach((listener) => listener());
  }

  return (
    <select
      aria-label="Цветовая схема"
      value={mode}
      onChange={(event) => select(event.target.value as ThemeMode)}
      className="max-w-28 rounded-lg border border-border bg-surface px-2 py-2.5 text-sm text-text sm:max-w-none"
    >
      <option value="system">Как в системе</option>
      <option value="light">Светлая</option>
      <option value="dark">Тёмная</option>
    </select>
  );
}
