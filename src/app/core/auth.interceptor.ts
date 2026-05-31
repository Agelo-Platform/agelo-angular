import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { resolveApiBase } from './api-base';

/**
 * Attaches the JWT bearer token *only* to calls that target the Agelo API.
 * Sending the token to a third-party origin (e.g. a future image upload
 * to S3, or telemetry to a SaaS) would leak it. This guard checks the
 * outgoing URL against the resolved API base before cloning the request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const apiBase = resolveApiBase();
  const targetsApi = isOurApi(req.url, apiBase);

  const cloned = token && targetsApi
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err) => {
      // Only treat 401s from our own API as a session expiry — third-party
      // 401s should not log the user out.
      if (err?.status === 401 && targetsApi) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};

function isOurApi(url: string, apiBase: string): boolean {
  // Same-origin relative URL (`/foo`, `foo`) — assume API.
  if (!/^https?:\/\//i.test(url)) return true;
  try {
    const target = new URL(url);
    const base = new URL(apiBase);
    return target.origin === base.origin;
  } catch {
    return false;
  }
}
