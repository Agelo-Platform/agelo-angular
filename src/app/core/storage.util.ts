/**
 * Small wrapper around `window.localStorage` that swallows the cases where
 * storage is unavailable: SSR, sandboxed iframes, strict CSP, private mode
 * with storage disabled, etc. Every read/write is best-effort.
 */
export function safeLocalGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalSet(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function safeLocalRemove(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
