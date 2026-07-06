import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>{{ id() ? 'Editar produto' : 'Novo produto' }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Nome</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descrição</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Preço (R$)</mat-label>
            <input matInput type="number" step="0.01" min="0.01" formControlName="price" />
          </mat-form-field>

          <div class="buttons">
            <a mat-button routerLink="/products">Cancelar</a>
            <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    mat-card { max-width: 560px; margin: 0 auto; }
    form { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .buttons { display: flex; justify-content: flex-end; gap: 0.5rem; }
  `
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);

  id = signal<number | null>(null);
  saving = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.id.set(Number(idParam));
    this.productService.getById(Number(idParam)).subscribe({
      next: p => this.form.patchValue({ name: p.name, description: p.description ?? '', price: p.price }),
      error: () => {
        this.snackBar.open('Produto não encontrado.', 'OK', { duration: 5000 });
        this.router.navigate(['/products']);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const request = this.form.getRawValue();
    const id = this.id();
    const save$: Observable<unknown> =
      id === null ? this.productService.create(request) : this.productService.update(id, request);

    save$.subscribe({
      next: () => {
        this.snackBar.open('Produto salvo.', 'OK', { duration: 3000 });
        this.router.navigate(['/products']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erro ao salvar produto.', 'OK', { duration: 5000 });
      }
    });
  }
}
