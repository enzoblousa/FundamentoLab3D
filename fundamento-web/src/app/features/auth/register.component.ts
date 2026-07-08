import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-page">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Criar conta</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              @if (form.controls.password.hasError('minlength')) {
                <mat-error>A senha precisa de pelo menos 6 caracteres.</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Cadastrando...' : 'Cadastrar' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .auth-page { display: flex; justify-content: center; padding-top: 3rem; }
    mat-card { width: 100%; max-width: 400px; }
    form { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const { email, password } = this.form.getRawValue();
    this.auth.register(email, password).subscribe({
      next: () => {
        this.toast.success('Conta criada! Faça login para continuar.');
        this.router.navigate(['/login']);
      },
      error: err => {
        this.loading.set(false);
        const message = err.status === 409 ? 'Este email já está cadastrado.' : 'Erro ao cadastrar. Tente novamente.';
        this.toast.error(message);
      }
    });
  }
}
