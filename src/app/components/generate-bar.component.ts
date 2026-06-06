import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WordSetStore } from '../services/word-set-store.service';
import { PdfService } from '../services/pdf.service';
import { PdfPreviewService } from '../services/pdf-preview.service';

type GeneratingKey = 'crossword' | 'matching' | 'flashcards' | null;

@Component({
  selector: 'app-generate-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="generate-bar" *ngIf="store.activeSet()">
      <div class="generate-bar-inner">
        <div class="generate-label">
          <span class="generate-label-icon">✨</span>
          Generate
        </div>

        <div class="generate-buttons">
          <button
            class="btn btn-primary generate-btn"
            [disabled]="!canGenerate() || generating() !== null"
            (click)="genCrossword()"
            title="Preview crossword puzzle PDF"
          >
            <span class="btn-emoji">🔤</span>
            <span>
              Crossword
              <small>+ answer key</small>
            </span>
            <span *ngIf="generating() === 'crossword'" class="spinner"></span>
          </button>

          <button
            class="btn btn-yellow generate-btn"
            [disabled]="!canGenerate() || generating() !== null"
            (click)="genMatching()"
            title="Preview matching activity PDF"
          >
            <span class="btn-emoji">↔️</span>
            <span>
              Matching
              <small>+ answer key</small>
            </span>
            <span *ngIf="generating() === 'matching'" class="spinner"></span>
          </button>

          <button
            class="btn btn-blue generate-btn"
            [disabled]="!canGenerate() || generating() !== null"
            (click)="genFlashCards()"
            title="Preview flash cards PDF"
          >
            <span class="btn-emoji">🃏</span>
            <span>
              Flash Cards
              <small>duplex-ready</small>
            </span>
            <span *ngIf="generating() === 'flashcards'" class="spinner"></span>
          </button>
        </div>

        <p class="generate-hint" *ngIf="!canGenerate()">
          Add at least 2 complete word + clue pairs to unlock PDF generation.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .generate-bar {
      padding: 14px 24px;
      background: #fff;
      border-top: 2px solid var(--border);
    }

    .generate-bar-inner {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .generate-label {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .generate-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .generate-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 12px;
      text-align: left;

      span:not(.btn-emoji):not(.spinner) {
        display: flex;
        flex-direction: column;
        font-size: 14px;

        small {
          font-size: 10px;
          font-weight: 600;
          opacity: 0.7;
        }
      }
    }

    .btn-emoji {
      font-size: 22px;
    }

    .generate-hint {
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
    }

    @media (max-width: 768px) {
      .generate-bar {
        padding: 12px 16px;
      }

      .generate-label {
        display: none;
      }

      .generate-buttons {
        width: 100%;
        flex-direction: column;
        gap: 8px;
      }

      .generate-btn {
        width: 100%;
        justify-content: center;
        padding: 12px 16px;
      }
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class GenerateBarComponent {
  store = inject(WordSetStore);
  pdfService = inject(PdfService);
  preview = inject(PdfPreviewService);

  generating = signal<GeneratingKey>(null);

  canGenerate = computed(() => {
    const ws = this.store.activeSet();
    if (!ws) return false;
    return (
      ws.entries.filter((e) => e.word.trim().length > 0 && e.clue.trim().length > 0).length >= 2
    );
  });

  genCrossword() {
    const ws = this.store.activeSet();
    if (!ws) return;
    this.generating.set('crossword');
    setTimeout(() => {
      try {
        const url = this.pdfService.generateCrossword(ws);
        if (url) this.preview.show(url, `${ws.name} – Crossword`, `${ws.name}-crossword.pdf`);
      } finally {
        this.generating.set(null);
      }
    }, 50);
  }

  genMatching() {
    const ws = this.store.activeSet();
    if (!ws) return;
    this.generating.set('matching');
    setTimeout(() => {
      try {
        const url = this.pdfService.generateMatching(ws);
        if (url) this.preview.show(url, `${ws.name} – Matching`, `${ws.name}-matching.pdf`);
      } finally {
        this.generating.set(null);
      }
    }, 50);
  }

  genFlashCards() {
    const ws = this.store.activeSet();
    if (!ws) return;
    this.generating.set('flashcards');
    setTimeout(() => {
      try {
        const url = this.pdfService.generateFlashCards(ws);
        if (url) this.preview.show(url, `${ws.name} – Flash Cards`, `${ws.name}-flashcards.pdf`);
      } finally {
        this.generating.set(null);
      }
    }, 50);
  }
}
