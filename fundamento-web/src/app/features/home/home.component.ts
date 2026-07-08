import { ViewportScroller } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Category, Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { ProductGridComponent } from '../products/product-grid.component';

// Cor da borda ao selecionar uma categoria, alternando pelas 4 cores da marca
const CATEGORY_ACCENTS = ['var(--fl-sol)', '#3ea562', 'var(--fl-roxo)', 'var(--fl-menta)'];

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatIconModule, ProductGridComponent],
  template: `
    <section class="hero">
      <p class="eyebrow">Impressão 3D sob encomenda</p>
      <h1>Brinquedos impressos com precisão</h1>
      <p class="hero-sub">
        Peças coloridas e resistentes, produzidas uma a uma. Escolha um brinquedo, coloque na sacola e acompanhe
        o pedido até chegar na sua porta.
      </p>
      <div class="hero-actions">
        <a mat-flat-button routerLink="/" fragment="brinquedos">Ver catálogo</a>
        @if (!auth.isLoggedIn()) {
          <a mat-button routerLink="/register">Criar conta</a>
        }
      </div>
    </section>

    @if (categories().length > 0) {
      <section class="categories">
        <h2>Categorias</h2>
        <div class="category-row">
          @for (c of categories(); track c.id; let i = $index) {
            <button
              type="button"
              class="category"
              [class.active]="selectedCategory() === c.id"
              [style.--cat-accent]="categoryAccent(i)"
              (click)="selectCategory(c.id)"
            >
              {{ c.name }}
            </button>
          }
        </div>
      </section>
    }

    <section class="toys" id="brinquedos">
      <div class="toys-head">
        <h2>Catálogo</h2>
        <span class="count">{{ countLabel() }}</span>
      </div>

      @if (products().length === 0) {
        <p class="empty">O catálogo ainda está vazio.</p>
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
          @if (selectedCategory() !== null) {
            <button mat-button type="button" (click)="selectedCategory.set(null)">Limpar categoria</button>
          }
        </div>

        @if (filtered().length === 0) {
          <p class="empty">
            Nenhum brinquedo encontrado.
            <button mat-button type="button" (click)="clearFilters()">Limpar filtros</button>
          </p>
        } @else {
          <app-product-grid [products]="filtered()" (changed)="loadProducts()" />
        }
      }
    </section>

    <section class="specs">
      <div class="spec"><span class="k">Material</span><span class="v">PLA premium</span></div>
      <div class="spec"><span class="k">Altura de camada</span><span class="v">0,16 mm</span></div>
      <div class="spec"><span class="k">Produção</span><span class="v">Sob encomenda</span></div>
      <div class="spec"><span class="k">Entrega</span><span class="v">Rastreada até a porta</span></div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .hero {
      padding: 1.5rem 0 2.5rem;
      border-bottom: 1px solid var(--fl-linha);
    }
    // Abertura da loja: eyebrow, título, texto e ações assentam em sequência — a primeira camada impressa
    .hero > * {
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }
    .hero > *:nth-child(1) { animation-delay: 20ms; }
    .hero > *:nth-child(2) { animation-delay: 90ms; }
    .hero > *:nth-child(3) { animation-delay: 160ms; }
    .hero > *:nth-child(4) { animation-delay: 230ms; }
    .eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
    }
    .hero h1 {
      margin: 0 0 0.85rem;
    }
    .hero-sub {
      margin: 0 0 1.5rem;
      max-width: 52ch;
      font-size: 1rem;
      line-height: 1.55;
      color: var(--fl-tinta-suave);
    }
    .hero-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

    .categories { padding: 1.75rem 0 0.5rem; }
    .categories h2 {
      margin: 0 0 1rem;
      font-family: var(--fl-fonte-marca);
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .category-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }
    .category {
      padding: 0.45rem 1rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: var(--fl-cartao);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--fl-tinta-suave);
      cursor: pointer;
      transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease, transform 0.1s ease;
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }
    .category:nth-child(n + 2) { animation-delay: 35ms; }
    .category:nth-child(n + 4) { animation-delay: 70ms; }
    .category:active { transform: scale(0.96); }
    .category:hover {
      border-color: var(--cat-accent, var(--fl-roxo));
      color: var(--fl-tinta);
    }
    .category.active {
      border-color: var(--cat-accent, var(--fl-roxo));
      background: color-mix(in srgb, var(--fl-roxo) 10%, white);
      color: var(--fl-roxo-escuro);
    }

    .toys { padding: 1.75rem 0 1rem; }
    .toys-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.25rem;
    }
    .toys-head h2 {
      margin: 0;
      font-family: var(--fl-fonte-marca);
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .count {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--fl-tinta-suave);
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 1rem 0 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--fl-linha);
    }
    .search {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      max-width: 360px;
      padding: 0.5rem 0.9rem;
      border: 1px solid var(--fl-linha);
      border-radius: 10px;
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
      color: var(--fl-tinta);
    }
    .search input::placeholder { color: var(--fl-tinta-suave); }

    .empty .mat-mdc-button { margin-left: 0.5rem; vertical-align: baseline; }

    .specs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 1.5rem;
      border: 1px solid var(--fl-linha);
      border-radius: 14px;
      overflow: hidden;
    }
    .spec {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 1rem 1.25rem;
      border-left: 1px solid var(--fl-linha);
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }
    .spec:nth-child(2) { animation-delay: 40ms; }
    .spec:nth-child(3) { animation-delay: 80ms; }
    .spec:nth-child(4) { animation-delay: 120ms; }
    .spec:first-child { border-left: none; }
    .spec .k {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
    }
    .spec .v {
      font-family: var(--fl-fonte-marca);
      font-size: 1rem;
      font-weight: 600;
      color: var(--fl-tinta);
    }

    @media (max-width: 640px) {
      .spec { border-left: none; border-top: 1px solid var(--fl-linha); }
      .spec:first-child { border-top: none; }
    }
  `
})
export class HomeComponent {
  auth = inject(AuthService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private viewportScroller = inject(ViewportScroller);

  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  query = signal('');
  selectedCategory = signal<number | null>(null);

  filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const categoryId = this.selectedCategory();

    return this.products().filter(p => {
      const matchesTerm = !term || p.name.toLowerCase().includes(term);
      const matchesCategory = categoryId === null || p.categoryId === categoryId;
      return matchesTerm && matchesCategory;
    });
  });

  countLabel = computed(() => {
    const n = this.filtered().length;
    return `${n} ${n === 1 ? 'brinquedo' : 'brinquedos'}`;
  });

  private categoriesReady = false;
  private productsReady = false;

  ngOnInit(): void {
    this.categoryService.getAll().subscribe({
      next: categories => this.categories.set(categories),
      error: () => {
        this.categoriesReady = true;
        this.scrollToFragment();
      },
      complete: () => {
        this.categoriesReady = true;
        this.scrollToFragment();
      }
    });
    this.loadProducts();

    // Já carregado (mesma instância do componente): reage a um clique em "Brinquedos" enquanto já está na home.
    this.route.fragment.subscribe(() => this.scrollToFragment());
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: products => this.products.set(products),
      error: () => {
        this.toast.error('Erro ao carregar brinquedos.');
        this.productsReady = true;
        this.scrollToFragment();
      },
      complete: () => {
        this.productsReady = true;
        this.scrollToFragment();
      }
    });
  }

  categoryAccent(index: number): string {
    return CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
  }

  selectCategory(id: number): void {
    this.selectedCategory.set(this.selectedCategory() === id ? null : id);
  }

  clearFilters(): void {
    this.query.set('');
    this.selectedCategory.set(null);
  }

  private scrollToFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment || !this.categoriesReady || !this.productsReady) return;

    // Espera o layout assentar (grids recém-renderizados) antes de rolar até a âncora.
    setTimeout(() => this.viewportScroller.scrollToAnchor(fragment));
  }
}
