import { Injectable, computed, effect, signal } from '@angular/core';
import { AppState, Entry, WordSet, newEntry, newWordSet } from '../models';

const STORAGE_KEY = 'wgfk.v1';

@Injectable({ providedIn: 'root' })
export class WordSetStore {
  private state = signal<AppState>(this.load());

  readonly sets = computed(() => this.state().sets);
  readonly activeSetId = computed(() => this.state().activeSetId);
  readonly activeSet = computed(() => {
    const id = this.state().activeSetId;
    return this.state().sets.find((s) => s.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
      } catch {
        // storage may be unavailable
      }
    });
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppState;
    } catch {
      // ignore
    }
    return { sets: [], activeSetId: null };
  }

  private update(fn: (s: AppState) => AppState) {
    this.state.update(fn);
  }

  // ─── Set CRUD ───────────────────────────────────────────────────────────────

  createSet(name: string) {
    const ws = newWordSet(name.trim());
    this.update((s) => ({ sets: [...s.sets, ws], activeSetId: ws.id }));
  }

  renameSet(id: string, name: string) {
    this.update((s) => ({
      ...s,
      sets: s.sets.map((ws) => (ws.id === id ? { ...ws, name: name.trim() } : ws)),
    }));
  }

  deleteSet(id: string) {
    this.update((s) => {
      const sets = s.sets.filter((ws) => ws.id !== id);
      const activeSetId =
        s.activeSetId === id ? (sets[0]?.id ?? null) : s.activeSetId;
      return { sets, activeSetId };
    });
  }

  selectSet(id: string) {
    this.update((s) => ({ ...s, activeSetId: id }));
  }

  // ─── Entry CRUD ─────────────────────────────────────────────────────────────

  addEntry(setId: string) {
    this.update((s) => ({
      ...s,
      sets: s.sets.map((ws) =>
        ws.id === setId ? { ...ws, entries: [...ws.entries, newEntry()] } : ws
      ),
    }));
  }

  updateEntry(setId: string, entry: Entry) {
    this.update((s) => ({
      ...s,
      sets: s.sets.map((ws) =>
        ws.id === setId
          ? { ...ws, entries: ws.entries.map((e) => (e.id === entry.id ? entry : e)) }
          : ws
      ),
    }));
  }

  removeEntry(setId: string, entryId: string) {
    this.update((s) => ({
      ...s,
      sets: s.sets.map((ws) =>
        ws.id === setId
          ? { ...ws, entries: ws.entries.filter((e) => e.id !== entryId) }
          : ws
      ),
    }));
  }

  // ─── Import / Export ────────────────────────────────────────────────────────

  exportAll(): void {
    const json = JSON.stringify(this.state().sets, null, 2);
    this.triggerDownload(json, 'word-games-all-sets.json', 'application/json');
  }

  exportSet(id: string): void {
    const ws = this.state().sets.find((s) => s.id === id);
    if (!ws) return;
    const json = JSON.stringify([ws], null, 2);
    this.triggerDownload(json, `${ws.name}.json`, 'application/json');
  }

  importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as WordSet[];
          this.update((s) => {
            const existingIds = new Set(s.sets.map((ws) => ws.id));
            const toAdd = imported.filter((ws) => !existingIds.has(ws.id));
            const merged = s.sets.map((ws) => {
              const match = imported.find((i) => i.id === ws.id);
              return match ?? ws;
            });
            return { sets: [...merged, ...toAdd], activeSetId: s.activeSetId };
          });
          resolve();
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    });
  }

  private triggerDownload(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
