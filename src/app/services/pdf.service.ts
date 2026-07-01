import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Entry, WordSet } from '../models';
import { CrosswordGeneratorService, CrosswordResult } from './crossword-generator.service';

const GREEN = '#58cc02';
const DARK_GREEN = '#58a700';
const YELLOW = '#ffd900';
const DARK = '#3c3c3c';
const GRAY = '#afafaf';
const SPACE_FILL = '#d9d9d9';

export interface PdfResult {
  url: string;
  blob: Blob;
}

@Injectable({ providedIn: 'root' })
export class PdfService {
  constructor(private cw: CrosswordGeneratorService) {}

  // ─── CROSSWORD ─────────────────────────────────────────────────────────────

  generateCrossword(ws: WordSet): PdfResult | null {
    const result = this.cw.generate(ws.entries);
    if (result.rows === 0) return null;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    this.drawCrosswordPage(doc, ws.name, result, false);
    doc.addPage();
    this.drawCrosswordPage(doc, ws.name + ' – Answer Key', result, true);
    return this.toResult(doc);
  }

  private drawCrosswordPage(
    doc: jsPDF,
    title: string,
    result: CrosswordResult,
    filled: boolean
  ) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    // Header band
    doc.setFillColor(GREEN);
    doc.rect(0, 0, pageW, 52, 'F');
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(title, margin, 34);

    doc.setTextColor(DARK);

    // Grid sizing — fit in upper portion
    const maxGridW = pageW - margin * 2;
    const maxGridH = pageH * 0.45;
    const cellSize = Math.min(
      Math.floor(maxGridW / result.cols),
      Math.floor(maxGridH / result.rows),
      28
    );
    const gridW = cellSize * result.cols;
    const gridH = cellSize * result.rows;
    const gridX = (pageW - gridW) / 2;
    const gridY = 65;

    // Draw cells
    for (let r = 0; r < result.rows; r++) {
      for (let c = 0; c < result.cols; c++) {
        const cell = result.grid[r][c];
        const x = gridX + c * cellSize;
        const y = gridY + r * cellSize;

        if (cell) {
          // A space within a multi-word answer: render as a shaded gap so it's
          // clearly not a cell to fill in, while keeping the word connected.
          if (cell.letter === ' ') {
            doc.setFillColor(SPACE_FILL);
            doc.setDrawColor(DARK);
            doc.setLineWidth(0.8);
            doc.rect(x, y, cellSize, cellSize, 'FD');
            continue;
          }

          doc.setFillColor('#ffffff');
          doc.setDrawColor(DARK);
          doc.setLineWidth(0.8);
          doc.rect(x, y, cellSize, cellSize, 'FD');

          if (cell.number) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(DARK);
            doc.text(String(cell.number), x + 1.5, y + 6);
          }

          if (filled) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(cellSize * 0.48);
            doc.setTextColor(GREEN);
            doc.text(cell.letter, x + cellSize / 2, y + cellSize * 0.72, { align: 'center' });
          }
        } else {
          // Blocked cells left transparent (no fill, no stroke) — zero ink
        }
      }
    }

    // Clue columns
    const clueTop = gridY + gridH + 18;
    const colW = (pageW - margin * 2) / 2 - 8;

    this.drawClueSection(doc, 'ACROSS', result.across, margin, clueTop, colW, pageH - 30);
    this.drawClueSection(doc, 'DOWN', result.down, margin + colW + 16, clueTop, colW, pageH - 30);

    if (result.unplaced.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(GRAY);
      doc.text(`Words not placed: ${result.unplaced.join(', ')}`, margin, pageH - 15);
    }
  }

  private drawClueSection(
    doc: jsPDF,
    heading: string,
    clues: { number: number; clue: string }[],
    x: number,
    y: number,
    maxW: number,
    maxY: number
  ) {
    let cy = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(GREEN);
    doc.text(heading, x, cy);
    cy += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(DARK);

    for (const clue of clues) {
      if (cy > maxY) break;
      const line = `${clue.number}. ${clue.clue}`;
      const lines = doc.splitTextToSize(line, maxW);
      doc.text(lines, x, cy);
      cy += lines.length * 10 + 2;
    }
  }

  // ─── MATCHING ──────────────────────────────────────────────────────────────

  generateMatching(ws: WordSet): PdfResult | null {
    const valid = ws.entries.filter(
      (e) => e.word.trim().length > 0 && e.clue.trim().length > 0
    );
    if (valid.length === 0) return null;

    // Shuffle once so the answer key preserves the same column order as the activity sheet
    const shuffledClues = this.shuffle(valid.map((e) => e.clue));
    const shuffledWords = this.shuffle(valid.map((e) => e.word));

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    this.drawMatchingPage(doc, ws.name, valid, shuffledClues, shuffledWords, false);
    doc.addPage();
    this.drawMatchingPage(doc, ws.name + ' – Answer Key', valid, shuffledClues, shuffledWords, true);
    return this.toResult(doc);
  }

  private drawMatchingPage(
    doc: jsPDF,
    title: string,
    entries: Entry[],
    clues: string[],
    words: string[],
    isKey: boolean
  ) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    doc.setFillColor(YELLOW);
    doc.rect(0, 0, pageW, 52, 'F');
    doc.setTextColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(title, margin, 34);

    if (!isKey) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#666666');
      doc.text('Draw a line from each clue to its matching word.', margin, 47);
    }

    const colGap = 72; // generous whitespace between the two columns
    const colW = (pageW - margin * 2 - colGap) / 2;
    const rowH = Math.min(Math.floor((pageH - 80) / Math.max(clues.length, 1)), 46);
    const startY = 70;

    for (let i = 0; i < clues.length; i++) {
      const y = startY + i * rowH;
      if (y + rowH > pageH - 20) break;

      const boxH = rowH - 8;
      doc.setFillColor('#ffffff');
      doc.setDrawColor('#dde0e4');
      doc.setLineWidth(1);
      doc.roundedRect(margin, y, colW, boxH, 6, 6, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(DARK);
      const clueLines = doc.splitTextToSize(clues[i], colW - 16);
      doc.text(clueLines, margin + colW / 2, y + boxH / 2 + 3.5, { align: 'center' });

      const wordX = margin + colW + colGap;
      if (isKey) {
        doc.setFillColor('#e8fce8');
        doc.setDrawColor(GREEN);
      } else {
        doc.setFillColor('#ffffff');
        doc.setDrawColor('#dde0e4');
      }
      doc.roundedRect(wordX, y, colW, boxH, 6, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(isKey ? DARK_GREEN : DARK);
      doc.text(words[i], wordX + colW / 2, y + boxH / 2 + 4, { align: 'center' });
    }

    if (isKey) {
      doc.setDrawColor(GREEN);
      doc.setFillColor(GREEN);
      doc.setLineWidth(1.5);

      for (let i = 0; i < clues.length; i++) {
        // Find the word that belongs to this clue
        const matchingWord = entries.find((e) => e.clue === clues[i])?.word;
        if (!matchingWord) continue;

        // Find which row that word is in the (shuffled) words column
        const wordRow = words.indexOf(matchingWord);
        if (wordRow === -1) continue;

        const boxH = rowH - 8;
        const y1 = startY + i * rowH + boxH / 2;       // mid of clue box
        const y2 = startY + wordRow * rowH + boxH / 2; // mid of word box
        const x1 = margin + colW;                       // right edge of clue column
        const x2 = margin + colW + colGap;              // left edge of word column

        doc.line(x1, y1, x2, y2);
        // Arrowhead at the word-column end
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const al = 7;
        doc.triangle(
          x2, y2,
          x2 - al * Math.cos(angle - 0.4), y2 - al * Math.sin(angle - 0.4),
          x2 - al * Math.cos(angle + 0.4), y2 - al * Math.sin(angle + 0.4),
          'F'
        );
      }
    }
  }

  // ─── FLASH CARDS ───────────────────────────────────────────────────────────

  generateFlashCards(ws: WordSet): PdfResult | null {
    const valid = ws.entries.filter(
      (e) => e.word.trim().length > 0 && e.clue.trim().length > 0
    );
    if (valid.length === 0) return null;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 30;
    const cols = 2;
    const rows = 4;
    const cardsPerPage = cols * rows;
    const cardW = (pageW - margin * 2 - 8 * (cols - 1)) / cols;
    const cardH = (pageH - margin * 2 - 8 * (rows - 1)) / rows;

    const chunks = this.chunk(valid, cardsPerPage);

    chunks.forEach((batch, pageIdx) => {
      if (pageIdx > 0) doc.addPage();
      this.drawCardPage(doc, batch, cols, rows, cardW, cardH, margin, 'front');
      doc.addPage();
      this.drawCardPage(doc, batch, cols, rows, cardW, cardH, margin, 'back');
    });

    return this.toResult(doc);
  }

  private drawCardPage(
    doc: jsPDF,
    entries: Entry[],
    cols: number,
    rows: number,
    cardW: number,
    cardH: number,
    margin: number,
    side: 'front' | 'back'
  ) {
    const pageW = doc.internal.pageSize.getWidth();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const rawCol = i % cols;
      const col = side === 'back' ? cols - 1 - rawCol : rawCol;
      const row = Math.floor(i / cols);

      const x = margin + col * (cardW + 8);
      const y = margin + row * (cardH + 8);

      doc.setFillColor('#ffffff');
      doc.setDrawColor(side === 'front' ? GREEN : YELLOW);
      doc.setLineWidth(2);
      doc.roundedRect(x, y, cardW, cardH, 10, 10, 'FD');

      doc.setDrawColor(GRAY);
      doc.setLineWidth(0.5);
      [
        [x - 4, y],
        [x, y - 4],
        [x + cardW + 4, y],
        [x + cardW, y - 4],
        [x - 4, y + cardH],
        [x, y + cardH + 4],
        [x + cardW + 4, y + cardH],
        [x + cardW, y + cardH + 4],
      ].forEach(([lx, ly]) => {
        doc.line(lx - 4, ly, lx + 4, ly);
      });

      if (side === 'front') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(GREEN);
        doc.text('WORD', x + 6, y + 12);

        doc.setFont('helvetica', 'bold');
        const wordSize = Math.min(28, Math.floor(cardW / (entry.word.length * 0.7 + 1)));
        doc.setFontSize(Math.max(wordSize, 14));
        doc.setTextColor(DARK);
        doc.text(entry.word, x + cardW / 2, y + cardH / 2 + 5, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(YELLOW);
        doc.text('CLUE', x + 6, y + 12);

        doc.setFont('helvetica', 'normal');
        // Scale font so the clue fills the card similarly to how words do on the front
        const clueSize = Math.min(24, Math.max(16, Math.floor(cardW / (entry.clue.length * 0.55 + 1))));
        doc.setFontSize(clueSize);
        doc.setTextColor(DARK);
        const lines = doc.splitTextToSize(entry.clue, cardW - 24);
        const lineH = clueSize * 1.35;
        const blockH = lines.length * lineH;
        doc.text(lines, x + cardW / 2, y + (cardH - blockH) / 2 + clueSize, {
          align: 'center',
        });
      }
    }

    doc.setDrawColor('#cccccc');
    doc.setLineWidth(0.3);
    for (let r = 1; r < rows; r++) {
      const gy = margin + r * (cardH + 8) - 4;
      this.dashedLine(doc, margin - 10, gy, pageW - margin + 10, gy);
    }
    for (let c = 1; c < cols; c++) {
      const gx = margin + c * (cardW + 8) - 4;
      this.dashedLine(doc, gx, margin - 10, gx, doc.internal.pageSize.getHeight() - margin + 10);
    }
  }

  private dashedLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number) {
    const dash = 4;
    const gap = 4;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;
    let d = 0;
    let drawing = true;
    while (d < len) {
      const segEnd = Math.min(d + (drawing ? dash : gap), len);
      if (drawing) {
        doc.line(x1 + ux * d, y1 + uy * d, x1 + ux * segEnd, y1 + uy * segEnd);
      }
      d = segEnd;
      drawing = !drawing;
    }
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  private toResult(doc: jsPDF): PdfResult {
    const blob = doc.output('blob');
    return { url: URL.createObjectURL(blob), blob };
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
}
