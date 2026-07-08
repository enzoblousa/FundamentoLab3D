import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { ToastComponent, ToastType } from '../components/toast.component';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);

  success(message: string, action?: string): MatSnackBarRef<ToastComponent> {
    return this.open(message, 'success', action, 3000);
  }

  error(message: string, action?: string): MatSnackBarRef<ToastComponent> {
    return this.open(message, 'error', action, 5000);
  }

  notice(message: string, action?: string): MatSnackBarRef<ToastComponent> {
    return this.open(message, 'notice', action, 5000);
  }

  private open(message: string, type: ToastType, action: string | undefined, duration: number): MatSnackBarRef<ToastComponent> {
    return this.snackBar.openFromComponent(ToastComponent, {
      data: { message, type, action },
      duration,
      panelClass: ['fl-toast-panel'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
