import { Injectable } from '@angular/core';
import { Entry } from '../models';

export interface CellData {
  letter: string;
  number?: number;
}

export interface ClueItem {
  number: number;
  clue: string;
  word: string;
}

export interface CrosswordResult {
  grid: (CellData | null)[][];
  rows: number;
  cols: number;
  across: ClueItem[];
  down: ClueItem[];
  unplaced: string[];
}

interface Placement {
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: 'across' | 'down';
}

// Matches A-Z plus Spanish accented vowels and Ñ (uppercase after normalization)
const LETTER_RE = /[^A-ZÁÉÍÓÚÜÑ]/g;

@Injectable({ providedIn: 'root' })
export class CrosswordGeneratorService {
  generate(entries: Entry[]): CrosswordResult {
    const valid = entries
      .map((e) => ({
        word: e.word.toUpperCase().replace(LETTER_RE, ''),
        clue: e.clue,
      }))
      .filter((e) => e.word.length >= 2 && e.clue.trim().length > 0);

    if (valid.length === 0) {
      return { grid: [], rows: 0, cols: 0, across: [], down: [], unplaced: [] };
    }

    // Deduplicate: keep first occurrence of each word
    const seen = new Set<string>();
    const deduped = valid.filter((e) => {
      if (seen.has(e.word)) return false;
      seen.add(e.word);
      return true;
    });

    // Sort longest first for better coverage
    deduped.sort((a, b) => b.word.length - a.word.length);

    // Build word lookup set for validity checking
    const wordSet = new Set(deduped.map((e) => e.word));

    const placements: Placement[] = [];
    const unplaced: string[] = [];

    // Place longest word horizontally at origin
    placements.push({ ...deduped[0], row: 0, col: 0, dir: 'across' });

    for (let i = 1; i < deduped.length; i++) {
      const entry = deduped[i];
      const placed = this.tryPlace(entry.word, entry.clue, placements, wordSet);
      if (placed) {
        placements.push(placed);
      } else {
        unplaced.push(entry.word);
      }
    }

    return this.buildResult(placements, unplaced);
  }

  // ─── Placement search ──────────────────────────────────────────────────────

  private tryPlace(
    word: string,
    clue: string,
    existing: Placement[],
    wordSet: Set<string>
  ): Placement | null {
    for (const placed of existing) {
      for (let pi = 0; pi < placed.word.length; pi++) {
        const sharedLetter = placed.word[pi];
        for (let wi = 0; wi < word.length; wi++) {
          if (word[wi] !== sharedLetter) continue;

          let candidate: Placement;
          if (placed.dir === 'across') {
            candidate = { word, clue, row: placed.row - wi, col: placed.col + pi, dir: 'down' };
          } else {
            candidate = { word, clue, row: placed.row + pi, col: placed.col - wi, dir: 'across' };
          }

          if (this.isValid(candidate, existing, wordSet)) return candidate;
        }
      }
    }
    return null;
  }

  // ─── Validity: full grid scan ──────────────────────────────────────────────
  //
  // After tentatively adding `candidate` to `existing`, every connected run of
  // 2+ letters in the grid (both horizontally and vertically) must be a word in
  // `wordSet`. This prevents accidental non-word sequences at crossing points.

  private isValid(
    candidate: Placement,
    existing: Placement[],
    wordSet: Set<string>
  ): boolean {
    // 1. Build existing cell map: key = "r,c", value = {letter, dir}
    const existingCells = new Map<string, { letter: string; dir: 'across' | 'down' }>();
    for (const p of existing) {
      for (const [r, c, letter] of this.cellsFor(p)) {
        existingCells.set(`${r},${c}`, { letter, dir: p.dir });
      }
    }

    // 2. Check each cell of the candidate against existing cells
    let hasIntersection = false;
    for (const [r, c, letter] of this.cellsFor(candidate)) {
      const cell = existingCells.get(`${r},${c}`);
      if (cell) {
        if (cell.dir === candidate.dir) return false; // same-direction overlap
        if (cell.letter !== letter) return false; // letter mismatch at crossing
        hasIntersection = true;
      }
    }

    // All placements after the first must intersect with something already placed
    if (existing.length > 0 && !hasIntersection) return false;

    // 3. Build combined grid (existing + candidate)
    const grid = new Map<string, string>();
    for (const [k, v] of existingCells) grid.set(k, v.letter);
    for (const [r, c, letter] of this.cellsFor(candidate)) grid.set(`${r},${c}`, letter);

    // 4. Find bounds
    let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    for (const key of grid.keys()) {
      const [r, c] = key.split(',').map(Number);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }

    // 5. Scan every horizontal run — must be in wordSet if length ≥ 2
    for (let r = minR; r <= maxR; r++) {
      let run = '';
      for (let c = minC; c <= maxC + 1; c++) {
        const letter = grid.get(`${r},${c}`);
        if (letter) {
          run += letter;
        } else {
          if (run.length >= 2 && !wordSet.has(run)) return false;
          run = '';
        }
      }
    }

    // 6. Scan every vertical run — must be in wordSet if length ≥ 2
    for (let c = minC; c <= maxC; c++) {
      let run = '';
      for (let r = minR; r <= maxR + 1; r++) {
        const letter = grid.get(`${r},${c}`);
        if (letter) {
          run += letter;
        } else {
          if (run.length >= 2 && !wordSet.has(run)) return false;
          run = '';
        }
      }
    }

    // 7. The word's start cell must not be immediately preceded by another letter
    //    (which would extend the word into a longer non-word sequence).
    const [startR, startC] = [candidate.row, candidate.col];
    const beforeR = candidate.dir === 'across' ? startR : startR - 1;
    const beforeC = candidate.dir === 'across' ? startC - 1 : startC;
    if (grid.has(`${beforeR},${beforeC}`)) return false;

    const endR = candidate.dir === 'across' ? startR : startR + candidate.word.length - 1;
    const endC = candidate.dir === 'across' ? startC + candidate.word.length - 1 : startC;
    const afterR = candidate.dir === 'across' ? endR : endR + 1;
    const afterC = candidate.dir === 'across' ? endC + 1 : endC;
    if (grid.has(`${afterR},${afterC}`)) return false;

    return true;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private cellsFor(p: Placement): [number, number, string][] {
    return p.word.split('').map((letter, i) => [
      p.dir === 'across' ? p.row : p.row + i,
      p.dir === 'across' ? p.col + i : p.col,
      letter,
    ]);
  }

  private buildResult(placements: Placement[], unplaced: string[]): CrosswordResult {
    if (placements.length === 0) {
      return { grid: [], rows: 0, cols: 0, across: [], down: [], unplaced };
    }

    // Normalize to min row/col = 0
    let minRow = Infinity, minCol = Infinity, maxRow = -Infinity, maxCol = -Infinity;
    for (const p of placements) {
      const endRow = p.dir === 'across' ? p.row : p.row + p.word.length - 1;
      const endCol = p.dir === 'across' ? p.col + p.word.length - 1 : p.col;
      if (p.row < minRow) minRow = p.row;
      if (p.col < minCol) minCol = p.col;
      if (endRow > maxRow) maxRow = endRow;
      if (endCol > maxCol) maxCol = endCol;
    }

    const rows = maxRow - minRow + 1;
    const cols = maxCol - minCol + 1;

    const grid: (CellData | null)[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(null)
    );

    for (const p of placements) {
      p.word.split('').forEach((letter, i) => {
        const r = (p.dir === 'across' ? p.row : p.row + i) - minRow;
        const c = (p.dir === 'across' ? p.col + i : p.col) - minCol;
        if (!grid[r][c]) grid[r][c] = { letter };
      });
    }

    // Number cells: assign sequential numbers by reading order (top-to-bottom, left-to-right)
    // A cell gets a number if it starts an across word OR a down word (or both)
    const cellNumbers = new Map<string, number>();
    let num = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c]) continue;

        const startsAcross = placements.some(
          (p) => p.dir === 'across' && p.row - minRow === r && p.col - minCol === c
        );
        const startsDown = placements.some(
          (p) => p.dir === 'down' && p.row - minRow === r && p.col - minCol === c
        );

        if (startsAcross || startsDown) {
          cellNumbers.set(`${r},${c}`, num++);
          grid[r][c]!.number = cellNumbers.get(`${r},${c}`);
        }
      }
    }

    const across: ClueItem[] = [];
    const down: ClueItem[] = [];

    for (const p of placements) {
      const r = p.row - minRow;
      const c = p.col - minCol;
      const n = cellNumbers.get(`${r},${c}`)!;
      const item: ClueItem = { number: n, clue: p.clue, word: p.word };
      if (p.dir === 'across') across.push(item);
      else down.push(item);
    }

    across.sort((a, b) => a.number - b.number);
    down.sort((a, b) => a.number - b.number);

    return { grid, rows, cols, across, down, unplaced };
  }
}
