/**
 * Bridge module to break the circular dependency between main.ts and ipc/workspace.ts.
 * main.ts registers the callback; workspace.ts calls it.
 */

let _refreshTrayMenu: (() => void) | null = null;

export function setTrayRefreshCallback(fn: () => void): void {
  _refreshTrayMenu = fn;
}

export function refreshTrayMenu(): void {
  _refreshTrayMenu?.();
}
