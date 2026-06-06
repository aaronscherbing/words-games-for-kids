import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { PdfPreviewService } from '../services/pdf-preview.service';

@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-backdrop" *ngIf="preview.preview() as p" (click)="onBackdropClick($event)">
      <div class="preview-panel" role="dialog" aria-modal="true">
        <div class="preview-header">
          <h2 class="preview-title">{{ p.title }}</h2>
          <div class="preview-actions">
            <button class="btn btn-primary btn-sm" (click)="download()">
              ⬇ Download
            </button>
            <button class="btn btn-secondary btn-sm" (click)="close()" aria-label="Close preview">
              ✕ Close
            </button>
          </div>
        </div>
        <div class="preview-body">
          <iframe
            [src]="safeUrl(p.url)"
            class="pdf-frame"
            title="PDF preview"
          ></iframe>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 100;
      display: flex;
      align-items: stretch;
      justify-content: flex-end;
      backdrop-filter: blur(2px);
    }

    .preview-panel {
      width: min(860px, 100vw);
      height: 100vh;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 40px rgba(0, 0, 0, 0.3);
      animation: slideIn 220ms cubic-bezier(0.4, 0, 0.2, 1);

      @media (max-width: 768px) {
        width: 100vw;
      }
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      background: #fff;
      border-bottom: 2px solid var(--border);
      flex-shrink: 0;
    }

    .preview-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--text);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .preview-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .preview-body {
      flex: 1;
      overflow: hidden;
      display: flex;
    }

    .pdf-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: #525659;
    }
  `],
})
export class PdfPreviewComponent {
  preview = inject(PdfPreviewService);
  private sanitizer = inject(DomSanitizer);

  safeUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  close() {
    this.preview.close();
  }

  download() {
    this.preview.download();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('preview-backdrop')) {
      this.close();
    }
  }
}
