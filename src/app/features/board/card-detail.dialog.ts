import {
  Component, Input, OnInit, computed, inject, signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { MarkdownModule } from 'ngx-markdown';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/dialogs/dialog.service';
import { ToastService } from '../../shared/dialogs/toast.service';
import { BoardFlow, CustomField } from '../board-flow/board-flow.component';
import { MarkdownEditorComponent } from '../../shared/editors/markdown-editor.component';
import { ShortIdComponent } from '../../shared/ui/short-id.component';
import { resolveApiBase } from '../../core/api-base';

interface CardDetail {
  id: string;
  title: string;
  typeId: string;
  columnId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  type: {
    id: string;
    name: string;
    commentsEnabled: boolean;
    customFields: CustomField[];
  };
  column: { id: string; name: string };
  fieldValues: { fieldId: string; value: any }[];
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  authorType: 'user' | 'agent';
  user?: { displayName: string };
  agent?: { title: string };
  replies?: CommentItem[];
}

interface PromptOption {
  id: string;
  title: string;
  versions: { id: string; version: string }[];
}

interface HistoryEntry {
  id: string;
  cardId: string;
  userId: string | null;
  userLabel: string;
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTabsModule,
    NzTagModule, NzToolTipModule, NzDividerModule, NzFormModule, NzSpinModule,
    NzBadgeModule, NzAvatarModule, NzDropDownModule, NzEmptyModule,
    MarkdownModule, MarkdownEditorComponent, ShortIdComponent,
  ],
  template: `
    <div class="cd">
      <nz-spin [nzSpinning]="loading()" nzWrapClassName="cd-spin">
        @if (card(); as c) {
          <div class="cd-topbar">
            <nz-tag>{{ c.type.name }}</nz-tag>
            <span class="spacer"></span>
            <nz-tag [nzColor]="laneColor(c.column.name)">{{ c.column.name }}</nz-tag>
            <a nz-dropdown [nzDropdownMenu]="cardMenu" nzPlacement="bottomRight" class="more-btn" nz-tooltip="More actions">
              <button nz-button nzType="text">
                <span nz-icon nzType="more"></span>
              </button>
            </a>
            <nz-dropdown-menu #cardMenu="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item (click)="copyLink()">
                  <span nz-icon nzType="link"></span> Copy share link
                </li>
                <li nz-menu-item (click)="copyId()">
                  <span nz-icon nzType="copy"></span> Copy card id
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item nzDanger (click)="remove()">
                  <span nz-icon nzType="delete"></span> Delete card…
                </li>
              </ul>
            </nz-dropdown-menu>
            <button nz-button nzType="text" (click)="ref.close()" nz-tooltip="Close">
              <span nz-icon nzType="close"></span>
            </button>
          </div>

          <div class="cd-body">
            <div class="cd-main">
              <div class="title-row">
                <input
                  nz-input
                  class="title-input"
                  [ngModel]="titleDraft()" (ngModelChange)="titleDraft.set($event)"
                  placeholder="Card title"
                />
                @if (titleDirty()) {
                  <button nz-button nzType="primary" (click)="saveTitle()" [nzLoading]="busy()">
                    <span nz-icon nzType="save"></span> Save title
                  </button>
                }
              </div>

              <ng-template #detailsTab>
                <span nz-icon nzType="edit"></span> Details
              </ng-template>
              <ng-template #commentsTab>
                <span nz-icon nzType="bell"></span>
                Comments
                @if (commentCount()) {
                  <nz-badge [nzCount]="commentCount()" [nzStyle]="{ backgroundColor: '#0C66E4' }" class="cmt-badge"></nz-badge>
                }
              </ng-template>
              <ng-template #historyTab>
                <span nz-icon nzType="history"></span> History
                @if (history().length) {
                  <nz-badge [nzCount]="history().length" [nzStyle]="{ backgroundColor: '#475467' }" class="cmt-badge"></nz-badge>
                }
              </ng-template>

              <nz-tabset [nzAnimated]="false">
                <nz-tab [nzTitle]="detailsTab">
                  <div class="tab-pane">
                    @if (c.type.customFields.length === 0) {
                      <p class="muted">This card type has no custom fields.</p>
                    } @else {
                      <div class="fields">
                        @for (f of c.type.customFields; track f.id) {
                          <div class="field-row">
                            <label class="field-label">
                              {{ f.label }}
                              @if (f.required) { <span class="req">*</span> }
                              <nz-tag>{{ f.type }}</nz-tag>
                            </label>
                            @switch (f.type) {
                              @case ('datetime') {
                                <input
                                  nz-input
                                  type="datetime-local"
                                  [(ngModel)]="fieldDraft[f.id]"
                                />
                              }
                              @case ('time') {
                                <input
                                  nz-input
                                  type="time"
                                  [(ngModel)]="fieldDraft[f.id]"
                                />
                              }
                              @case ('prompt') {
                                <nz-select
                                  [(ngModel)]="fieldDraft[f.id]"
                                  nzMode="multiple"
                                  nzPlaceHolder="Pick prompt-version pairs"
                                  class="multi"
                                >
                                  @for (p of prompts(); track p.id) {
                                    @for (v of p.versions; track v.id) {
                                      <nz-option
                                        [nzValue]="p.id + '@' + v.version"
                                        [nzLabel]="p.title + ' v' + v.version"
                                      ></nz-option>
                                    }
                                  }
                                </nz-select>
                              }
                              @case ('multi_select') {
                                @if (f.name === 'required_mcp') {
                                  <nz-select
                                    [(ngModel)]="fieldDraft[f.id]"
                                    [nzMode]="'multiple'"
                                    nzPlaceHolder="Pick MCP servers"
                                    class="multi"
                                  >
                                    @for (m of mcpServers(); track m.id) {
                                      <nz-option [nzValue]="m.title" [nzLabel]="m.title"></nz-option>
                                    }
                                  </nz-select>
                                } @else {
                                  <nz-select
                                    [(ngModel)]="fieldDraft[f.id]"
                                    [nzMode]="'tags'"
                                    nzPlaceHolder="Type and press Enter to add"
                                    [nzOptions]="[]"
                                    [nzTokenSeparators]="[',']"
                                    class="multi"
                                  ></nz-select>
                                }
                              }
                              @case ('tags') {
                                <nz-select
                                  [(ngModel)]="fieldDraft[f.id]"
                                  [nzMode]="'tags'"
                                  nzPlaceHolder="Type and press Enter to add a tag"
                                  [nzOptions]="[]"
                                  [nzTokenSeparators]="[',']"
                                  class="multi"
                                ></nz-select>
                              }
                              @case ('link') {
                                <input
                                  nz-input
                                  type="url"
                                  [(ngModel)]="fieldDraft[f.id]"
                                  placeholder="https://…"
                                />
                                @if (fieldError(f, fieldDraft[f.id])) {
                                  <div class="field-err small">{{ fieldError(f, fieldDraft[f.id]) }}</div>
                                }
                              }
                              @case ('textarea') {
                                <app-markdown-editor
                                  [(ngModel)]="fieldDraft[f.id]"
                                  [name]="'fld-' + f.id"
                                  [compact]="true"
                                  height="220px"
                                ></app-markdown-editor>
                              }
                              @case ('file') {
                                <div class="files">
                                  @for (att of attachmentsByField[f.id] || []; track att.id) {
                                    <div class="file-chip">
                                      <span nz-icon nzType="file-text"></span>
                                      <a [href]="downloadUrl(att.id)" target="_blank" rel="noopener">{{ att.filename }}</a>
                                      <span class="muted small">{{ formatSize(att.sizeBytes) }}</span>
                                      <button nz-button nzType="text" nzSize="small" nzDanger (click)="deleteAttachment(att, f.id)" type="button">
                                        <span nz-icon nzType="delete"></span>
                                      </button>
                                    </div>
                                  } @empty {
                                    <span class="muted small">No files attached.</span>
                                  }
                                  <div>
                                    <button nz-button nzSize="small" (click)="picker.click()" type="button">
                                      <span nz-icon nzType="plus"></span> Attach files
                                    </button>
                                    <input #picker type="file" multiple hidden
                                      (change)="onFileChange($event, f.id)"
                                    />
                                  </div>
                                </div>
                              }
                              @case ('sub_cards') {
                                <div class="sub-cards">
                                  @for (sub of subCardsList(f.id); track sub.id) {
                                    <div class="sub-chip">
                                      <nz-tag>{{ sub.type?.name || 'Card' }}</nz-tag>
                                      <span class="sub-title">{{ sub.title }}</span>
                                      <app-short-id [id]="sub.id" label="card id"></app-short-id>
                                      <button nz-button nzType="text" nzSize="small" (click)="openSub(sub.id)" nz-tooltip="Open" type="button">
                                        <span nz-icon nzType="arrow-right"></span>
                                      </button>
                                      <button nz-button nzType="text" nzSize="small" nzDanger (click)="removeSubCard(f.id, sub.id)" nz-tooltip="Unlink sub-card" type="button">
                                        <span nz-icon nzType="close"></span>
                                      </button>
                                    </div>
                                  } @empty {
                                    <span class="muted small">No sub cards.</span>
                                  }
                                  <div class="sub-mode">
                                    <button
                                      nz-button nzSize="small" nzType="text"
                                      [class.active]="(subAddMode[f.id] || 'create') === 'create'"
                                      (click)="setSubMode(f.id, 'create')"
                                      type="button"
                                    >
                                      <span nz-icon nzType="plus"></span> New sub-card
                                    </button>
                                    <button
                                      nz-button nzSize="small" nzType="text"
                                      [class.active]="(subAddMode[f.id] || 'create') === 'link'"
                                      (click)="setSubMode(f.id, 'link')"
                                      type="button"
                                    >
                                      <span nz-icon nzType="link"></span> Link existing
                                    </button>
                                  </div>
                                  @if ((subAddMode[f.id] || 'create') === 'create') {
                                    <div class="sub-add">
                                      <nz-select [(ngModel)]="newSubType[f.id]" [name]="'st-' + f.id" nzPlaceHolder="Card type">
                                        @for (t of allCardTypes(); track t.id) {
                                          <nz-option [nzValue]="t.id" [nzLabel]="t.name"></nz-option>
                                        }
                                      </nz-select>
                                      <input nz-input [(ngModel)]="newSubTitle[f.id]" [name]="'sn-' + f.id" placeholder="Sub-card title" />
                                      <button nz-button nzSize="small" nzType="primary" (click)="addSubCard(f.id)" type="button" [disabled]="!newSubType[f.id] || !newSubTitle[f.id]?.trim()">
                                        <span nz-icon nzType="plus"></span> Create &amp; link
                                      </button>
                                    </div>
                                  } @else {
                                    <div class="sub-add">
                                      <nz-select
                                        [ngModel]="newSubType[f.id]"
                                        (ngModelChange)="onLinkTypeChange(f.id, $event)"
                                        [name]="'lt-' + f.id"
                                        nzPlaceHolder="Filter by type (optional)"
                                        nzAllowClear
                                      >
                                        @for (t of allCardTypes(); track t.id) {
                                          <nz-option [nzValue]="t.id" [nzLabel]="t.name"></nz-option>
                                        }
                                      </nz-select>
                                      <nz-select
                                        class="link-pick"
                                        [(ngModel)]="newSubTitle[f.id]"
                                        [name]="'lp-' + f.id"
                                        nzShowSearch
                                        nzPlaceHolder="Pick a card to link"
                                        [nzServerSearch]="false"
                                      >
                                        @for (card of linkableCards(f.id); track card.id) {
                                          <nz-option
                                            [nzValue]="card.id"
                                            [nzLabel]="card.title + ' (' + (card.type?.name || 'card') + ')'"
                                          ></nz-option>
                                        }
                                      </nz-select>
                                      <button
                                        nz-button nzSize="small" nzType="primary"
                                        (click)="linkExistingSubCard(f.id)"
                                        type="button"
                                        [disabled]="!newSubTitle[f.id]"
                                      >
                                        <span nz-icon nzType="link"></span> Link
                                      </button>
                                    </div>
                                  }
                                </div>
                              }
                              @default {
                                <input
                                  nz-input
                                  type="text"
                                  [(ngModel)]="fieldDraft[f.id]"
                                  [placeholder]="f.type"
                                />
                                @if (fieldError(f, fieldDraft[f.id])) {
                                  <div class="field-err small">{{ fieldError(f, fieldDraft[f.id]) }}</div>
                                }
                              }
                            }
                          </div>
                        }
                      </div>
                      <div class="save-row">
                        <button
                          nz-button
                          nzType="primary"
                          (click)="saveFields()"
                          [disabled]="!fieldsDirty() || busy()"
                          [nzLoading]="busy()"
                        >
                          <span nz-icon nzType="save"></span> Save changes
                        </button>
                        @if (!fieldsDirty()) {
                          <span class="muted small">All changes saved.</span>
                        }
                      </div>
                    }
                  </div>
                </nz-tab>

                @if (c.type.commentsEnabled) {
                  <nz-tab [nzTitle]="commentsTab">
                    <div class="tab-pane">
                      <div class="composer composer-md">
                        <app-markdown-editor
                          [(ngModel)]="newComment"
                          name="newComment"
                          [compact]="true"
                          height="160px"
                          placeholder="Share an update or feedback…  Ctrl+B / Ctrl+I / Ctrl+K"
                        ></app-markdown-editor>
                        <div class="composer-actions">
                          <button
                            nz-button
                            nzType="primary"
                            (click)="postComment()"
                            [disabled]="!newComment.trim() || busy()"
                          >
                            <span nz-icon nzType="send"></span> Comment
                          </button>
                        </div>
                      </div>

                      <div class="comments-list">
                        @for (cm of comments(); track cm.id) {
                          <div class="comment">
                            <nz-avatar
                              [nzIcon]="cm.authorType === 'agent' ? 'robot' : 'user'"
                              [class.agent]="cm.authorType === 'agent'"
                            ></nz-avatar>
                            <div class="bubble">
                              <div class="meta">
                                <strong>{{ authorName(cm) }}</strong>
                                @if (cm.authorType === 'agent') {
                                  <nz-tag nzColor="blue">AGENT</nz-tag>
                                }
                                <span class="muted small">{{ cm.createdAt | date:'short' }}</span>
                              </div>
                              <div class="body markdown-body"><markdown [data]="cm.content"></markdown></div>

                              @if (cm.replies?.length) {
                                <div class="replies">
                                  @for (r of cm.replies; track r.id) {
                                    <div class="comment reply">
                                      <nz-avatar
                                        nzSize="small"
                                        [nzIcon]="r.authorType === 'agent' ? 'robot' : 'user'"
                                      ></nz-avatar>
                                      <div class="bubble">
                                        <div class="meta">
                                          <strong>{{ authorName(r) }}</strong>
                                          <span class="muted small">{{ r.createdAt | date:'short' }}</span>
                                        </div>
                                        <div class="body markdown-body"><markdown [data]="r.content"></markdown></div>
                                      </div>
                                    </div>
                                  }
                                </div>
                              }

                              @if (replyOpenFor() !== cm.id) {
                                <button nz-button nzType="text" nzSize="small" class="reply-toggle" (click)="openReply(cm.id)">
                                  <span nz-icon nzType="rollback"></span> Reply
                                </button>
                              } @else {
                                <div class="reply-form">
                                  <app-markdown-editor
                                    [(ngModel)]="replyDraft"
                                    [name]="'reply-' + cm.id"
                                    [compact]="true"
                                    height="120px"
                                    placeholder="Write a reply…"
                                  ></app-markdown-editor>
                                  <div class="reply-actions">
                                    <button
                                      nz-button nzType="primary"
                                      (click)="postReply(cm.id)"
                                      [disabled]="!replyDraft.trim()"
                                    >Post reply</button>
                                    <button nz-button (click)="cancelReply()">Cancel</button>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        } @empty {
                          <div class="empty muted">
                            <span nz-icon nzType="bell"></span>
                            <div>No comments yet — start the conversation.</div>
                          </div>
                        }
                      </div>
                    </div>
                  </nz-tab>
                }

                <nz-tab [nzTitle]="historyTab">
                  <div class="tab-pane">
                    @if (history().length === 0) {
                      <div class="empty muted">
                        <span nz-icon nzType="history"></span>
                        <div>No saves recorded yet.</div>
                      </div>
                    } @else {
                      <ul class="history-list">
                        @for (h of history(); track h.id) {
                          <li class="hist-row">
                            <div class="hist-meta">
                              <strong>{{ h.userLabel }}</strong>
                              <span class="muted small">{{ h.createdAt | date:'medium' }}</span>
                            </div>
                            <div class="hist-body">
                              <span class="hist-field">{{ h.fieldLabel }}</span>
                              <code class="hist-old mono" [nz-tooltip]="h.oldValue || '(empty)'">{{ truncate(h.oldValue) || '∅' }}</code>
                              <span nz-icon nzType="arrow-right" class="muted"></span>
                              <code class="hist-new mono" [nz-tooltip]="h.newValue || '(empty)'">{{ truncate(h.newValue) || '∅' }}</code>
                            </div>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                </nz-tab>
              </nz-tabset>
            </div>

            <aside class="cd-rail">
              <div class="rail-section">
                <div class="rail-title">Details</div>
                <div class="rail-row">
                  <div class="rail-label">Status</div>
                  <div class="rail-value">
                    <nz-select
                      class="rail-select"
                      [ngModel]="c.columnId"
                      (ngModelChange)="transition($event)"
                      [nzDisabled]="busy()"
                    >
                      @for (col of reachableColumns(); track col.id) {
                        <nz-option [nzValue]="col.id" [nzLabel]="col.name"></nz-option>
                      }
                    </nz-select>
                  </div>
                </div>
                <div class="rail-row">
                  <div class="rail-label">Type</div>
                  <div class="rail-value"><nz-tag>{{ c.type.name }}</nz-tag></div>
                </div>
              </div>

              <nz-divider></nz-divider>

              <div class="rail-section">
                <div class="rail-title">Dates</div>
                <div class="rail-row">
                  <div class="rail-label">Created</div>
                  <div class="rail-value" [nz-tooltip]="c.createdAt | date:'medium'">
                    {{ c.createdAt | date:'mediumDate' }}
                  </div>
                </div>
                <div class="rail-row">
                  <div class="rail-label">Updated</div>
                  <div class="rail-value" [nz-tooltip]="c.updatedAt | date:'medium'">
                    {{ c.updatedAt | date:'mediumDate' }}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        }
      </nz-spin>
    </div>
  `,
  styles: [`
    .cd { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--c-surface); }
    .cd-spin, .cd-spin ::ng-deep .ant-spin-container { height: 100%; }

    .cd-topbar {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--c-border-subtle);
    }
    .bc-sep { color: var(--c-text-subtlest); font-size: 16px; }
    .small { font-size: 11px; }
    .muted { color: var(--c-text-subtle); }
    .spacer { flex: 1; }

    .cd-body {
      display: grid;
      grid-template-columns: 1fr 320px;
      flex: 1; min-height: 0;
      overflow: hidden;
    }
    .cd-main { padding: 20px 24px; overflow-y: auto; min-width: 0; }
    .cd-rail {
      border-left: 1px solid var(--c-border-subtle);
      padding: 20px;
      overflow-y: auto;
    }
    @media (max-width: 900px) {
      .cd-body { grid-template-columns: 1fr; }
      .cd-rail { border-left: none; border-top: 1px solid var(--c-border-subtle); }
    }

    .title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .title-input {
      flex: 1; font-size: 22px; font-weight: 500;
      border: 1px solid transparent !important;
    }
    .title-input:hover { border-color: var(--c-border-subtle) !important; background: var(--c-surface-2) !important; }
    .title-input:focus { border-color: var(--c-primary) !important; background: var(--c-surface) !important; }

    .cmt-badge { margin-left: 6px; }

    .tab-pane { padding: 16px 0; }
    .fields { display: flex; flex-direction: column; gap: 12px; }
    .field-row {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 16px;
      align-items: center;
    }
    .field-label {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      font-size: 13px;
      color: var(--c-text-subtle);
    }
    .req { color: var(--c-danger); }
    .multi { width: 100%; max-width: 480px; }

    .save-row {
      display: flex; align-items: center; gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--c-border-subtle);
    }

    .composer {
      display: flex; gap: 8px; align-items: flex-start;
      margin-bottom: 16px;
    }
    .composer textarea { flex: 1; }
    .composer-md { display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
    .composer-actions { display: flex; justify-content: flex-end; }

    .files { display: flex; flex-direction: column; gap: 6px; }
    .file-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      background: var(--c-surface-2);
    }
    .file-chip a { color: var(--c-primary); text-decoration: none; flex: 1; }

    .sub-cards { display: flex; flex-direction: column; gap: 6px; }
    .sub-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px;
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      background: var(--c-surface-2);
    }
    .sub-chip .sub-title { flex: 1; min-width: 0; }
    .sub-mode { display: flex; gap: 4px; margin-top: 6px; }
    .sub-mode button.active { background: var(--c-primary-bg-subtle); color: var(--c-primary); }
    .sub-add { display: flex; gap: 6px; align-items: center; margin-top: 4px; }
    .sub-add nz-select { width: 180px; }
    .sub-add .link-pick { flex: 1; }
    .sub-add input { flex: 1; }

    .history-list { padding-left: 0; list-style: none; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .hist-row { padding: 8px 12px; border: 1px solid var(--c-border-subtle); border-radius: var(--radius); background: var(--c-surface); }
    .hist-meta { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; font-size: 13px; }
    .hist-body { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; }
    .hist-field { font-weight: 600; min-width: 90px; }
    .hist-old, .hist-new { padding: 2px 6px; border-radius: 3px; font-size: 12px; }
    .hist-old { background: rgba(201, 55, 44, 0.10); color: #C9372C; }
    .hist-new { background: rgba(34, 160, 107, 0.10); color: #1F845A; }
    .more-btn { display: inline-block; }

    .field-err { color: var(--c-danger); margin-top: 4px; }

    .comments-list { display: flex; flex-direction: column; gap: 16px; }
    .comment { display: flex; gap: 10px; align-items: flex-start; }
    .bubble {
      flex: 1; min-width: 0;
      background: var(--c-surface-2);
      padding: 10px 14px;
      border-radius: 0 6px 6px 6px;
    }
    .bubble .meta { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 4px; }
    .bubble .body { font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .replies {
      margin-top: 10px; padding-left: 12px;
      border-left: 2px solid var(--c-border-subtle);
      display: flex; flex-direction: column; gap: 10px;
    }
    .reply { gap: 8px; }
    .reply .bubble { background: var(--c-surface); padding: 8px 12px; }
    .reply-toggle { padding: 4px 8px; margin-top: 4px; }
    .reply-form { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .reply-actions { display: flex; gap: 8px; justify-content: flex-end; }

    .empty {
      text-align: center; padding: 24px;
    }
    .empty .anticon { font-size: 36px; opacity: .5; display: block; margin-bottom: 8px; }

    .rail-section { padding: 8px 0; }
    .rail-title {
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      color: var(--c-text-subtle);
      margin-bottom: 12px;
    }
    .rail-row {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 12px;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .rail-label { color: var(--c-text-subtle); font-size: 12px; }
    .rail-value { color: var(--c-text); }
    .rail-select { width: 100%; }

    :host ::ng-deep .ant-tabs-tabpane {
      transition: none !important;
    }
    :host ::ng-deep .ant-tabs-tabpane-active {
      animation: none !important;
    }
  `],
})
export class CardDetailComponent implements OnInit {
  @Input() cardId = '';
  @Input() orgId = '';

  api = inject(ApiService);
  toast = inject(ToastService);
  confirmer = inject(DialogService);
  ref = inject(NzModalRef);

  card = signal<CardDetail | null>(null);
  comments = signal<CommentItem[]>([]);
  history = signal<HistoryEntry[]>([]);
  loading = signal(false);
  busy = signal(false);
  flow = signal<BoardFlow | null>(null);
  prompts = signal<PromptOption[]>([]);
  mcpServers = signal<{ id: string; title: string }[]>([]);
  attachmentsByField: Record<string, any[]> = {};
  subCardCache: Record<string, any> = {};
  newSubType: Record<string, string> = {};
  newSubTitle: Record<string, string> = {};
  // Mode for the sub-card picker per field: 'create' (new) or 'link' (existing).
  subAddMode: Record<string, 'create' | 'link'> = {};
  subSearchTerm: Record<string, string> = {};
  // Cards available for linking, keyed by `${typeId}` so search results are
  // scoped to the chosen card type.
  linkableCardsCache: Record<string, any[]> = {};

  titleDraft = signal('');
  fieldDraft: Record<string, any> = {};
  fieldOriginal: Record<string, any> = {};

  newComment = '';
  replyDraft = '';
  replyOpenFor = signal<string | null>(null);

  commentCount = computed(() => {
    let n = 0;
    for (const c of this.comments()) n += 1 + (c.replies?.length ?? 0);
    return n;
  });

  sortedColumns = computed(() => {
    const cols = this.flow()?.columns ?? [];
    return [...cols].sort((a, b) => a.order - b.order);
  });

  /**
   * Columns the current card can move to: itself plus any column reachable
   * via a configured transition. Used by the status `nz-select` to prevent
   * picking a destination the flow forbids.
   */
  reachableColumns = computed(() => {
    const c = this.card();
    const flow = this.flow();
    if (!c || !flow) return [];
    const reachableIds = new Set<string>([c.columnId,
      ...((flow as any).transitions ?? [])
        .filter((t: any) => t.fromColumnId === c.columnId)
        .map((t: any) => t.toColumnId)]);
    return flow.columns
      .filter((col: any) => reachableIds.has(col.id))
      .sort((a: any, b: any) => a.order - b.order);
  });

  titleDirty = computed(() => {
    const c = this.card();
    return !!c && this.titleDraft().trim() !== '' && this.titleDraft().trim() !== c.title;
  });

  fieldsDirty(): boolean {
    return JSON.stringify(this.fieldDraft) !== JSON.stringify(this.fieldOriginal);
  }

  async ngOnInit() { await this.refresh(); }

  laneColor(name: string): string {
    const k = name.toLowerCase().trim();
    if (k.includes('progress')) return 'blue';
    if (k.includes('done')) return 'green';
    if (k.includes('blocked')) return 'red';
    return 'default';
  }

  async refresh() {
    this.loading.set(true);
    try {
      const [card, flow, prompts, mcpServers] = await Promise.all([
        firstValueFrom(this.api.get<CardDetail>(`/cards/${this.cardId}`)),
        firstValueFrom(this.api.get<BoardFlow>(`/organizations/${this.orgId}/board-flow`)),
        firstValueFrom(this.api.get<PromptOption[]>('/prompts')).catch(() => [] as PromptOption[]),
        firstValueFrom(this.api.get<{ id: string; title: string }[]>('/mcp-servers'))
          .catch(() => [] as { id: string; title: string }[]),
      ]);
      this.card.set(card);
      this.flow.set(flow);
      this.prompts.set(prompts);
      this.mcpServers.set(mcpServers);
      this.titleDraft.set(card.title);

      const draft: Record<string, any> = {};
      for (const f of card.type.customFields) {
        const existing = card.fieldValues.find((v) => v.fieldId === f.id);
        if (existing) {
          // Tags and multi_select are stored as CSV on the wire; the new
          // chip-style controls expect a string[].
          if (f.type === 'tags' || f.type === 'multi_select') {
            draft[f.id] = this.tagsToArray(existing.value);
          } else {
            draft[f.id] = existing.value;
          }
        } else if (f.type === 'prompt' || f.type === 'sub_cards' || f.type === 'tags' || f.type === 'multi_select') {
          draft[f.id] = [];
        } else {
          draft[f.id] = '';
        }
      }
      this.fieldDraft = { ...draft };
      this.fieldOriginal = JSON.parse(JSON.stringify(draft));

      // Hydrate file attachments per file-typed field.
      this.attachmentsByField = {};
      for (const f of card.type.customFields) {
        if (f.type === 'file') {
          this.attachmentsByField[f.id] = await firstValueFrom(
            this.api.get<any[]>(`/files/card/${card.id}/field/${f.id}`),
          ).catch(() => []);
        }
      }
      // Hydrate sub-card details by id.
      this.subCardCache = {};
      for (const f of card.type.customFields) {
        if (f.type !== 'sub_cards') continue;
        const ids = (this.fieldDraft[f.id] as string[]) || [];
        for (const id of ids) {
          if (this.subCardCache[id]) continue;
          try {
            this.subCardCache[id] = await firstValueFrom(this.api.get<any>(`/cards/${id}`));
          } catch { /* ignore stale id */ }
        }
      }

      if (card.type.commentsEnabled) {
        const res = await firstValueFrom(
          this.api.get<{ items: CommentItem[] }>(`/cards/${card.id}/comments`),
        );
        this.comments.set(res.items);
      }

      // Card history (Feature 018)
      const hist = await firstValueFrom(
        this.api.get<HistoryEntry[]>(`/cards/${card.id}/history`),
      ).catch(() => [] as HistoryEntry[]);
      this.history.set(hist);
    } finally {
      this.loading.set(false);
    }
  }

  truncate(value: string | null | undefined, max = 64): string {
    if (!value) return '';
    return value.length > max ? value.slice(0, max) + '…' : value;
  }

  async copyId() {
    const c = this.card();
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c.id);
      this.toast.success('Card id copied');
    } catch {
      this.toast.error('Could not copy');
    }
  }

  authorName(c: CommentItem): string {
    return c.authorType === 'user'
      ? c.user?.displayName || 'User'
      : c.agent?.title || 'Agent';
  }

  async saveTitle() {
    const c = this.card();
    if (!c) return;
    const title = this.titleDraft().trim();
    if (!title || title === c.title) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.patch(`/cards/${c.id}`, { title }));
      await this.refresh();
      this.toast.success('Title updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not save');
    } finally {
      this.busy.set(false);
    }
  }

  async saveFields() {
    const c = this.card();
    if (!c || !this.fieldsDirty()) return;
    const err = this.fieldsValidationError();
    if (err) { this.toast.error(err); return; }
    this.busy.set(true);
    const patches = c.type.customFields
      .filter((f) => f.type !== 'file' && f.type !== 'sub_cards')
      .filter((f) => JSON.stringify(this.fieldDraft[f.id]) !== JSON.stringify(this.fieldOriginal[f.id]))
      .map((f) => {
        // Tags and multi_select chip controls hold string[] in the form, but
        // the legacy backend stores them as CSV; serialize on the way out.
        if (f.type === 'tags' || f.type === 'multi_select') {
          return { fieldId: f.id, value: this.tagsToCsv(this.fieldDraft[f.id]) };
        }
        return { fieldId: f.id, value: this.fieldDraft[f.id] };
      });
    try {
      await firstValueFrom(this.api.patch(`/cards/${c.id}`, { fieldValues: patches }));
      await this.refresh();
      this.toast.success('Saved');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not save');
    } finally {
      this.busy.set(false);
    }
  }

  async transition(toColumnId: string) {
    const c = this.card();
    if (!c || c.columnId === toColumnId) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.patch(`/cards/${c.id}/status`, { toColumnId }));
      await this.refresh();
      this.toast.success('Status updated');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Transition not allowed');
    } finally {
      this.busy.set(false);
    }
  }

  async remove() {
    const c = this.card();
    if (!c) return;
    const mode = await this.confirmer.archiveOrDelete({
      title: `Remove "${c.title}"?`,
      message:
        'Choose how to remove this card. Archiving keeps it recoverable from the Archived section; permanent delete wipes it from the database.',
      archiveLabel: 'Archive',
      permanentLabel: 'Delete permanently',
    });
    if (!mode) return;
    await firstValueFrom(this.api.delete(`/cards/${c.id}?mode=${mode}`));
    this.toast.success(mode === 'archive' ? 'Card archived' : 'Card deleted');
    this.ref.close('deleted');
  }

  // ── Field-level helpers ──────────────────────────────────────────────
  /**
   * Coerce a stored tag/multi_select value into a string[] for the chip
   * picker. Accepts the legacy CSV string, an already-parsed array, or null.
   */
  tagsToArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }
    if (value == null) return [];
    return String(value)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  /** Serialize the chip array back to CSV for wire compatibility. */
  tagsToCsv(arr: string[] | any): string {
    if (!Array.isArray(arr)) return String(arr ?? '');
    return arr.map((t) => String(t).trim()).filter(Boolean).join(',');
  }

  fieldError(f: CustomField, value: any): string {
    if (f.required) {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return `${f.label} is required`;
      }
    }
    if (!value) return '';
    switch (f.type) {
      case 'link':
        try { new URL(String(value)); } catch { return 'Must be a valid URL'; }
        return '';
      case 'datetime':
        return isNaN(Date.parse(String(value))) ? 'Invalid date/time' : '';
      case 'time':
        return /^\d{2}:\d{2}(:\d{2})?$/.test(String(value)) ? '' : 'Invalid time (HH:MM)';
      case 'tags':
      case 'multi_select':
        return ''; // free-form CSV
      default:
        return '';
    }
  }

  fieldsValidationError(): string | null {
    const c = this.card();
    if (!c) return null;
    for (const f of c.type.customFields) {
      const err = this.fieldError(f, this.fieldDraft[f.id]);
      if (err) return err;
    }
    return null;
  }

  // ── Files ────────────────────────────────────────────────────────────
  downloadUrl(id: string) { return `${resolveApiBase()}/files/${id}/content`; }
  formatSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }
  async onFileChange(ev: Event, fieldId: string) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    // Reset so picking the same file twice still triggers a change event.
    input.value = '';
    if (files.length === 0) return;
    const c = this.card();
    if (!c) return;
    for (const f of files) {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      try {
        await firstValueFrom(this.api.post('/files', {
          cardId: c.id,
          fieldId,
          filename: f.name,
          contentType: f.type || 'application/octet-stream',
          base64,
        }));
      } catch (err: any) {
        this.toast.error(err?.error?.message || `Could not upload ${f.name}`);
      }
    }
    this.attachmentsByField[fieldId] = await firstValueFrom(
      this.api.get<any[]>(`/files/card/${c.id}/field/${fieldId}`),
    ).catch(() => []);
  }
  async deleteAttachment(att: any, fieldId: string) {
    const c = this.card();
    if (!c) return;
    await firstValueFrom(this.api.delete(`/files/${att.id}`));
    this.attachmentsByField[fieldId] = (this.attachmentsByField[fieldId] || []).filter(
      (a) => a.id !== att.id,
    );
  }

  // ── Sub-cards ────────────────────────────────────────────────────────
  allCardTypes() { return this.flow()?.cardTypes ?? []; }
  subCardsList(fieldId: string) {
    const ids = (this.fieldDraft[fieldId] as string[]) || [];
    return ids.map((id) => this.subCardCache[id]).filter(Boolean);
  }

  setSubMode(fieldId: string, mode: 'create' | 'link') {
    this.subAddMode[fieldId] = mode;
    this.newSubTitle[fieldId] = '';
    if (mode === 'link') void this.refreshLinkable(fieldId);
  }

  onLinkTypeChange(fieldId: string, typeId: string) {
    this.newSubType[fieldId] = typeId;
    this.newSubTitle[fieldId] = ''; // clear selection
    void this.refreshLinkable(fieldId);
  }

  linkableCards(fieldId: string) {
    const typeId = this.newSubType[fieldId] || '__all__';
    return this.linkableCardsCache[typeId] || [];
  }

  private async refreshLinkable(fieldId: string) {
    const c = this.card();
    if (!c) return;
    const typeId = this.newSubType[fieldId] || '__all__';
    if (this.linkableCardsCache[typeId]?.length) return;
    const projectId = (c as any).projectId as string | null;
    const params: Record<string, string> = {};
    if (projectId) params['projectId'] = projectId;
    if (typeId !== '__all__') params['typeId'] = typeId;
    try {
      const cards = await firstValueFrom(
        this.api.get<any[]>(`/organizations/${this.orgId}/cards`, params),
      );
      const linked = (this.fieldDraft[fieldId] as string[]) || [];
      // Don't offer the parent card or already-linked sub-cards.
      const filtered = (cards || []).filter(
        (x) => x.id !== c.id && !linked.includes(x.id),
      );
      this.linkableCardsCache = { ...this.linkableCardsCache, [typeId]: filtered };
    } catch {
      this.linkableCardsCache[typeId] = [];
    }
  }

  async linkExistingSubCard(fieldId: string) {
    const c = this.card();
    const subId = this.newSubTitle[fieldId];
    if (!c || !subId) return;
    const ids = (this.fieldDraft[fieldId] as string[]) || [];
    if (ids.includes(subId)) return;
    const next = [...ids, subId];
    try {
      // Persist immediately just like the create flow.
      await firstValueFrom(this.api.patch(`/cards/${c.id}`, {
        fieldValues: [{ fieldId, value: next }],
      }));
      // Hydrate the cache so the chip renders the title.
      try {
        this.subCardCache = {
          ...this.subCardCache,
          [subId]: await firstValueFrom(this.api.get<any>(`/cards/${subId}`)),
        };
      } catch { /* ignore */ }
      this.fieldDraft = { ...this.fieldDraft, [fieldId]: next };
      this.fieldOriginal = JSON.parse(JSON.stringify(this.fieldDraft));
      this.newSubTitle[fieldId] = '';
      this.linkableCardsCache = {}; // bust cache
      this.toast.success('Sub-card linked');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not link sub-card');
    }
  }
  async addSubCard(fieldId: string) {
    const c = this.card();
    const typeId = this.newSubType[fieldId];
    const title = (this.newSubTitle[fieldId] || '').trim();
    if (!c || !typeId || !title) return;
    // New sub-cards inherit the parent's column so they live alongside it.
    // (Falls back to the first column if the parent has none, but that's
    // unreachable in practice.)
    const flow = this.flow();
    const columnId = c.columnId
      ?? flow?.columns?.slice().sort((a, b) => a.order - b.order)[0]?.id;
    if (!columnId) {
      this.toast.error('No columns available to place the sub-card');
      return;
    }
    try {
      const created: any = await firstValueFrom(
        this.api.post(`/organizations/${this.orgId}/cards`, {
          typeId, columnId, title, parentId: c.id,
          projectId: (c as any).projectId,
        }),
      );
      const ids = (this.fieldDraft[fieldId] as string[]) || [];
      this.fieldDraft = { ...this.fieldDraft, [fieldId]: [...ids, created.id] };
      this.subCardCache = { ...this.subCardCache, [created.id]: created };
      this.newSubTitle[fieldId] = '';
      // Persist immediately.
      await firstValueFrom(this.api.patch(`/cards/${c.id}`, {
        fieldValues: [{ fieldId, value: this.fieldDraft[fieldId] }],
      }));
      this.fieldOriginal = JSON.parse(JSON.stringify(this.fieldDraft));
      this.toast.success('Sub card added');
    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Could not add sub-card');
    }
  }
  async removeSubCard(fieldId: string, subId: string) {
    const c = this.card();
    if (!c) return;
    const ids = ((this.fieldDraft[fieldId] as string[]) || []).filter((id) => id !== subId);
    this.fieldDraft = { ...this.fieldDraft, [fieldId]: ids };
    await firstValueFrom(this.api.patch(`/cards/${c.id}`, {
      fieldValues: [{ fieldId, value: ids }],
    }));
    this.fieldOriginal = JSON.parse(JSON.stringify(this.fieldDraft));
  }
  openSub(id: string) {
    // Open sub-card in a new tab via deep link.
    window.open(`/card/${id}`, '_blank');
  }

  async copyLink() {
    const c = this.card();
    if (!c) return;
    const url = `${location.origin}/card/${c.id}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Link copied — anyone with access can open this card');
    } catch {
      this.toast.error('Could not copy. URL: ' + url);
    }
  }

  async postComment() {
    const c = this.card();
    if (!c || !this.newComment.trim()) return;
    await firstValueFrom(
      this.api.post(`/cards/${c.id}/comments`, { content: this.newComment.trim() }),
    );
    this.newComment = '';
    const res = await firstValueFrom(
      this.api.get<{ items: CommentItem[] }>(`/cards/${c.id}/comments`),
    );
    this.comments.set(res.items);
    this.toast.success('Comment posted');
  }

  openReply(commentId: string) { this.replyDraft = ''; this.replyOpenFor.set(commentId); }
  cancelReply() { this.replyOpenFor.set(null); this.replyDraft = ''; }

  async postReply(commentId: string) {
    const c = this.card();
    if (!c || !this.replyDraft.trim()) return;
    await firstValueFrom(
      this.api.post(`/cards/${c.id}/comments/${commentId}/replies`, {
        content: this.replyDraft.trim(),
      }),
    );
    this.replyDraft = '';
    this.replyOpenFor.set(null);
    const res = await firstValueFrom(
      this.api.get<{ items: CommentItem[] }>(`/cards/${c.id}/comments`),
    );
    this.comments.set(res.items);
  }
}
