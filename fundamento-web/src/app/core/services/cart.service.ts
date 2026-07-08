import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface CartItem {
  productId: number;
  quantity: number;
}

const STORAGE_PREFIX = 'fundamento_cart_';

@Injectable({ providedIn: 'root' })
export class CartService {
  private auth = inject(AuthService);
  private itemsSignal = signal<CartItem[]>([]);

  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().reduce((sum, i) => sum + i.quantity, 0));

  constructor() {
    // O carrinho é individual por usuário: troca de conta troca de carrinho.
    effect(() => {
      const userId = this.auth.userId();
      this.itemsSignal.set(userId ? readStorage(userId) : []);
    });
  }

  add(productId: number, quantity = 1): void {
    const userId = this.auth.userId();
    if (!userId) return;

    const items = this.itemsSignal();
    const existing = items.find(i => i.productId === productId);
    const next = existing
      ? items.map(i => (i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i))
      : [...items, { productId, quantity }];

    this.itemsSignal.set(next);
    writeStorage(userId, next);
  }

  setQuantity(productId: number, quantity: number): void {
    const userId = this.auth.userId();
    if (!userId) return;

    const next =
      quantity <= 0
        ? this.itemsSignal().filter(i => i.productId !== productId)
        : this.itemsSignal().map(i => (i.productId === productId ? { ...i, quantity } : i));

    this.itemsSignal.set(next);
    writeStorage(userId, next);
  }

  remove(productId: number): void {
    this.setQuantity(productId, 0);
  }

  clear(): void {
    const userId = this.auth.userId();
    this.itemsSignal.set([]);
    if (userId) writeStorage(userId, []);
  }
}

function readStorage(userId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(userId: string, items: CartItem[]): void {
  localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(items));
}
