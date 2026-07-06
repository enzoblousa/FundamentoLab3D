import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { Order } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-order-list',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatCardModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="header">
      <h1>Pedidos</h1>
      <a mat-flat-button routerLink="/orders/new">
        <mat-icon>add</mat-icon>
        Novo pedido
      </a>
    </div>

    @if (orders().length === 0) {
      <p>Nenhum pedido encontrado.</p>
    }

    @for (order of orders(); track order.id) {
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Pedido #{{ order.id }}</mat-card-title>
          <mat-card-subtitle>
            {{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }} — Total: {{ order.total | currency: 'BRL' }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="order.orderItems">
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let item">{{ productName(item.productId) }}</td>
            </ng-container>

            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>Qtd.</th>
              <td mat-cell *matCellDef="let item">{{ item.quantity }}</td>
            </ng-container>

            <ng-container matColumnDef="unitPrice">
              <th mat-header-cell *matHeaderCellDef>Preço unit.</th>
              <td mat-cell *matCellDef="let item">{{ item.unitPriceAtPurchase | currency: 'BRL' }}</td>
            </ng-container>

            <ng-container matColumnDef="subtotal">
              <th mat-header-cell *matHeaderCellDef>Subtotal</th>
              <td mat-cell *matCellDef="let item">
                {{ item.unitPriceAtPurchase * item.quantity | currency: 'BRL' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="itemColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: itemColumns"></tr>
          </table>
        </mat-card-content>
        @if (auth.isAdmin()) {
          <mat-card-actions align="end">
            <button mat-button (click)="remove(order)">
              <mat-icon>delete</mat-icon>
              Excluir
            </button>
          </mat-card-actions>
        }
      </mat-card>
    }
  `,
  styles: `
    .header { display: flex; align-items: center; justify-content: space-between; }
    mat-card { margin-bottom: 1rem; }
    table { width: 100%; }
  `
})
export class OrderListComponent {
  auth = inject(AuthService);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);

  orders = signal<Order[]>([]);
  itemColumns = ['product', 'quantity', 'unitPrice', 'subtotal'];

  private productNames = new Map<number, string>();

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    forkJoin({
      orders: this.orderService.getAll(),
      products: this.productService.getAll()
    }).subscribe({
      next: ({ orders, products }) => {
        this.productNames = new Map(products.map(p => [p.id, p.name]));
        this.orders.set(orders);
      },
      error: () => this.snackBar.open('Erro ao carregar pedidos.', 'OK', { duration: 5000 })
    });
  }

  productName(productId: number): string {
    return this.productNames.get(productId) ?? `Produto #${productId}`;
  }

  remove(order: Order): void {
    if (!confirm(`Excluir o pedido #${order.id}?`)) return;

    this.orderService.delete(order.id).subscribe({
      next: () => {
        this.snackBar.open('Pedido excluído.', 'OK', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Erro ao excluir pedido.', 'OK', { duration: 5000 })
    });
  }
}
