import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { printHeight, toyColor } from '../../core/print-swatch';
import { cartWhatsappLink } from '../../core/whatsapp';
import { Product } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

interface CartLine {
  productId: number;
  quantity: number;
  product: Product | null;
}

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="cart-head">
      <p class="eyebrow">Sacola de compras</p>
      <h1>Sua sacola</h1>
    </div>

    @if (lines().length === 0) {
      <p class="empty">
        Sua sacola ainda está vazia.
        <a mat-button routerLink="/" fragment="brinquedos">Ver brinquedos</a>
      </p>
    } @else {
      <div class="lines">
        @for (line of lines(); track line.productId) {
          <article class="line" [style.--accent]="toyColor(line.productId)">
            <div class="thumb">
              <span class="thumb-grid"></span>
              <span class="thumb-piece" [style.--h]="printHeight(line.productId)"></span>
            </div>

            <div class="info">
              <h2>{{ line.product?.name ?? 'Brinquedo indisponível' }}</h2>
              @if (line.product) {
                <span class="unit num">{{ line.product.price | currency: 'BRL' }} / un.</span>
              }
            </div>

            @if (line.product) {
              <div class="qty">
                <button mat-icon-button type="button" (click)="decrement(line)" aria-label="Diminuir quantidade">
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="qty-value num">{{ line.quantity }}</span>
                <button mat-icon-button type="button" (click)="increment(line)" aria-label="Aumentar quantidade">
                  <mat-icon>add</mat-icon>
                </button>
              </div>

              <span class="subtotal num">{{ line.product.price * line.quantity | currency: 'BRL' }}</span>
            }

            <button mat-icon-button type="button" (click)="remove(line)" aria-label="Remover item">
              <mat-icon>delete</mat-icon>
            </button>
          </article>
        }
      </div>

      <div class="summary">
        <span class="total-label">Total</span>
        <span class="total num">{{ total() | currency: 'BRL' }}</span>
        <a mat-stroked-button class="whatsapp" [href]="whatsappUrl()" target="_blank" rel="noopener">
          <mat-icon>chat</mat-icon>
          Fazer pedido via WhatsApp
        </a>
        <button mat-flat-button type="button" (click)="submit()" [disabled]="saving()">
          {{ saving() ? 'Enviando...' : 'Finalizar pedido' }}
        </button>
      </div>
    }
  `,
  styles: `
    .cart-head { margin-bottom: 0.5rem; }
    .cart-head h1 { margin: 0; }
    .eyebrow {
      display: inline-block;
      margin: 0 0 0.5rem;
      padding: 0.2rem 0.75rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: color-mix(in srgb, var(--fl-menta) 22%, white);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--fl-tinta);
    }

    .lines { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.25rem; }

    .line {
      --atraso: 0ms;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem 1rem;
      padding: 0.75rem 1rem;
      background: var(--fl-cartao);
      border: 1px solid var(--fl-linha);
      border-radius: 12px;
      box-shadow: var(--fl-sombra);
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
      animation-delay: var(--atraso);
    }
    .line:nth-child(2) { --atraso: 45ms; }
    .line:nth-child(3) { --atraso: 90ms; }
    .line:nth-child(4) { --atraso: 135ms; }
    .line:nth-child(n + 5) { --atraso: 180ms; }

    .thumb {
      position: relative;
      flex: none;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 8%;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid var(--fl-linha);
      background: linear-gradient(180deg, var(--fl-cartao), #fafafa);
    }
    .thumb-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--fl-linha) 1px, transparent 1px),
        linear-gradient(90deg, var(--fl-linha) 1px, transparent 1px);
      background-size: 8px 8px;
      opacity: 0.7;
    }
    .thumb-piece {
      position: relative;
      width: 44%;
      aspect-ratio: 1 / 1;
      border-radius: 4px 4px 1px 1px;
      background: repeating-linear-gradient(
        to bottom,
        var(--accent, var(--fl-roxo)) 0 3px,
        color-mix(in srgb, var(--accent, var(--fl-roxo)) 80%, black) 3px 4px
      );
      transform-origin: bottom;
      transform: scaleY(var(--h));
      animation: fl-imprimir var(--fl-duracao-lenta) var(--fl-ease) backwards;
      animation-delay: calc(var(--atraso) + 70ms);
    }

    .info { flex: 1 1 160px; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
    .info h2 {
      margin: 0;
      font-family: var(--fl-fonte-marca);
      font-size: 1rem;
      font-weight: 700;
      color: var(--fl-tinta);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .unit { font-size: 0.78rem; font-weight: 600; color: var(--fl-tinta-suave); }

    .qty { flex: none; display: flex; align-items: center; gap: 0.15rem; }
    .qty-value { min-width: 1.5rem; text-align: center; font-weight: 700; }

    .subtotal { flex: none; width: 90px; text-align: right; font-weight: 700; color: var(--fl-tinta); }

    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem 1rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--fl-linha);
    }
    .total-label { color: var(--fl-tinta-suave); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .total { font-family: var(--fl-fonte-marca); font-size: 1.4rem; font-weight: 700; color: var(--fl-roxo); margin-right: 0.5rem; }
    // Verde do WhatsApp — a cor que a ação já carrega em qualquer lugar
    .whatsapp {
      --mdc-outlined-button-outline-color: #25d366;
      color: #1da851;
    }
  `
})
export class CartComponent {
  private cart = inject(CartService);
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private toast = inject(ToastService);

  products = signal<Product[]>([]);
  saving = signal(false);

  printHeight = printHeight;
  toyColor = toyColor;

  lines = computed<CartLine[]>(() => {
    const productMap = new Map(this.products().map(p => [p.id, p]));
    return this.cart.items().map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      product: productMap.get(i.productId) ?? null
    }));
  });

  total = computed(() => this.lines().reduce((sum, l) => sum + (l.product?.price ?? 0) * l.quantity, 0));

  whatsappUrl(): string {
    const linhas = this.lines()
      .filter(l => l.product)
      .map(l => ({ name: l.product!.name, quantity: l.quantity, subtotal: l.product!.price * l.quantity }));

    return cartWhatsappLink(linhas, this.total());
  }

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: products => this.products.set(products),
      error: () => this.toast.error('Erro ao carregar produtos.')
    });
  }

  increment(line: CartLine): void {
    this.cart.setQuantity(line.productId, line.quantity + 1);
  }

  decrement(line: CartLine): void {
    this.cart.setQuantity(line.productId, line.quantity - 1);
  }

  remove(line: CartLine): void {
    this.cart.remove(line.productId);
  }

  submit(): void {
    const items = this.lines()
      .filter(l => l.product)
      .map(l => ({ productId: l.productId, quantity: l.quantity }));

    if (items.length === 0) return;

    this.saving.set(true);
    this.orderService.create(items).subscribe({
      next: () => {
        this.cart.clear();
        this.toast.success('Pedido criado! Obrigado pela compra.');
        this.router.navigate(['/']);
      },
      error: err => {
        this.saving.set(false);
        const message = typeof err.error === 'string' ? err.error : 'Erro ao criar pedido.';
        this.toast.error(message);
      }
    });
  }
}
