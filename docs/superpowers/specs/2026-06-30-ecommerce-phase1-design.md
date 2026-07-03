# E-commerce Phase 1 — Design

## Context

`Fundamento.Api` (ASP.NET Core 10 minimal API) and `fundamento-app` (Angular 21 +
Tailwind) currently contain only the default project templates — no domain code,
no database, no real pages. This is the design for phase 1: the smallest
end-to-end slice of an e-commerce flow, built as a foundation to extend later
with accounts, payments, and an admin panel.

## Scope (Phase 1)

In scope:

- Browse a small, fixed/seeded product catalog
- View a single product
- Add products to a cart (client-side)
- "Place order" (fake checkout — no real payment processor) that persists a
  real Order to the database
- Order confirmation page

Explicitly out of scope for phase 1 (future phases):

- User accounts / login / order history per user
- Admin UI for managing products
- Real payment processor integration (Stripe, etc.)
- Product image uploads (placeholder/stock image URLs only)
- Stock/inventory tracking
- Automated tests (xUnit / e2e) — revisit once the flow is stable

## Architecture

**Backend — `Fundamento.Api`**

- Add `Microsoft.EntityFrameworkCore.Sqlite` + `Microsoft.EntityFrameworkCore.Design`.
- SQLite database file (e.g. `fundamento.db`), created via EF Core migrations.
- Models: `Product` (Id, Name, Description, Price, ImageUrl), `Order` (Id,
  CreatedAt, Total), `OrderItem` (OrderId, ProductId, Quantity, UnitPriceAtPurchase).
- Seed data: a handful of hardcoded products inserted on first migration/startup.
- Endpoints:
  - `GET /api/products` — list all products
  - `GET /api/products/{id}` — single product detail
  - `POST /api/orders` — body: list of `{ productId, quantity }`; server looks
    up each product, validates it exists, computes total server-side (never
    trusts client-sent prices), persists Order + OrderItems, returns the order
    (id + line items + total)
  - `GET /api/orders/{id}` — fetch a placed order, for the confirmation page

**Frontend — `fundamento-app`**

- Cart state: a single Angular service using signals, persisted to
  `localStorage` so it survives page refresh. No backend calls until checkout.
- Views/routes:
  - Product list (`/`) — grid of seeded products
  - Product detail (`/products/:id`) — "Add to cart"
  - Cart / checkout (`/cart`) — review line items + quantities, "Place order"
    button, calls `POST /api/orders`
  - Order confirmation (`/orders/:id`) — calls `GET /api/orders/{id}`, shows
    summary

## Data Flow & Error Handling

- Add-to-cart never touches the API — purely client-side until checkout.
- On "Place order", the Angular cart page sends product IDs + quantities to
  `POST /api/orders`. The API is the source of truth for pricing.
- If checkout fails (e.g. a product ID no longer exists), the cart page shows
  an inline error and lets the user retry. No payment provider is involved,
  so failure modes are narrow at this stage.
- No stock-level enforcement in phase 1 — only existence of the product is
  validated.

## Testing

No automated test project is being added in phase 1. This is a deliberate
scope cut to get the working flow built quickly; an xUnit project for the
API and/or expanded `ng test` coverage is a natural addition for phase 2.

## Future Phases (not designed yet)

- Phase 2 candidates: user accounts/auth, order history, admin product
  management, real payment integration, automated tests.
- Each future phase should get its own brainstorming/spec cycle once phase 1
  is working end-to-end.
