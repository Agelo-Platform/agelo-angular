import { environment } from '../../environments/environment';

/**
 * Resolves the API base URL at runtime so the SPA can be deployed once and
 * point at different backends in different environments.
 *
 * Priority:
 * 1. `window.__AGELO_API__` — injected by the e2e harness or a runtime config
 *    snippet to override the build-time value.
 * 2. `environment.apiBaseUrl` — baked in at build time (default for normal
 *    `docker compose up` deployments).
 */
export function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const override = (window as any).__AGELO_API__;
    if (override && typeof override === 'string') return override;
  }
  return environment.apiBaseUrl;
}
