import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';
import { safeLocalGet, safeLocalRemove, safeLocalSet } from './storage.util';

export interface OrganizationSummary {
  id: string;
  title: string;
  color: string;
  createdAt: string;
  stats?: { teams: number; agents: number; cards: number };
}

const ACTIVE_ORG_KEY = 'agelo.activeOrgId';

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private api = inject(ApiService);

  readonly orgs = signal<OrganizationSummary[]>([]);
  readonly activeOrgId = signal<string | null>(safeLocalGet(ACTIVE_ORG_KEY));

  async refresh() {
    const list = await firstValueFrom(
      this.api.get<OrganizationSummary[]>('/organizations'),
    );
    this.orgs.set(list);
    if (!this.activeOrgId() && list.length) {
      this.setActive(list[0].id);
    }
    return list;
  }

  setActive(id: string | null) {
    if (id) safeLocalSet(ACTIVE_ORG_KEY, id);
    else safeLocalRemove(ACTIVE_ORG_KEY);
    this.activeOrgId.set(id);
  }

  current(): OrganizationSummary | null {
    const id = this.activeOrgId();
    return this.orgs().find((o) => o.id === id) ?? null;
  }
}
