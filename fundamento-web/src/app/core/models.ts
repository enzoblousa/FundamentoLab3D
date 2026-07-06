export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
}

export interface ProductRequest {
  name: string;
  description?: string;
  price: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPriceAtPurchase: number;
}

export interface Order {
  id: number;
  createdAt: string;
  total: number;
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
