import { Component, ElementRef, EventEmitter, Output, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WordSetStore } from '../services/word-set-store.service';
import { WordSet } from '../models';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-word-set-list',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon"><app-icon name="target" [size]="30" /></span>
          <span class="logo-text">Word Games<br /><small>for Kids</small></span>
        </div>
        <button class="close-drawer btn btn-ghost btn-icon" (click)="closeDrawer.emit()" aria-label="Close menu"><app-icon name="close" [size]="18" /></button>
      </div>
    
      <div class="sidebar-actions">
        <button class="btn btn-primary btn-sm" style="width:100%" (click)="createSet()">
          + New Word Set
        </button>
      </div>
    
      <nav class="set-list" aria-label="Word sets">
        @for (ws of store.sets(); track ws) {
          <div
            class="set-item"
            [class.active]="ws.id === store.activeSetId()"
            (click)="store.selectSet(ws.id); closeDrawer.emit()"
            >
            <div class="set-item-body">
              @if (renamingId !== ws.id) {
                <span class="set-name">{{ ws.name }}</span>
              } @else {
                <input
                  #renameInput
                  type="text"
                  [(ngModel)]="renameValue"
                  (keydown.enter)="commitRename(ws.id)"
                  (keydown.escape)="cancelRename()"
                  (blur)="commitRename(ws.id)"
                  (click)="$event.stopPropagation()"
                  class="rename-input"
                  />
              }
            </div>
            <div class="set-item-row2">
              <span class="set-count tag">{{ validCount(ws) }} {{ validCount(ws) === 1 ? 'word' : 'words' }}</span>
              <div class="set-item-actions" (click)="$event.stopPropagation()">
                <button
                  class="btn btn-ghost btn-icon"
                  title="Rename"
                  aria-label="Rename"
                  (click)="startRename(ws)"
                ><app-icon name="pencil" /></button>
                <button
                  class="btn btn-ghost btn-icon"
                  title="Export this set"
                  aria-label="Export this set"
                  (click)="store.exportSet(ws.id)"
                ><app-icon name="download" /></button>
                <button
                  class="btn btn-ghost btn-icon"
                  title="Delete"
                  aria-label="Delete"
                  (click)="deleteSet(ws)"
                ><app-icon name="trash" /></button>
              </div>
            </div>
          </div>
        }
    
        @if (store.sets().length === 0) {
          <div class="empty-sets">
            <p>No word sets yet.</p>
            <p>Click <strong>+ New Word Set</strong> to get started!</p>
          </div>
        }
      </nav>
    
      <div class="sidebar-footer">
        <button class="btn btn-secondary btn-sm" (click)="exportAll()" title="Export all sets">
          Export All
        </button>
        <button class="btn btn-secondary btn-sm" (click)="importFile()">
          Import
        </button>
        <input
          #importInput
          type="file"
          accept=".json"
          class="visually-hidden"
          (change)="onFileSelected($event)"
          />
      </div>
    </aside>
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 260px;
      min-width: 220px;
      height: 100vh;
      background: #fff;
      border-right: 2px solid var(--border);
      overflow: hidden;
    }

    .sidebar-header {
      padding: 16px 12px 12px 16px;
      border-bottom: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .close-drawer {
      display: none;
      @media (max-width: 768px) { display: flex; }
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      display: inline-flex;
      color: var(--green);
    }

    .logo-text {
      font-size: 16px;
      font-weight: 900;
      color: var(--green);
      line-height: 1.2;
      small {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        display: block;
      }
    }

    .sidebar-actions {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .set-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 8px;
    }

    .set-item {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      padding: 10px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 120ms ease;
      margin-bottom: 4px;

      &:hover {
        background: var(--bg);
      }

      &.active {
        background: var(--green-light);

        .set-name {
          color: var(--green-dark);
          font-weight: 800;
        }
      }
    }

    .set-item-body {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .set-name {
      font-size: 14px;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .set-item-row2 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      min-height: 32px;
    }

    .set-count {
      flex-shrink: 0;
      margin-left: -10px;
    }

    .set-item-actions {
      display: flex;
      justify-content: flex-end;
      gap: 2px;
      opacity: 0;
      transition: opacity 120ms ease;
      .set-item:hover & { opacity: 1; }
      .set-item.active & { opacity: 1; }

      .btn-ghost:hover:not(:disabled) {
        background: rgba(88, 167, 0, 0.18);
      }
    }

    .rename-input {
      font-size: 13px;
      padding: 4px 8px;
      border-radius: 6px;
      flex: 1;
    }

    .empty-sets {
      padding: 24px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.6;
    }

    .sidebar-footer {
      padding: 12px 16px;
      border-top: 2px solid var(--border);
      display: flex;
      gap: 8px;
    }
  `],
})
export class WordSetListComponent {
  @Output() closeDrawer = new EventEmitter<void>();

  store = inject(WordSetStore);

  renamingId: string | null = null;
  renameValue = '';

  @ViewChild('importInput') importInput!: ElementRef<HTMLInputElement>;

  validCount(ws: WordSet): number {
    return ws.entries.filter((e) => e.word.trim().length > 0 && e.clue.trim().length > 0).length;
  }

  createSet() {
    const name = prompt('Name for the new word set:');
    if (name?.trim()) this.store.createSet(name.trim());
  }

  startRename(ws: WordSet) {
    this.renamingId = ws.id;
    this.renameValue = ws.name;
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.rename-input');
      input?.focus();
      input?.select();
    }, 0);
  }

  commitRename(id: string) {
    if (this.renameValue.trim()) this.store.renameSet(id, this.renameValue);
    this.renamingId = null;
  }

  cancelRename() {
    this.renamingId = null;
  }

  deleteSet(ws: WordSet) {
    if (confirm(`Delete "${ws.name}"? This cannot be undone.`)) {
      this.store.deleteSet(ws.id);
    }
  }

  exportAll() {
    this.store.exportAll();
  }

  importFile() {
    this.importInput.nativeElement.value = '';
    this.importInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      await this.store.importFromFile(file);
      alert('Word sets imported successfully!');
    } catch (e) {
      alert('Failed to import: ' + (e as Error).message);
    }
  }
}
