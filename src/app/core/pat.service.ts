import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Logical surface area a Personal Access Token can carry permissions
 * for. Mirrors the `PatSection` enum on the backend; see
 * `Agelo.Domain.Identity.PatPermission` for the source of truth. The
 * server tolerates unknown keys, so adding a section here without a
 * matching backend deploy is safe — that section just won't take effect.
 */
export type PatSection =
  | 'organizations'
  | 'teams'
  | 'agents'
  | 'boardFlow'
  | 'cards'
  | 'comments'
  | 'files'
  | 'prompts'
  | 'mcpServers'
  | 'permissions'
  | 'settings'
  | 'presets'
  | 'analytics'
  | 'archive'
  | 'admin';

/** Display order for the create dialog's permission matrix. */
export const PAT_SECTIONS: ReadonlyArray<{ key: PatSection; label: string }> = [
  { key: 'organizations', label: 'Organizations' },
  { key: 'teams', label: 'Teams' },
  { key: 'agents', label: 'Agents' },
  { key: 'boardFlow', label: 'Board flow' },
  { key: 'cards', label: 'Cards' },
  { key: 'comments', label: 'Comments' },
  { key: 'files', label: 'Files' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'mcpServers', label: 'MCP servers' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'settings', label: 'Settings' },
  { key: 'presets', label: 'Presets' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'archive', label: 'Archive' },
  { key: 'admin', label: 'Admin' },
];

export type PatLevel = 'none' | 'read' | 'write';

export type PatPermissions = Partial<Record<PatSection, PatLevel>>;

export interface PatListItem {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  permissions: PatPermissions;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PatCreated {
  id: string;
  name: string;
  prefix: string;
  rawToken: string;
  permissions: PatPermissions;
  expiresAt: string | null;
  createdAt: string;
}

export interface PatUpdated {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
}

export interface CreatePatBody {
  name: string;
  permissions: PatPermissions;
  expiresAt?: string | null;
}

export interface UpdatePatBody {
  name?: string;
  isActive?: boolean;
}

/**
 * Typed wrapper over the four PAT REST endpoints. Mirrors the shape of
 * the in-page `ApiService` used by the api-keys page so the two slices
 * read symmetrically. The raw token returned from `create` is the only
 * time the cleartext value will ever be exposed; the parent page is
 * responsible for surfacing it once and discarding it after.
 */
@Injectable({ providedIn: 'root' })
export class PatService {
  private api = inject(ApiService);
  private base = '/settings/personal-access-tokens';

  list(): Observable<PatListItem[]> {
    return this.api.get<PatListItem[]>(this.base);
  }

  create(body: CreatePatBody): Observable<PatCreated> {
    return this.api.post<PatCreated>(this.base, body);
  }

  update(id: string, body: UpdatePatBody): Observable<PatUpdated> {
    return this.api.patch<PatUpdated>(`${this.base}/${id}`, body);
  }

  revoke(id: string): Observable<{ ok: true }> {
    return this.api.delete<{ ok: true }>(`${this.base}/${id}`);
  }
}
