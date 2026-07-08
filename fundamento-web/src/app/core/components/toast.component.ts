import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'notice';

export interface ToastData {
  message: string;
  type: ToastType;
  action?: string;
}

const TOAST_ICON: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  notice: 'info'
};

const TOAST_ACCENT: Record<ToastType, string> = {
  success: 'var(--fl-status-sucesso)',
  error: 'var(--fl-status-erro)',
  notice: 'var(--fl-status-aviso)'
};

@Component({
  selector: 'app-toast',
  imports: [MatIconModule],
  template: `
    <span class="bar" [style.background]="accent"></span>
    <mat-icon class="icon" [style.color]="accent">{{ icon }}</mat-icon>
    <span class="message">{{ data.message }}</span>
    @if (data.action) {
      <button type="button" class="action" [style.color]="accent" (click)="close()">{{ data.action }}</button>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: stretch;
      width: 100%;
      min-width: 300px;
      max-width: 440px;
      background: var(--fl-cartao);
      border: 1px solid var(--fl-linha);
      border-radius: 14px;
      box-shadow: var(--fl-sombra-alta);
      overflow: hidden;
      font-family: var(--fl-fonte-corpo);
    }
    .bar {
      flex: none;
      width: 6px;
    }
    .icon {
      flex: none;
      align-self: center;
      margin-left: 12px;
    }
    .message {
      flex: 1;
      align-self: center;
      padding: 13px 12px;
      font-size: 0.88rem;
      font-weight: 500;
      line-height: 1.4;
      color: var(--fl-tinta);
    }
    .action {
      flex: none;
      align-self: center;
      margin-right: 6px;
      padding: 0.4rem 0.7rem;
      border: none;
      background: none;
      font: inherit;
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 8px;
      transition: background-color 0.14s ease;
    }
    .action:hover {
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
  `
})
export class ToastComponent {
  private ref = inject(MatSnackBarRef<ToastComponent>);
  data = inject<ToastData>(MAT_SNACK_BAR_DATA);

  get icon(): string {
    return TOAST_ICON[this.data.type];
  }

  get accent(): string {
    return TOAST_ACCENT[this.data.type];
  }

  close(): void {
    this.ref.dismissWithAction();
  }
}
