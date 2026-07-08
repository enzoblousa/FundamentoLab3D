# Painel de Admin — Plan

> Depende de: [spec.md](spec.md)

## Visão geral da solução

Componente único (`AdminDashboardComponent`) que carrega todos os produtos
via `ProductService`, aplica um filtro client-side por texto, e renderiza
o `ProductGridComponent` já existente em modo `manageable=true`. Não
introduz estado novo além de um `signal` de busca — reusa integralmente a
infraestrutura da feature de Products & Categories.

## Modelo de dados

Nenhum — feature 100% de composição de UI sobre dados já expostos por
`ProductService`.

## Endpoints

Nenhum endpoint novo. Consome `GET /product` (via `ProductService.getAll`)
e, indiretamente através do `ProductGridComponent`, `DELETE
/product/{id}`.

## Frontend

- **Componente**: `features/admin/admin-dashboard.component.ts`
  - Rota `/admin`, guard `adminGuard` (`app.routes.ts`).
  - `products = signal<Product[]>([])`, carregado em `ngOnInit` via
    `ProductService.getAll`.
  - `query = signal('')` ligado a um input de busca; `filtered =
    computed(...)` filtra `products()` por
    `name.toLowerCase().includes(term)`.
  - `countLabel` computed — pluralização simples ("1 brinquedo" / "N
    brinquedos").
  - Reusa `<app-product-grid [products]="filtered()" [manageable]="true"
    (changed)="load()" />` — o evento `changed` (emitido após exclusão
    bem-sucedida dentro do grid) dispara um novo `load()` pra
    resincronizar a lista.
  - Links estáticos (`routerLink`) pra `/categories`, `/orders` e
    `/products/new`.

## Fluxo de dados

`ngOnInit` → `ProductService.getAll()` → popula `products` → grid
renderiza `filtered()` (reativo à busca) → ação de excluir dentro do grid
chama `ProductService.delete` diretamente e emite `changed` → dashboard
recarrega a lista inteira (não faz remoção otimista local).

## Decisões técnicas e alternativas descartadas

- **Decisão**: reusar `ProductGridComponent` com flag `manageable` em vez
  de ter uma tabela de admin separada.
  **Alternativa descartada**: componente de tabela dedicado pra admin
  (mais denso, colunas extras).
  **Motivo**: menos duplicação de template/estilo; o grid já cobre o caso
  de uso visual. Tradeoff: telas de admin com muitos produtos ficam menos
  densas que uma tabela seria.

- **Decisão**: busca client-side sobre a lista já carregada, sem endpoint
  de busca no backend.
  **Alternativa descartada**: `GET /product?search=...`.
  **Motivo**: catálogo pequeno o suficiente pra não justificar busca
  server-side ainda; revisitar se o volume de produtos crescer (mesma
  ressalva de paginação já registrada na spec de Products & Categories).

## Testes

Sem suíte automatizada no momento. Verificação manual recomendada:

- Acessar `/admin` como `User` → redirecionado.
- Buscar por um termo que não existe → estado vazio com botão "limpar
  busca" funcional.
- Excluir um produto pela lista → lista recarrega e o item some.
