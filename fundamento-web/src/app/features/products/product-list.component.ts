import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, RouterLink, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="header">
      <h1>Produtos</h1>
      @if (auth.isAdmin()) {
        <a mat-flat-button routerLink="/products/new">
          <mat-icon>add</mat-icon>
          Novo produto
        </a>
      }
    </div>

    @if (products().length === 0) {
      <p>Nenhum produto cadastrado.</p>
    } @else {
      <table mat-table [dataSource]="products()">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let p">{{ p.name }}</td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Descrição</th>
          <td mat-cell *matCellDef="let p">{{ p.description }}</td>
        </ng-container>

        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>Preço</th>
          <td mat-cell *matCellDef="let p">{{ p.price | currency: 'BRL' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="actions">
            <a mat-icon-button [routerLink]="['/products', p.id, 'edit']" aria-label="Editar">
              <mat-icon>edit</mat-icon>
            </a>
            <button mat-icon-button (click)="remove(p)" aria-label="Excluir">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns()"></tr>
        <tr mat-row *matRowDef="let row; columns: columns()"></tr>
      </table>
    }
  `,
  styles: `
    .header { display: flex; align-items: center; justify-content: space-between; }
    table { width: 100%; }
    .actions { text-align: right; white-space: nowrap; }
  `
})
export class ProductListComponent {
  auth = inject(AuthService);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);

  products = signal<Product[]>([]);

  columns = () =>
    this.auth.isAdmin()
      ? ['name', 'description', 'price', 'actions']
      : ['name', 'description', 'price'];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.productService.getAll().subscribe({
      next: products => this.products.set(products),
      error: () => this.snackBar.open('Erro ao carregar produtos.', 'OK', { duration: 5000 })
    });
  }

  remove(product: Product): void {
    if (!confirm(`Excluir o produto "${product.name}"?`)) return;

    this.productService.delete(product.id).subscribe({
      next: () => {
        this.snackBar.open('Produto excluído.', 'OK', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Erro ao excluir produto.', 'OK', { duration: 5000 })
    });
  }
}
