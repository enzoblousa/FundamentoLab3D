# Catálogo: Produtos & Categorias — Plan

> Depende de: [spec.md](spec.md)

## Visão geral da solução

CRUD REST simples sobre duas tabelas relacionadas (`Product` N:1
`Category`, relação opcional). Endpoints de leitura são públicos, os de
escrita exigem a policy `AdminOnly`. Frontend consome via dois services
HTTP finos e reusa o mesmo componente de grid tanto na home pública quanto
no painel de admin (com um flag `manageable` que liga/desliga os botões de
editar/excluir).

## Modelo de dados (backend)

```
Product
- Id: int (PK)
- Name: string?
- Description: string?
- Price: decimal
- CategoryId: int? (FK, nullable — SetNull ao excluir categoria, feito manualmente no handler)
- Category: Category? (nav)
- Colors: List<string> (default [])
- ImageUrl: string?

Category
- Id: int (PK)
- Name: string
```

Sem migração pendente — modelos já existentes. `Product` também é
referenciado por `OrderItem.ProductId` com `DeleteBehavior.Restrict` (ver
[`../orders-cart/plan.md`](../orders-cart/plan.md)) — por isso
`DELETE /product/{id}` precisa checar pedidos associados antes de excluir.

## Endpoints (backend)

Grupo `/product`:

| Método | Rota | Autorização | Request | Response | Descrição |
|---|---|---|---|---|---|
| GET | `/product` | pública | — | `Product[]` (com `Category` incluída) | Lista todos |
| GET | `/product/{id}` | pública | — | `Product` / 404 | Detalhe |
| POST | `/product` | AdminOnly | `ProductRequest` | 201 `Product` / 400 | Cria |
| PUT | `/product/{id}` | AdminOnly | `ProductRequest` | 204 / 400 / 404 | Substitui (full update) |
| DELETE | `/product/{id}` | AdminOnly | — | 204 / 404 / 409 se houver `OrderItem` referenciando o produto | Exclui |

`ProductRequest(Name, Description?, Price, CategoryId?, Colors?, ImageUrl?)`.
Validação em `Create`/`Update`: `Name` obrigatório, `Price > 0`,
`CategoryId` (se informado) precisa existir.

Grupo `/category`:

| Método | Rota | Autorização | Request | Response | Descrição |
|---|---|---|---|---|---|
| GET | `/category` | pública | — | `Category[]` | Lista todas |
| POST | `/category` | AdminOnly | `CategoryRequest` | 201 `Category` / 400 | Cria |
| PUT | `/category/{id}` | AdminOnly | `CategoryRequest` | 204 / 400 / 404 | Renomeia |
| DELETE | `/category/{id}` | AdminOnly | — | 204 / 404 | Exclui e orfaniza produtos |

`CategoryRequest(Name)`. `DeleteCategory` primeiro busca todos os produtos
com aquele `CategoryId`, seta `CategoryId = null` neles, depois remove a
categoria — tudo numa única transação implícita do `SaveChangesAsync`.

## Frontend

- **Serviços**: `core/services/product.service.ts` (`getAll`, `getById`,
  `create`, `update`, `delete`) e `core/services/category.service.ts`
  (mesmo padrão, sem `getById` pois a UI não precisa).

- **Componentes**:
  - `features/products/product-grid.component.ts` — grid reusável. Recebe
    `products` e um flag `manageable` (input). Sempre mostra "colocar na
    sacola"; só mostra ícones de editar/excluir se `manageable` **e**
    `auth.isAdmin()`. Usado tanto na home (`manageable=false` implícito)
    quanto no admin dashboard (`manageable=true`).
  - `features/products/product-detail.component.ts` — carrega um produto
    por id da rota, mostra "não encontrado" se 404.
  - `features/products/product-form.component.ts` — form único para criar
    e editar (diferencia pelo `id` da rota); rota Admin-only
    (`/products/new`, `/products/:id/edit`). Cores são uma chip-list
    editável (adicionar via Enter/botão, remover por chip).
  - `features/categories/category-list.component.ts` — CRUD completo
    inline (criar, renomear com edição in-place, excluir com `confirm()`);
    rota Admin-only (`/categories`).

- **Fallback visual sem imagem**: quando `Product.imageUrl` é nulo, o grid
  e o detalhe desenham um placeholder determinístico a partir do `id` do
  produto (`core/print-swatch.ts`, `core/color-swatch.ts`) — não é dado de
  domínio, é só estética; não precisa ser replicado ao criar novas telas
  a menos que se queira manter a identidade visual.

## Fluxo de dados

**Leitura pública**: `HomeComponent`/`ProductDetailComponent` chamam
`ProductService.getAll`/`getById` diretamente — sem guard, sem token
necessário (o interceptor anexa o token se existir, mas o endpoint não
exige).

**Escrita (Admin)**: `ProductFormComponent`/`CategoryListComponent` chamam
`create`/`update`/`delete` — o token Admin é anexado automaticamente pelo
interceptor; se o usuário perder a role no meio da sessão (não há como
isso acontecer hoje sem re-login), o backend rejeitaria com 403 mesmo que
a UI já tivesse deixado passar.

**Exclusão de categoria com produtos associados**: `CategoryListComponent`
pede confirmação explicando que produtos ficarão sem categoria (mensagem
no `confirm()`), refletindo a regra de negócio do backend.

## Decisões técnicas e alternativas descartadas

- **Decisão**: excluir um produto que já está em algum pedido é bloqueado
  (409), em vez de excluir/cascatear.
  **Alternativa descartada**: manter a exclusão simples e aceitar que o
  histórico de pedidos possa perder itens (comportamento antigo, via
  `DeleteBehavior.Cascade` na FK).
  **Motivo**: corrigido por corromper histórico e total de pedidos — ver
  detalhe completo em
  [`../orders-cart/plan.md`](../orders-cart/plan.md).

- **Decisão**: excluir categoria orfaniza produtos (`CategoryId = null`)
  em vez de bloquear a exclusão ou cascatear a exclusão dos produtos.
  **Alternativa descartada**: impedir exclusão de categoria com produtos
  vinculados (erro 409).
  **Motivo**: categoria é metadado de organização, não parte do ciclo de
  vida do produto — ver definição de Categoria em `CONTEXT.md` ("gerenciada
  independentemente... não amarrada ao ciclo de vida de nenhum produto").

- **Decisão**: `PUT` faz substituição completa do produto (não há PATCH
  funcional, apesar do `ProductPatchDto` existir no código).
  **Alternativa descartada**: suportar atualização parcial.
  **Motivo**: não há uso identificado no frontend que precise de update
  parcial — o form sempre envia o objeto inteiro. Ver pergunta em aberto na
  spec.

## Testes

Sem suíte automatizada no momento. Verificação manual recomendada:

- Criar produto sem categoria → aparece no catálogo sem tag de categoria.
- Criar produto com `categoryId` inexistente → 400.
- Excluir categoria com produtos → produtos continuam existindo, sem tag.
- Criar/editar produto com preço `0` → rejeitado.
- Acessar `/products/new` sem estar logado como Admin → redirecionado.
