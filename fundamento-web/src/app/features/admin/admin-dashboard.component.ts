import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../core/models';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { ProductGridComponent } from '../products/product-grid.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, MatButtonModule, MatIconModule, ProductGridComponent],
  template: `
    <div class="header">
      <p class="eyebrow">Painel de admin</p>
      <h1>Painel de gerenciamento</h1>
    </div>

    <div class="quick-links">
      <a class="quick-link" routerLink="/categories">
        <mat-icon>sell</mat-icon>
        <span>Categorias</span>
      </a>
      <a class="quick-link" routerLink="/orders">
        <mat-icon>receipt_long</mat-icon>
        <span>Pedidos</span>
      </a>
    </div>

    <section class="products">
      <div class="products-head">
        <h2>Brinquedos</h2>
        <a mat-flat-button routerLink="/products/new">
          <mat-icon>add</mat-icon>
          Novo brinquedo
        </a>
      </div>

      @if (products().length === 0) {
        <p class="empty">A prateleira ainda está vazia. Use “Novo brinquedo” para cadastrar o primeiro.</p>
      } @else {
        <div class="toolbar">
          <label class="search">
            <mat-icon>search</mat-icon>
            <input
              type="text"
              placeholder="Procurar um brinquedo…"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </label>
          <span class="count num">{{ countLabel() }}</span>
        </div>

        @if (filtered().length === 0) {
          <p class="empty">
            Nenhum brinquedo encontrado.
            <button mat-button type="button" (click)="query.set('')">Limpar busca</button>
          </p>
        } @else {
          <app-product-grid [products]="filtered()" [manageable]="true" (changed)="load()" />
        }
      }
    </section>
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
      background: color-mix(in srgb, var(--fl-menta) 22%, white);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--fl-tinta);
    }

    .quick-links {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1.25rem 0 2rem;
    }
    .quick-link {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.9rem 1.3rem;
      border: 1px solid var(--fl-linha);
      border-radius: 12px;
      background: var(--fl-cartao);
      box-shadow: var(--fl-sombra);
      font-family: var(--fl-fonte-marca);
      font-weight: 600;
      color: var(--fl-tinta);
      text-decoration: none;
      transition: transform 0.14s ease, box-shadow 0.14s ease;
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }
    .quick-link:nth-child(2) { animation-delay: 45ms; }
    .quick-link:nth-child(n + 3) { animation-delay: 90ms; }
    .quick-link:hover {
      transform: translateY(-2px);
      box-shadow: var(--fl-sombra-alta);
    }

    .products-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .products-head h2 {
      margin: 0;
      font-family: var(--fl-fonte-marca);
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0 0 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--fl-linha);
    }

    .search {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      max-width: 320px;
      padding: 0.45rem 0.9rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: var(--fl-cartao);
    }
    .search:focus-within { border-color: var(--fl-roxo); }
    .search mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--fl-tinta-suave); }
    .search input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      font-weight: 600;
      color: var(--fl-tinta);
    }
    .search input::placeholder { color: var(--fl-tinta-suave); font-weight: 500; }

    .count {
      flex: none;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
      white-space: nowrap;
    }

    .empty { color: var(--fl-tinta-suave); }
    .empty .mat-mdc-button { margin-left: 0.5rem; vertical-align: baseline; }
  `
})
export class AdminDashboardComponent {
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  products = signal<Product[]>([]);
  query = signal('');

  filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    return this.products().filter(p => !term || p.name.toLowerCase().includes(term));
  });

  countLabel = computed(() => {
    const n = this.filtered().length;
    return `${n} ${n === 1 ? 'brinquedo' : 'brinquedos'}`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.productService.getAll().subscribe({
      next: products => this.products.set(products),
      error: () => this.toast.error('Erro ao carregar brinquedos.')
    });
  }
}
