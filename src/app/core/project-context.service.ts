import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';
import { safeLocalGet, safeLocalRemove, safeLocalSet } from './storage.util';

export interface Project {
  id: string;
  orgId: string;
  title: string;
  color: string;
  cardCount?: number;
  createdAt: string;
}

const ACTIVE_PROJECT_KEY = 'agelo.activeProjectId';

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  private api = inject(ApiService);

  readonly projects = signal<Project[]>([]);
  readonly activeProjectId = signal<string | null>(safeLocalGet(ACTIVE_PROJECT_KEY));

  async refresh(orgId: string): Promise<Project[]> {
    if (!orgId) {
      this.projects.set([]);
      return [];
    }
    const list = await firstValueFrom(
      this.api.get<Project[]>(`/organizations/${orgId}/projects`),
    );
    this.projects.set(list);
    // If the persisted active project doesn't belong to this org, snap to
    // the first one.
    const active = this.activeProjectId();
    if (!active || !list.find((p) => p.id === active)) {
      this.setActive(list[0]?.id ?? null);
    }
    return list;
  }

  setActive(id: string | null) {
    if (id) safeLocalSet(ACTIVE_PROJECT_KEY, id);
    else safeLocalRemove(ACTIVE_PROJECT_KEY);
    this.activeProjectId.set(id);
  }

  current(): Project | null {
    const id = this.activeProjectId();
    return this.projects().find((p) => p.id === id) ?? null;
  }
}
