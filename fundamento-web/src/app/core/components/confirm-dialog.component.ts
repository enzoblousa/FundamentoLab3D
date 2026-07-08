import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Cancelar' }}</button>
      <button mat-flat-button class="danger" [mat-dialog-close]="true">
        {{ data.confirmLabel ?? 'Excluir' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      color: var(--fl-tinta-suave);
      line-height: 1.5;
    }
    // Ação destrutiva: mesmo vermelho usado nos pop-ups de erro
    .danger {
      --mdc-filled-button-container-color: var(--fl-vermelho);
      --mdc-filled-button-label-text-color: #fff;
    }
  `
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
