import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list.component').then(m => m.ProductListComponent)
  },
  {
    path: 'products/new',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/products/product-form.component').then(m => m.ProductFormComponent)
  },
  {
    path: 'products/:id/edit',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/products/product-form.component').then(m => m.ProductFormComponent)
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./features/orders/order-list.component').then(m => m.OrderListComponent)
  },
  {
    path: 'orders/new',
    loadComponent: () =>
      import('./features/orders/order-create.component').then(m => m.OrderCreateComponent)
  },
  { path: '**', redirectTo: 'products' }
];
