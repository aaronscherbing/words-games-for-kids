import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WordSetStore } from '../services/word-set-store.service';
import { Entry } from '../models';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-entry-editor',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    @if (store.activeSet(); as ws) {
      <div class="editor-wrap">
        <div class="editor-header">
          <div>
            <h2 class="set-title">{{ ws.name }}</h2>
            <p class="set-meta">
              {{ validEntries().length }} valid word{{ validEntries().length !== 1 ? 's' : '' }}
              @if (invalidCount() > 0) {
                <span class="warn-badge">
                  {{ invalidCount() }} incomplete
                </span>
              }
            </p>
          </div>
        </div>
        <div class="table-wrap">
          <!-- Desktop table -->
          <table class="entry-table desktop-only" aria-label="Word and clue list">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th class="col-word">Word</th>
                <th class="col-clue">Clue / Definition</th>
                <th class="col-del"></th>
              </tr>
            </thead>
            <tbody>
              @for (entry of ws.entries; track trackById(i, entry); let i = $index) {
                <tr
                  class="entry-row"
                  [class.invalid]="!isValid(entry)"
                  >
                  <td class="col-num"><span class="row-num">{{ i + 1 }}</span></td>
                  <td class="col-word">
                    <input
                      type="text"
                      [ngModel]="entry.word"
                      (ngModelChange)="updateEntry(ws.id, entry, 'word', $event)"
                      placeholder="word"
                      autocomplete="off"
                      autocorrect="off"
                      spellcheck="false"
                      [attr.aria-label]="'Word ' + (i + 1)"
                      />
                  </td>
                  <td class="col-clue">
                    <input
                      type="text"
                      [ngModel]="entry.clue"
                      (ngModelChange)="updateEntry(ws.id, entry, 'clue', $event)"
                      placeholder="clue or definition…"
                      [attr.aria-label]="'Clue ' + (i + 1)"
                      />
                  </td>
                  <td class="col-del">
                    <button
                      class="btn btn-ghost btn-icon"
                      title="Remove"
                      (click)="removeEntry(ws.id, entry.id)"
                      [disabled]="ws.entries.length <= 1"
                      aria-label="Remove row"
                    ><app-icon name="close" [size]="18" /></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <!-- Mobile cards -->
          <div class="mobile-cards mobile-only">
            @for (entry of ws.entries; track trackById(i, entry); let i = $index) {
              <div
                class="mobile-card"
                [class.invalid]="!isValid(entry)"
                >
                <div class="mobile-card-header">
                  <span class="row-num">{{ i + 1 }}</span>
                  <button
                    class="btn btn-ghost btn-icon"
                    (click)="removeEntry(ws.id, entry.id)"
                    [disabled]="ws.entries.length <= 1"
                    aria-label="Remove"
                  ><app-icon name="close" [size]="18" /></button>
                </div>
                <input
                  type="text"
                  [ngModel]="entry.word"
                  (ngModelChange)="updateEntry(ws.id, entry, 'word', $event)"
                  placeholder="Word…"
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                  />
                <input
                  type="text"
                  [ngModel]="entry.clue"
                  (ngModelChange)="updateEntry(ws.id, entry, 'clue', $event)"
                  placeholder="Clue or definition…"
                  />
              </div>
            }
          </div>
        </div>
        <div class="editor-footer">
          <button class="btn btn-secondary btn-sm" (click)="addEntry(ws.id)">
            + Add Word
          </button>
          @if (validEntries().length < 2) {
            <span class="text-muted">
              Add at least 2 complete words to generate.
            </span>
          }
        </div>
      </div>
    } @else {
      <div class="no-set-placeholder">
        <div class="placeholder-icon"><app-icon name="books" [size]="56" /></div>
        <h2>No word set selected</h2>
        <p>Open the menu and choose a word set, or create a new one to get started.</p>
      </div>
    }
    
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .editor-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .editor-header {
      padding: 20px 24px 14px;
      /* clear the status bar when installed to the home screen (two-column layout);
         the mobile override below resets this since the mobile header handles it */
      padding-top: calc(20px + env(safe-area-inset-top));
      border-bottom: 2px solid var(--border);
    }

    .set-title {
      font-size: 20px;
      font-weight: 900;
      color: var(--text);
    }

    .set-meta {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .warn-badge {
      background: #fff3cd;
      color: #856404;
      border-radius: 100px;
      padding: 1px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .table-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 16px 24px;
    }

    /* ── Desktop table ─────────────────────────────── */
    .entry-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 6px;

      th {
        text-align: left;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        padding: 0 8px 4px;
      }

      .col-num  { width: 36px; }
      .col-word { width: 160px; }
      .col-del  { width: 40px; }
    }

    .entry-row td {
      padding: 4px 4px;
      vertical-align: middle;

      input {
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 14px;
        font-weight: 600;
      }
    }

    /* ── Mobile cards ──────────────────────────────── */
    .mobile-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mobile-card {
      background: #fff;
      border: 2px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      &.invalid {
        border-color: #ffcdd2;
      }

      input {
        font-size: 15px;
        font-weight: 600;
        padding: 10px 12px;
        border-radius: 8px;
      }
    }

    .mobile-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* ── Shared ────────────────────────────────────── */
    .row-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--bg);
      font-size: 12px;
      font-weight: 800;
      color: var(--text-muted);
    }

    .editor-footer {
      padding: 14px 24px;
      border-top: 2px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* ── Responsive visibility ─────────────────────── */
    .desktop-only { display: table; }
    .mobile-only  { display: none; }

    @media (max-width: 768px) {
      .desktop-only { display: none; }
      .mobile-only  { display: flex; }

      .editor-header { padding: 14px 16px 10px; }
      .table-wrap    { padding: 12px 16px; }
      .editor-footer { padding: 12px 16px; }
      .set-title     { font-size: 17px; }
    }

    /* ── No-set placeholder ────────────────────────── */
    .no-set-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--text-muted);
      padding: 40px 24px;
      gap: 12px;

      .placeholder-icon { font-size: 56px; }

      h2 {
        font-size: 18px;
        font-weight: 800;
        color: var(--text);
      }

      p {
        font-size: 14px;
        max-width: 300px;
        line-height: 1.6;
      }
    }
  `],
})
export class EntryEditorComponent {
  store = inject(WordSetStore);

  validEntries = computed(() => {
    const ws = this.store.activeSet();
    if (!ws) return [];
    return ws.entries.filter((e) => e.word.trim().length > 0 && e.clue.trim().length > 0);
  });

  invalidCount = computed(() => {
    const ws = this.store.activeSet();
    if (!ws) return 0;
    return ws.entries.filter((e) => !this.isValid(e)).length;
  });

  isValid(entry: Entry): boolean {
    return entry.word.trim().length > 0 && entry.clue.trim().length > 0;
  }

  trackById(_: number, entry: Entry) {
    return entry.id;
  }

  addEntry(setId: string) {
    this.store.addEntry(setId);
  }

  updateEntry(setId: string, entry: Entry, field: 'word' | 'clue', value: string) {
    this.store.updateEntry(setId, { ...entry, [field]: value });
  }

  removeEntry(setId: string, entryId: string) {
    this.store.removeEntry(setId, entryId);
  }
}
