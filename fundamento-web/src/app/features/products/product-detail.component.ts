import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { colorSwatch } from '../../core/color-swatch';
import { printHeight, toyColor } from '../../core/print-swatch';
import { productWhatsappLink } from '../../core/whatsapp';
import { Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    @if (product(); as p) {
      <a routerLink="/" fragment="brinquedos" class="back">
        <mat-icon>arrow_back</mat-icon>
        Voltar para a loja
      </a>

      <div class="layout" [style.--accent]="toyColor(p.id)">
        <div class="thumb">
          @if (p.imageUrl) {
            <img class="thumb-img" [src]="p.imageUrl" [alt]="p.name" />
          } @else {
            <span class="thumb-grid"></span>
            <span class="thumb-piece" [style.--h]="printHeight(p.id)"></span>
          }
        </div>

        <div class="info">
          @if (p.category) {
            <span class="tag">{{ p.category.name }}</span>
          }
          <h1>{{ p.name }}</h1>
          <span class="price num">{{ p.price | currency: 'BRL' }}</span>

          @if (p.description) {
            <p class="desc">{{ p.description }}</p>
          }

          @if (p.colors.length > 0) {
            <div class="colors">
              <span class="colors-label">Cores disponíveis</span>
              <div class="swatches">
                @for (c of p.colors; track c) {
                  <span class="swatch">
                    <span class="dot" [style.background]="colorSwatch(c)"></span>
                    {{ c }}
                  </span>
                }
              </div>
            </div>
          }

          <div class="actions">
            <button mat-flat-button class="cta" type="button" (click)="addToCart(p)">
              <mat-icon>shopping_bag</mat-icon>
              Colocar na sacola
            </button>
            <a mat-stroked-button class="whatsapp" [href]="whatsappUrl(p)" target="_blank" rel="noopener">
              <mat-icon>chat</mat-icon>
              Comprar pelo WhatsApp
            </a>
          </div>
        </div>
      </div>
    } @else if (notFound()) {
      <p class="empty">Brinquedo não encontrado.</p>
    }
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      margin-bottom: 1.5rem;
      font-weight: 700;
      color: var(--fl-tinta-suave);
      text-decoration: none;
    }
    .back:hover { color: var(--fl-tinta); }
    .back mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
      gap: 2.5rem;
      align-items: start;
    }
    @media (max-width: 720px) {
      .layout { grid-template-columns: 1fr; }
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
      border: 1px solid var(--fl-linha);
      border-radius: 14px;
      box-shadow: var(--fl-sombra);
    }
    .thumb-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--fl-linha) 1px, transparent 1px),
        linear-gradient(90deg, var(--fl-linha) 1px, transparent 1px);
      background-size: 18px 18px;
      opacity: 0.7;
    }
    .thumb-piece {
      position: relative;
      width: 46%;
      aspect-ratio: 1 / 1;
      border-radius: 8px 8px 3px 3px;
      background: repeating-linear-gradient(
        to bottom,
        var(--accent, var(--fl-roxo)) 0 7px,
        color-mix(in srgb, var(--accent, var(--fl-roxo)) 80%, black) 7px 9px
      );
      transform-origin: bottom;
      transform: scaleY(var(--h));
      animation: fl-imprimir 720ms var(--fl-ease) backwards;
      animation-delay: 80ms;
      filter: drop-shadow(0 3px 4px rgba(18, 18, 18, 0.2));
    }
    .thumb-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      animation: fl-entrar var(--fl-duracao-lenta) var(--fl-ease) backwards;
    }

    // A ficha do produto entra em sequência — cada linha assenta um instante depois da anterior
    .info { display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; }
    .info > * {
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }
    .info > *:nth-child(1) { animation-delay: 70ms; }
    .info > *:nth-child(2) { animation-delay: 120ms; }
    .info > *:nth-child(3) { animation-delay: 170ms; }
    .info > *:nth-child(4) { animation-delay: 220ms; }
    .info > *:nth-child(5) { animation-delay: 270ms; }
    .info > *:nth-child(6) { animation-delay: 320ms; }
    .tag {
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      background: var(--fl-linha);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
    }
    .info h1 {
      margin: 0;
      font-family: var(--fl-fonte-marca);
      color: var(--fl-tinta);
    }
    .price {
      font-family: var(--fl-fonte-marca);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--fl-roxo);
    }
    .desc {
      margin: 0.25rem 0;
      line-height: 1.5;
      color: var(--fl-tinta-suave);
    }

    .colors { display: flex; flex-direction: column; gap: 0.4rem; margin: 0.25rem 0; }
    .colors-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
    }
    .swatches { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .swatch {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.7rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: var(--fl-cartao);
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--fl-tinta);
    }
    .swatch .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid var(--fl-linha);
    }

    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 0.75rem; }
    .cta { flex: none; }
    // Verde do WhatsApp — a cor que a ação já carrega em qualquer lugar
    .whatsapp {
      flex: none;
      --mdc-outlined-button-outline-color: #25d366;
      color: #1da851;
    }
    .empty { color: var(--fl-tinta-suave); }
  `
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private cart = inject(CartService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  product = signal<Product | null>(null);
  notFound = signal(false);

  printHeight = printHeight;
  toyColor = toyColor;
  colorSwatch = colorSwatch;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    this.productService.getById(id).subscribe({
      next: p => this.product.set(p),
      error: () => this.notFound.set(true)
    });
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
}
