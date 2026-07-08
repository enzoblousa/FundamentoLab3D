import { CurrencyPipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { colorSwatch } from '../../core/color-swatch';
import { printHeight, toyColor } from '../../core/print-swatch';
import { productWhatsappLink } from '../../core/whatsapp';
import { Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-product-grid',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="grid">
      @for (p of products(); track p.id) {
        <article
          class="card"
          [style.--accent]="toyColor(p.id)"
          [routerLink]="['/products', p.id]"
          role="link"
          tabindex="0"
          [attr.aria-label]="'Ver detalhes de ' + p.name"
          (keydown.enter)="goToProduct(p)"
        >
          <div class="thumb">
            @if (p.imageUrl) {
              <img class="thumb-img" [src]="p.imageUrl" [alt]="p.name" loading="lazy" />
            } @else {
              <span class="thumb-grid"></span>
              <span class="thumb-piece" [style.--h]="printHeight(p.id)"></span>
            }
            @if (manageable() && auth.isAdmin()) {
              <div class="quick-actions" (click)="$event.stopPropagation()">
                <a mat-icon-button [routerLink]="['/products', p.id, 'edit']" [attr.aria-label]="'Editar ' + p.name">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-icon-button type="button" (click)="remove(p)" [attr.aria-label]="'Excluir ' + p.name">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>

          <div class="body">
            @if (p.category) {
              <span class="tag">{{ p.category.name }}</span>
            }
            <h2>{{ p.name }}</h2>
            @if (p.description) {
              <p class="desc">{{ p.description }}</p>
            }
            @if (p.colors.length > 0) {
              <div class="color-dots">
                @for (c of p.colors; track c) {
                  <span class="dot" [style.background]="colorSwatch(c)" [attr.title]="c"></span>
                }
              </div>
            }
          </div>

          <div class="footer">
            <div class="footer-top">
              <span class="price num">{{ p.price | currency: 'BRL' }}</span>
              <a
                mat-icon-button
                class="whatsapp"
                [href]="whatsappUrl(p)"
                target="_blank"
                rel="noopener"
                (click)="$event.stopPropagation()"
                [attr.aria-label]="'Comprar ' + p.name + ' via WhatsApp'"
              >
                <mat-icon>chat</mat-icon>
              </a>
            </div>
            <button
              mat-flat-button
              class="cta"
              type="button"
              (click)="$event.stopPropagation(); addToCart(p)"
            >
              <mat-icon>shopping_bag</mat-icon>
              Colocar na sacola
            </button>
          </div>
        </article>
      }
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.75rem;
    }

    .card {
      --atraso: 0ms;
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--fl-cartao);
      border: 1px solid var(--fl-linha);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: var(--fl-sombra);
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
      cursor: pointer;
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
      animation-delay: var(--atraso);
    }
    // Cada brinquedo chega um instante depois do anterior — a esteira de produção do catálogo
    .card:nth-child(2) { --atraso: 45ms; }
    .card:nth-child(3) { --atraso: 90ms; }
    .card:nth-child(4) { --atraso: 135ms; }
    .card:nth-child(5) { --atraso: 180ms; }
    .card:nth-child(n + 6) { --atraso: 220ms; }
    .card::before {
      content: '';
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: var(--accent, var(--fl-roxo));
      opacity: 0;
      transition: opacity 0.16s ease;
      z-index: 1;
    }
    .card:focus-visible {
      outline: 2px solid var(--fl-roxo);
      outline-offset: 2px;
    }
    .card:hover {
      transform: translateY(-3px);
      border-color: var(--fl-linha);
      box-shadow: var(--fl-sombra-alta);
    }
    .card:hover::before {
      opacity: 1;
    }

    .thumb {
      position: relative;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10%;
      overflow: hidden;
      background: linear-gradient(180deg, var(--fl-cartao), #fafafa);
      border-bottom: 1px solid var(--fl-linha);
    }
    .thumb-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--fl-linha) 1px, transparent 1px),
        linear-gradient(90deg, var(--fl-linha) 1px, transparent 1px);
      background-size: 14px 14px;
      opacity: 0.7;
    }
    .thumb-piece {
      position: relative;
      width: 42%;
      aspect-ratio: 1 / 1;
      border-radius: 6px 6px 2px 2px;
      background: repeating-linear-gradient(
        to bottom,
        var(--accent, var(--fl-roxo)) 0 5px,
        color-mix(in srgb, var(--accent, var(--fl-roxo)) 80%, black) 5px 6px
      );
      transform-origin: bottom;
      transform: scaleY(var(--h));
      transition: transform 0.25s ease;
      animation: fl-imprimir var(--fl-duracao-lenta) var(--fl-ease) backwards;
      animation-delay: calc(var(--atraso) + 90ms);
      filter: drop-shadow(0 2px 3px rgba(18, 18, 18, 0.18));
    }
    .card:hover .thumb-piece { transform: scaleY(min(1, calc(var(--h) + 0.08))); }
    .thumb-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.25s ease;
      animation: fl-entrar var(--fl-duracao-lenta) var(--fl-ease) backwards;
      animation-delay: var(--atraso);
    }
    .card:hover .thumb-img { transform: scale(1.04); }

    .quick-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 2px;
      padding: 2px;
      border-radius: 999px;
      background: rgba(18, 18, 18, 0.7);
      backdrop-filter: blur(2px);
      transform: scale(0.85);
      transform-origin: top right;
      --mat-icon-button-icon-color: #fff;
      --mat-icon-button-state-layer-color: #fff;
    }

    .body { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; padding: 1rem 1rem 0.4rem; }
    .tag {
      align-self: flex-start;
      padding: 0.1rem 0.55rem;
      border-radius: 999px;
      background: var(--fl-linha);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
    }
    .body h2 {
      margin: 0;
      font-family: var(--fl-fonte-marca);
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--fl-tinta);
    }
    .desc {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
      line-height: 1.4;
      color: var(--fl-tinta-suave);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .color-dots { display: flex; gap: 0.3rem; margin-top: 0.1rem; }
    .color-dots .dot {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      border: 1px solid var(--fl-linha);
    }

    .footer {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-top: auto;
      padding: 0.75rem 1rem 1.1rem;
    }
    .footer-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .price {
      font-family: var(--fl-fonte-marca);
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--fl-roxo);
    }
    // Botão de largura total: ícone e texto lado a lado, sem quebrar linha
    .cta {
      width: 100%;
      white-space: nowrap;
    }
    // Verde do WhatsApp — usado só aqui, é a cor que a ação já carrega em qualquer lugar
    .whatsapp {
      flex: none;
      --mat-icon-button-icon-color: #25d366;
      --mat-icon-button-state-layer-color: #25d366;
    }
  `
})
export class ProductGridComponent {
  auth = inject(AuthService);
  private cart = inject(CartService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);

  products = input.required<Product[]>();
  manageable = input(false);
  changed = output<void>();

  printHeight = printHeight;
  toyColor = toyColor;
  colorSwatch = colorSwatch;

  goToProduct(product: Product): void {
    this.router.navigate(['/products', product.id]);
  }

  whatsappUrl(product: Product): string {
    return productWhatsappLink(product.name, product.price);
  }

  addToCart(product: Product): void {
    if (!this.auth.isLoggedIn()) {
      this.toast
        .notice('Entre na sua conta para colocar na sacola.', 'Entrar')
        .onAction()
        .subscribe(() => this.router.navigate(['/login']));
      return;
    }

    this.cart.add(product.id);
    this.toast
      .success(`${product.name} foi para a sacola.`, 'Ver sacola')
      .onAction()
      .subscribe(() => this.router.navigate(['/cart']));
  }

  remove(product: Product): void {
    this.confirmService
      .ask({
        title: 'Excluir brinquedo?',
        message: `Excluir o brinquedo "${product.name}"? Essa ação não pode ser desfeita.`
      })
      .subscribe(confirmed => {
        if (!confirmed) return;

        this.productService.delete(product.id).subscribe({
          next: () => {
            this.toast.success('Brinquedo excluído.');
            this.changed.emit();
          },
          error: () => this.toast.error('Erro ao excluir o brinquedo.')
        });
      });
  }
}
