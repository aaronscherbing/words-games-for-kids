import { Injectable, signal } from '@angular/core';

export interface PdfPreview {
  url: string;
  title: string;
  filename: string;
  blob: Blob;
}

@Injectable({ providedIn: 'root' })
export class PdfPreviewService {
  private _preview = signal<PdfPreview | null>(null);
  readonly preview = this._preview.asReadonly();

  show(url: string, title: string, filename: string, blob: Blob) {
    this.close(); // revoke any previous URL
    this._preview.set({ url, title, filename, blob });
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

  /**
   * True when the browser can share files via the Web Share API. On iPad/iPhone
   * this opens the native share sheet, which includes Print (AirPrint) and
   * "Save to Files" — the natural way to get a worksheet onto paper.
   */
  canShare(): boolean {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      const probe = new File([new Blob()], 'probe.pdf', { type: 'application/pdf' });
      return navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }

  /**
   * Share the generated PDF through the native share sheet (AirPrint, Files,
   * Mail, etc.). Falls back to a plain download when sharing isn't available.
   *
   * The File is built synchronously from the already-available blob (no awaited
   * fetch first) so the call stays inside the user gesture — iOS Safari rejects
   * navigator.share() if a promise is awaited before it.
   */
  share(): Promise<void> {
    const p = this._preview();
    if (!p) return Promise.resolve();

    const file = new File([p.blob], p.filename, { type: 'application/pdf' });
    if (!this.canShare() || !navigator.canShare({ files: [file] })) {
      this.download();
      return Promise.resolve();
    }

    return navigator.share({ files: [file], title: p.title }).catch((err: Error) => {
      // User dismissing the share sheet throws AbortError — that's not an error.
      if (err?.name === 'AbortError') return;
      this.download();
    });
  }
}
