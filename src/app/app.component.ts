import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WordSetListComponent } from './components/word-set-list.component';
import { EntryEditorComponent } from './components/entry-editor.component';
import { GenerateBarComponent } from './components/generate-bar.component';
import { PdfPreviewComponent } from './components/pdf-preview.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    WordSetListComponent,
    EntryEditorComponent,
    GenerateBarComponent,
    PdfPreviewComponent,
  ],
  template: `
    <div class="app-shell">
      <app-word-set-list />
      <div class="main-area">
        <div class="content-area">
          <app-entry-editor />
        </div>
        <app-generate-bar />
      </div>
    </div>
    <app-pdf-preview />
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
    }
  `],
})
export class AppComponent {}
