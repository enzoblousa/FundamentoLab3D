import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../core/models';
import { CategoryService } from '../../core/services/category.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-category-list',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="header">
      <p class="eyebrow">Painel de admin</p>
      <h1>Categorias</h1>
    </div>

    <form class="new-form" (ngSubmit)="create()">
      <input
        type="text"
        placeholder="Nome da nova categoria…"
        [(ngModel)]="newName"
        name="newName"
      />
      <button mat-flat-button type="submit" [disabled]="!newName.trim() || saving()">
        <mat-icon>add</mat-icon>
        Adicionar
      </button>
    </form>

    @if (categories().length === 0) {
      <p class="empty">Nenhuma categoria cadastrada ainda.</p>
    } @else {
      <div class="list">
        @for (c of categories(); track c.id) {
          <article class="row">
            @if (editingId() === c.id) {
              <input
                type="text"
                class="edit-input"
                [(ngModel)]="editingName"
                name="editingName"
                (keydown.enter)="saveRename(c)"
                (keydown.escape)="cancelRename()"
              />
              <div class="actions">
                <button mat-icon-button type="button" (click)="saveRename(c)" aria-label="Salvar">
                  <mat-icon>check</mat-icon>
                </button>
                <button mat-icon-button type="button" (click)="cancelRename()" aria-label="Cancelar">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            } @else {
              <span class="name">{{ c.name }}</span>
              <div class="actions">
                <button mat-icon-button type="button" (click)="startRename(c)" [attr.aria-label]="'Renomear ' + c.name">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button type="button" (click)="remove(c)" [attr.aria-label]="'Excluir ' + c.name">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </article>
        }
      </div>
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
      background: color-mix(in srgb, var(--fl-menta) 22%, white);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--fl-tinta);
    }

    .new-form {
      display: flex;
      gap: 0.6rem;
      margin: 1.25rem 0 1.5rem;
    }
    .new-form input {
      flex: 1;
      max-width: 320px;
      padding: 0.55rem 1rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      background: var(--fl-cartao);
      font: inherit;
      font-weight: 500;
      color: var(--fl-tinta);
      outline: none;
    }
    .new-form input:focus { border-color: var(--fl-roxo); }
    .new-form input::placeholder { color: var(--fl-tinta-suave); font-weight: 400; }

    .list { display: flex; flex-direction: column; gap: 0.75rem; }

    .row {
      --atraso: 0ms;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 1.1rem;
      background: var(--fl-cartao);
      border: 1px solid var(--fl-linha);
      border-radius: 12px;
      box-shadow: var(--fl-sombra);
      animation: fl-entrar var(--fl-duracao) var(--fl-ease) backwards;
      animation-delay: var(--atraso);
    }
    .row:nth-child(2) { --atraso: 40ms; }
    .row:nth-child(3) { --atraso: 80ms; }
    .row:nth-child(4) { --atraso: 120ms; }
    .row:nth-child(n + 5) { --atraso: 160ms; }

    .name {
      font-family: var(--fl-fonte-marca);
      font-weight: 600;
      color: var(--fl-tinta);
    }

    .edit-input {
      flex: 1;
      padding: 0.35rem 0.75rem;
      border: 1px solid var(--fl-linha);
      border-radius: 999px;
      font: inherit;
      font-weight: 600;
      color: var(--fl-tinta);
      outline: none;
    }
    .edit-input:focus { border-color: var(--fl-roxo); }

    .actions { display: flex; gap: 0.15rem; flex: none; }
  `
})
export class CategoryListComponent {
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);

  categories = signal<Category[]>([]);
  newName = '';
  saving = signal(false);

  editingId = signal<number | null>(null);
  editingName = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.categoryService.getAll().subscribe({
      next: categories => this.categories.set(categories),
      error: () => this.toast.error('Erro ao carregar categorias.')
    });
  }

  create(): void {
    const name = this.newName.trim();
    if (!name) return;

    this.saving.set(true);
    this.categoryService.create({ name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.newName = '';
        this.toast.success('Categoria criada.');
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erro ao criar categoria.');
      }
    });
  }

  startRename(category: Category): void {
    this.editingId.set(category.id);
    this.editingName = category.name;
  }

  cancelRename(): void {
    this.editingId.set(null);
    this.editingName = '';
  }

  saveRename(category: Category): void {
    const name = this.editingName.trim();
    if (!name) return;

    this.categoryService.update(category.id, { name }).subscribe({
      next: () => {
        this.cancelRename();
        this.toast.success('Categoria atualizada.');
        this.load();
      },
      error: () => this.toast.error('Erro ao atualizar categoria.')
    });
  }

  remove(category: Category): void {
    this.confirmService
      .ask({
        title: 'Excluir categoria?',
        message: `Excluir a categoria "${category.name}"? Os produtos ficarão sem categoria.`
      })
      .subscribe(confirmed => {
        if (!confirmed) return;

        this.categoryService.delete(category.id).subscribe({
          next: () => {
            this.toast.success('Categoria excluída.');
            this.load();
          },
          error: () => this.toast.error('Erro ao excluir categoria.')
        });
      });
  }
}
