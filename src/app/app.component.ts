import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

import { WordSetListComponent } from './components/word-set-list.component';
import { EntryEditorComponent } from './components/entry-editor.component';
import { GenerateBarComponent } from './components/generate-bar.component';
import { PdfPreviewComponent } from './components/pdf-preview.component';
import { IconComponent } from './components/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    WordSetListComponent,
    EntryEditorComponent,
    GenerateBarComponent,
    PdfPreviewComponent,
    IconComponent
],
  template: `
    <div class="app-shell">

      <!-- Mobile top bar -->
      <header class="mobile-header">
        <button class="hamburger" (click)="sidebarOpen.set(true)" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <div class="mobile-logo">
          <span class="mobile-logo-icon"><app-icon name="target" [size]="22" /></span>
          <span class="mobile-logo-text">Word Games for Kids</span>
        </div>
      </header>

      <!-- Backdrop (mobile only) -->
      <div
        class="sidebar-backdrop"
        [class.visible]="sidebarOpen()"
        (click)="sidebarOpen.set(false)"
      ></div>

      <!-- Sidebar / Drawer -->
      <div class="sidebar-wrap" [class.open]="sidebarOpen()">
        <app-word-set-list (closeDrawer)="sidebarOpen.set(false)" />
      </div>

      <!-- Main content -->
      <div class="main-area">
        <div class="content-area">
          <app-entry-editor />
        </div>
        <app-generate-bar />
      </div>
    </div>

    <app-pdf-preview />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Mobile top bar ───────────────────────────────── */
    .mobile-header {
      display: none;
    }

    .hamburger {
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 6px;

      span {
        display: block;
        width: 22px;
        height: 2.5px;
        background: var(--text);
        border-radius: 2px;
      }
    }

    .mobile-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 900;
      font-size: 15px;
      color: var(--green);
    }

    .mobile-logo-text {
      font-size: 14px;
    }

    /* ── Sidebar ──────────────────────────────────────── */
    .sidebar-backdrop {
      display: none;
    }

    .sidebar-wrap {
      flex-shrink: 0;
    }

    /* ── Main ────────────────────────────────────────── */
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
    }

    /* ── Mobile overrides (≤ 768px) ─────────────────── */
    @media (max-width: 768px) {
      .app-shell {
        flex-direction: column;
      }

      .mobile-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: #fff;
        border-bottom: 2px solid var(--border);
        flex-shrink: 0;
        z-index: 10;
      }

      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 40;
        opacity: 0;
        pointer-events: none;
        transition: opacity 220ms ease;

        &.visible {
          opacity: 1;
          pointer-events: auto;
        }
      }

      .sidebar-wrap {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 50;
        transform: translateX(-100%);
        transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1);

        &.open {
          transform: translateX(0);
        }
      }
    }
  `],
})
export class AppComponent {
  sidebarOpen = signal(false);
}
