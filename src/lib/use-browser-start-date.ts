"use client";

import { useSyncExternalStore } from "react";
import { browserStartDate, browserToday } from "./browser-date";

const noUpdates = () => () => {};

export function useBrowserStartDate(serverDefault: string): string {
  return useSyncExternalStore(noUpdates, browserStartDate, () => serverDefault);
}

export function useBrowserToday(): string | null {
  return useSyncExternalStore(noUpdates, browserToday, () => null);
}
