import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { resolveApiBase } from './api-base';

// Lightweight wrapper that prefixes the base URL.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = resolveApiBase();

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    let p = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => (p = p.set(k, String(v))));
    }
    return this.http.get<T>(`${this.base}${path}`, { params: p });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body ?? {});
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body ?? {});
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }
}
