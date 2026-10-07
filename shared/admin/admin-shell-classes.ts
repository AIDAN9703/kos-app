import { useSyncExternalStore } from "react";

/** Class that scopes admin CSS variables onto an element (for portaled UI). */
export function adminShellClassName() {
  return "admin-theme";
}

/** Whether the live page is inside the admin shell (client-only). */
export function isAdminShellActive(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("[data-admin-theme]"));
}

const noSubscription = () => () => {};

/**
 * "admin-theme" when the page is inside the admin shell, "" elsewhere (and on
 * the server). Portaled content (dialogs, sheets) renders outside the shell's
 * DOM, so it re-applies the admin variables with this.
 */
export function useAdminShellClassName(): string {
  return useSyncExternalStore(
    noSubscription,
    () => (isAdminShellActive() ? adminShellClassName() : ""),
    () => ""
  );
}
