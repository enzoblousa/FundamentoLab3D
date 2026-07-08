import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent)
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
    path: 'products/:id',
    loadComponent: () =>
      import('./features/products/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'orders',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/orders/order-list.component').then(m => m.OrderListComponent)
  },
  {
    path: 'categories',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/categories/category-list.component').then(m => m.CategoryListComponent)
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent)
  },
  { path: '**', redirectTo: '' }
];
