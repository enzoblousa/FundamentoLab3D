import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { colorSwatch } from '../../core/color-swatch';
import { Category } from '../../core/models';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
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

          <mat-form-field appearance="outline">
            <mat-label>URL da imagem</mat-label>
            <input matInput formControlName="imageUrl" placeholder="/products/exemplo.svg" />
          </mat-form-field>

          @if (form.controls.imageUrl.value) {
            <img class="preview" [src]="form.controls.imageUrl.value" alt="Pré-visualização" />
          }

          <mat-form-field appearance="outline">
            <mat-label>Categoria</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option [value]="null">Sem categoria</mat-option>
              @for (c of categories(); track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <label class="colors-label">Cores disponíveis</label>
          @if (colors().length > 0) {
            <div class="color-chips">
              @for (c of colors(); track c) {
                <span class="color-chip">
                  <span class="dot" [style.background]="colorSwatch(c)"></span>
                  {{ c }}
                  <button
                    mat-icon-button
                    type="button"
                    class="remove"
                    (click)="removeColor(c)"
                    [attr.aria-label]="'Remover ' + c"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                </span>
              }
            </div>
          }
          <mat-form-field appearance="outline">
            <mat-label>Adicionar cor</mat-label>
            <input
              matInput
              #colorInput
              placeholder="ex: Vermelho"
              (keydown.enter)="$event.preventDefault(); addColor(colorInput.value); colorInput.value = ''"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="addColor(colorInput.value); colorInput.value = ''"
            >
              <mat-icon>add</mat-icon>
            </button>
          </mat-form-field>

          <div class="buttons">
            <a mat-button routerLink="/admin">Cancelar</a>
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

    .preview {
      width: 140px;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      margin: 0 0 0.75rem;
      border: 1px solid var(--fl-linha);
      border-radius: 10px;
      background: var(--fl-papel);
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
    }

    .colors-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--fl-tinta-suave);
    }
    .color-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.25rem; }
    .color-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.3rem 0.2rem 0.6rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: var(--fl-cartao);
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--fl-tinta);
      animation: fl-chip-pop 0.18s var(--fl-ease) backwards;
    }
    @keyframes fl-chip-pop {
      from { opacity: 0; transform: scale(0.85); }
    }
    .color-chip .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid var(--fl-linha);
      flex: none;
    }
    .color-chip .remove {
      width: 20px;
      height: 20px;
      line-height: 20px;
      --mat-icon-button-icon-size: 14px;
    }
    .color-chip .remove mat-icon { font-size: 14px; width: 14px; height: 14px; }
  `
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);

  id = signal<number | null>(null);
  saving = signal(false);
  categories = signal<Category[]>([]);
  colors = signal<string[]>([]);
  colorSwatch = colorSwatch;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    categoryId: this.fb.control<number | null>(null),
    imageUrl: ['']
  });

  ngOnInit(): void {
    this.categoryService.getAll().subscribe({ next: categories => this.categories.set(categories) });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.id.set(Number(idParam));
    this.productService.getById(Number(idParam)).subscribe({
      next: p => {
        this.form.patchValue({
          name: p.name,
          description: p.description ?? '',
          price: p.price,
          categoryId: p.categoryId ?? null,
          imageUrl: p.imageUrl ?? ''
        });
        this.colors.set(p.colors ?? []);
      },
      error: () => {
        this.toast.error('Produto não encontrado.');
        this.router.navigate(['/admin']);
      }
    });
  }

  addColor(value: string): void {
    const name = value.trim();
    if (!name || this.colors().includes(name)) return;
    this.colors.update(colors => [...colors, name]);
  }

  removeColor(name: string): void {
    this.colors.update(colors => colors.filter(c => c !== name));
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const request = { ...this.form.getRawValue(), colors: this.colors() };
    const id = this.id();
    const save$: Observable<unknown> =
      id === null ? this.productService.create(request) : this.productService.update(id, request);

    save$.subscribe({
      next: () => {
        this.toast.success('Produto salvo.');
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erro ao salvar produto.');
      }
    });
  }
}
