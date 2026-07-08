import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  auth = inject(AuthService);
  cart = inject(CartService);
  private router = inject(Router);

  // Confirma visualmente um item entrando na sacola — não dispara na carga inicial
  cartBump = signal(false);

  constructor() {
    let firstRun = true;
    effect(() => {
      this.cart.count();
      if (firstRun) {
        firstRun = false;
        return;
      }
      this.cartBump.set(true);
      setTimeout(() => this.cartBump.set(false), 320);
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
