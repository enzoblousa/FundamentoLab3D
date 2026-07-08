import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import {
  ORDER_STATUSES,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  Order,
  OrderStatus
} from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-order-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <div class="header">
      <p class="eyebrow">Painel de admin</p>
      <h1>Pedidos</h1>
    </div>

    @if (orders().length === 0) {
      <p class="empty">Nenhum pedido foi feito ainda.</p>
    }

    @for (order of orders(); track order.id) {
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Pedido #{{ order.id }}</mat-card-title>
          <mat-card-subtitle>
            {{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }} — {{ order.user?.email ?? 'Cliente removido' }} — Total:
            {{ order.total | currency: 'BRL' }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <button
            type="button"
            class="status-pill"
            [style.--status-color]="statusColor(order.status)"
            [matMenuTriggerFor]="statusMenu"
          >
            {{ statusLabel(order.status) }}
            <mat-icon>expand_more</mat-icon>
          </button>
          <mat-menu #statusMenu="matMenu">
            @for (s of statuses; track s) {
              <button mat-menu-item type="button" (click)="changeStatus(order, s)">
                {{ statusLabel(s) }}
              </button>
            }
          </mat-menu>

          <table mat-table [dataSource]="order.orderItems">
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let item">{{ productName(item.productId) }}</td>
            </ng-container>

            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef class="num">Qtd.</th>
              <td mat-cell *matCellDef="let item" class="num">{{ item.quantity }}</td>
            </ng-container>

            <ng-container matColumnDef="unitPrice">
              <th mat-header-cell *matHeaderCellDef class="num">Preço unit.</th>
              <td mat-cell *matCellDef="let item" class="num">{{ item.unitPriceAtPurchase | currency: 'BRL' }}</td>
            </ng-container>

            <ng-container matColumnDef="subtotal">
              <th mat-header-cell *matHeaderCellDef class="num">Subtotal</th>
              <td mat-cell *matCellDef="let item" class="num">
                {{ item.unitPriceAtPurchase * item.quantity | currency: 'BRL' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="itemColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: itemColumns"></tr>
          </table>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-button (click)="remove(order)">
            <mat-icon>delete</mat-icon>
            Excluir
          </button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    .header { margin-bottom: 0.75rem; }
    .header h1 { margin: 0; }
    .eyebrow {
      display: inline-block;
      margin: 0 0 0.5rem;
      padding: 0.2rem 0.75rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: color-mix(in srgb, var(--fl-laranja) 20%, white);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--fl-tinta);
    }
    mat-card {
      margin-bottom: 1.25rem;
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }
    mat-card:nth-of-type(2) { animation-delay: 45ms; }
    mat-card:nth-of-type(3) { animation-delay: 90ms; }
    mat-card:nth-of-type(n + 4) { animation-delay: 130ms; }
    table { width: 100%; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      margin-bottom: 1rem;
      padding: 0.3rem 0.4rem 0.3rem 0.85rem;
      border: 1px solid color-mix(in srgb, var(--status-color) 45%, var(--fl-linha));
      border-radius: 999px;
      background: color-mix(in srgb, var(--status-color) 16%, white);
      font: inherit;
      font-weight: 600;
      font-size: 0.78rem;
      color: var(--fl-tinta);
      cursor: pointer;
    }
    .status-pill mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `
})
export class OrderListComponent {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);

  orders = signal<Order[]>([]);
  itemColumns = ['product', 'quantity', 'unitPrice', 'subtotal'];
  statuses = ORDER_STATUSES;

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
      error: () => this.toast.error('Erro ao carregar pedidos.')
    });
  }

  productName(productId: number): string {
    return this.productNames.get(productId) ?? `Produto #${productId}`;
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  statusColor(status: OrderStatus): string {
    return ORDER_STATUS_COLORS[status];
  }

  changeStatus(order: Order, status: OrderStatus): void {
    if (order.status === status) return;

    this.orderService.updateStatus(order.id, status).subscribe({
      next: updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
        this.toast.success(`Pedido #${order.id} agora está ${this.statusLabel(status).toLowerCase()}.`);
      },
      error: () => this.toast.error('Erro ao atualizar status do pedido.')
    });
  }

  remove(order: Order): void {
    this.confirmService
      .ask({ title: 'Excluir pedido?', message: `Excluir o pedido #${order.id}? Essa ação não pode ser desfeita.` })
      .subscribe(confirmed => {
        if (!confirmed) return;

        this.orderService.delete(order.id).subscribe({
          next: () => {
            this.toast.success('Pedido excluído.');
            this.load();
          },
          error: () => this.toast.error('Erro ao excluir pedido.')
        });
      });
  }
}
