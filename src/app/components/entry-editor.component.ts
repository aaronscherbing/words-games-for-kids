import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WordSetStore } from '../services/word-set-store.service';
import { Entry } from '../models';

@Component({
  selector: 'app-entry-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-wrap" *ngIf="store.activeSet() as ws; else noSet">
      <div class="editor-header">
        <div>
          <h2 class="set-title">{{ ws.name }}</h2>
          <p class="set-meta">
            {{ validEntries().length }} valid word{{ validEntries().length !== 1 ? 's' : '' }}
            <span *ngIf="invalidCount() > 0" class="warn-badge">
              {{ invalidCount() }} incomplete
            </span>
          </p>
        </div>
      </div>

      <div class="table-wrap">
        <table class="entry-table" aria-label="Word and clue list">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-word">Word</th>
              <th class="col-clue">Clue / Definition</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let entry of ws.entries; let i = index; trackBy: trackById"
              class="entry-row"
              [class.invalid]="!isValid(entry)"
            >
              <td class="col-num">
                <span class="row-num">{{ i + 1 }}</span>
              </td>
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
                  title="Remove row"
                  (click)="removeEntry(ws.id, entry.id)"
                  [disabled]="ws.entries.length <= 1"
                  aria-label="Remove row"
                >✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="editor-footer">
        <button class="btn btn-secondary btn-sm" (click)="addEntry(ws.id)">
          + Add Word
        </button>
        <span class="text-muted" *ngIf="validEntries().length < 2">
          Add at least 2 complete words to generate activities.
        </span>
      </div>
    </div>

    <ng-template #noSet>
      <div class="no-set-placeholder">
        <div class="placeholder-icon">📚</div>
        <h2>No word set selected</h2>
        <p>Choose a word set from the sidebar, or create a new one to get started.</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .editor-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .editor-header {
      padding: 24px 28px 16px;
      border-bottom: 2px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .set-title {
      font-size: 22px;
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
      padding: 16px 28px;
    }

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

      .col-num { width: 36px; }
      .col-word { width: 160px; }
      .col-clue { }
      .col-del { width: 40px; }
    }

    .entry-row {
      td {
        padding: 4px 4px;
        vertical-align: middle;

        input {
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
          font-weight: 600;
        }
      }

      &.invalid td input:first-child {
        border-color: #ffcdd2;
      }
    }

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
      padding: 16px 28px;
      border-top: 2px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .no-set-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--text-muted);
      padding: 40px;
      gap: 12px;

      .placeholder-icon {
        font-size: 64px;
      }

      h2 {
        font-size: 20px;
        font-weight: 800;
        color: var(--text);
      }

      p {
        font-size: 14px;
        max-width: 340px;
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
