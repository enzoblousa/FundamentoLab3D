import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product } from '../../core/models';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-order-create',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>Novo pedido</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div formArrayName="items">
            @for (item of items.controls; track item; let i = $index) {
              <div class="item-row" [formGroupName]="i">
                <mat-form-field appearance="outline" class="product-field">
                  <mat-label>Produto</mat-label>
                  <mat-select formControlName="productId">
                    @for (p of products(); track p.id) {
                      <mat-option [value]="p.id">{{ p.name }} — {{ p.price | currency: 'BRL' }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="quantity-field">
                  <mat-label>Qtd.</mat-label>
                  <input matInput type="number" min="1" formControlName="quantity" />
                </mat-form-field>

                <button
                  mat-icon-button
                  type="button"
                  (click)="removeItem(i)"
                  [disabled]="items.length === 1"
                  aria-label="Remover item"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>

          <button mat-stroked-button type="button" (click)="addItem()">
            <mat-icon>add</mat-icon>
            Adicionar item
          </button>

          <p class="total">Total estimado: <strong>{{ total() | currency: 'BRL' }}</strong></p>

          <div class="buttons">
            <a mat-button routerLink="/orders">Cancelar</a>
            <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Enviando...' : 'Criar pedido' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    mat-card { max-width: 640px; margin: 0 auto; }
    form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; align-items: flex-start; }
    .item-row { display: flex; gap: 0.5rem; align-items: center; width: 100%; }
    .product-field { flex: 1; }
    .quantity-field { width: 100px; }
    .total { margin: 0; }
    .buttons { display: flex; justify-content: flex-end; gap: 0.5rem; width: 100%; }
  `
})
export class OrderCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);

  products = signal<Product[]>([]);
  saving = signal(false);
  total = signal(0);

  form = this.fb.group({
    items: this.fb.array<FormGroup>([this.createItemGroup()])
  });

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: products => this.products.set(products),
      error: () => this.snackBar.open('Erro ao carregar produtos.', 'OK', { duration: 5000 })
    });

    this.form.valueChanges.subscribe(() => this.updateTotal());
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      productId: this.fb.control<number | null>(null, Validators.required),
      quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)])
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  private updateTotal(): void {
    const prices = new Map(this.products().map(p => [p.id, p.price]));
    const total = this.items.controls.reduce((sum, group) => {
      const { productId, quantity } = group.value;
      return sum + (prices.get(productId) ?? 0) * (quantity || 0);
    }, 0);
    this.total.set(total);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const items = this.items.controls.map(group => ({
      productId: group.value.productId as number,
      quantity: group.value.quantity as number
    }));

    this.orderService.create(items).subscribe({
      next: () => {
        this.snackBar.open('Pedido criado!', 'OK', { duration: 3000 });
        this.router.navigate(['/orders']);
      },
      error: err => {
        this.saving.set(false);
        const message = typeof err.error === 'string' ? err.error : 'Erro ao criar pedido.';
        this.snackBar.open(message, 'OK', { duration: 5000 });
      }
    });
  }
}
