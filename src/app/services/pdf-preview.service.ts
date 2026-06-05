import { Injectable, signal } from '@angular/core';

export interface PdfPreview {
  url: string;
  title: string;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class PdfPreviewService {
  private _preview = signal<PdfPreview | null>(null);
  readonly preview = this._preview.asReadonly();

  show(url: string, title: string, filename: string) {
    this.close(); // revoke any previous URL
    this._preview.set({ url, title, filename });
  }

  close() {
    const p = this._preview();
    if (p) URL.revokeObjectURL(p.url);
    this._preview.set(null);
  }

  download() {
    const p = this._preview();
    if (!p) return;
    const a = document.createElement('a');
    a.href = p.url;
    a.download = p.filename;
    a.click();
  }
}
