export interface Entry {
  id: string;
  word: string;
  clue: string;
}

export interface WordSet {
  id: string;
  name: string;
  entries: Entry[];
}

export interface AppState {
  sets: WordSet[];
  activeSetId: string | null;
}

export function newEntry(): Entry {
  return { id: crypto.randomUUID(), word: '', clue: '' };
}

export function newWordSet(name: string): WordSet {
  return { id: crypto.randomUUID(), name, entries: [newEntry()] };
}
