// Lightweight HTTP client used by the e2e suite for direct backend calls
// (e.g. seeding state via API, hitting MCP endpoints with API keys).
export interface ApiOptions {
  token?: string;
  apiKey?: string;
  expectStatus?: number;
}

/**
 * Raw HTTP response surface for tests that need to inspect status codes,
 * response headers, or the raw bytes (file downloads). Used by the
 * negative-path API tests and the files download header assertions.
 */
export interface RawResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  text: string;
  json: any;
  bytes: ArrayBuffer;
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    opts: ApiOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      // undici keep-alive sockets occasionally fail on Windows when the
      // server closes its end first. Force a fresh connection per call so
      // the suite stays deterministic.
      connection: 'close',
    };
    if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
    if (opts.apiKey) headers['authorization'] = `ApiKey ${opts.apiKey}`;

    const res = await fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const json = text ? safeJson(text) : null;

    if (opts.expectStatus !== undefined) {
      if (res.status !== opts.expectStatus) {
        throw new Error(
          `${method} ${path} expected ${opts.expectStatus}, got ${res.status}: ${text}`,
        );
      }
    } else if (!res.ok) {
      throw new Error(`${method} ${path} failed ${res.status}: ${text}`);
    }
    return json as T;
  }

  /**
   * Issue an HTTP call and return the raw response surface — never
   * throws on non-2xx so the caller can assert specific failure codes
   * (409 conflicts, 400 validation errors, 403 auth gates) in negative
   * scenarios. Also exposes headers + raw bytes for file-download
   * coverage.
   */
  async requestRaw(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    opts: ApiOptions = {},
  ): Promise<RawResponse> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      connection: 'close',
    };
    if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
    if (opts.apiKey) headers['authorization'] = `ApiKey ${opts.apiKey}`;

    const res = await fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const bytes = await res.arrayBuffer();
    // Try to recover the text body for callers asserting on JSON
    // payloads — fall back to "" if the bytes aren't UTF-8.
    let text = '';
    try {
      text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch { /* binary body */ }
    const json = text ? safeJson(text) : null;

    const headerMap: Record<string, string> = {};
    res.headers.forEach((v, k) => { headerMap[k.toLowerCase()] = v; });

    return {
      status: res.status,
      ok: res.ok,
      headers: headerMap,
      text,
      json,
      bytes,
    };
  }

  get<T = any>(p: string, o?: ApiOptions) { return this.request<T>('GET', p, undefined, o); }
  post<T = any>(p: string, b?: unknown, o?: ApiOptions) { return this.request<T>('POST', p, b, o); }
  patch<T = any>(p: string, b?: unknown, o?: ApiOptions) { return this.request<T>('PATCH', p, b, o); }
  delete<T = any>(p: string, o?: ApiOptions) { return this.request<T>('DELETE', p, undefined, o); }

  postRaw(p: string, b?: unknown, o?: ApiOptions) { return this.requestRaw('POST', p, b, o); }
  getRaw(p: string, o?: ApiOptions) { return this.requestRaw('GET', p, undefined, o); }
  patchRaw(p: string, b?: unknown, o?: ApiOptions) { return this.requestRaw('PATCH', p, b, o); }
  deleteRaw(p: string, o?: ApiOptions) { return this.requestRaw('DELETE', p, undefined, o); }
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      // Brief backoff — most flakes recover on the second try.
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}
