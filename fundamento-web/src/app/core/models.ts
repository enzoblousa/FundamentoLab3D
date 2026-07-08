export interface Category {
  id: number;
  name: string;
}

export interface CategoryRequest {
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  categoryId?: number | null;
  category?: Category | null;
  colors: string[];
  imageUrl?: string | null;
}

export interface ProductRequest {
  name: string;
  description?: string;
  price: number;
  categoryId?: number | null;
  colors: string[];
  imageUrl?: string | null;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPriceAtPurchase: number;
}

export const ORDER_STATUSES = ['Pending', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: 'Pendente',
  Preparing: 'Preparando',
  Shipped: 'Enviado',
  Delivered: 'Entregue',
  Cancelled: 'Cancelado'
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: 'var(--fl-sol)',
  Preparing: 'var(--fl-laranja)',
  Shipped: 'var(--fl-menta)',
  Delivered: 'var(--fl-roxo)',
  Cancelled: 'var(--fl-tinta-suave)'
};

export interface Order {
  id: number;
  createdAt: string;
  total: number;
  status: OrderStatus;
  userId?: number | null;
  user?: { id: number; email: string; role: string } | null;
  orderItems: OrderItem[];
}

export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  role: string;
}
