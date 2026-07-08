# Fundamento 3D — Spec Driven Development (SDD)

Este repositório usa specs escritas em Markdown como a fonte de verdade para
planejar e guiar a implementação de features — por humanos ou por um agente
de IA (Claude Code). Antes de escrever código para uma feature nova ou uma
mudança de comportamento não trivial, ela deve ter uma spec.

## Estrutura de cada feature

Toda feature documentada vira uma pasta com três arquivos:

- **`spec.md`** — O quê e por quê. Requisitos funcionais, regras de negócio,
  critérios de aceite. Não fala de implementação (sem nomes de classe,
  endpoint específico, tabela). Se a resposta pra "por que isso existe assim"
  não está aqui, a spec está incompleta.
- **`plan.md`** — Como. Arquitetura da solução: modelos de dados, endpoints,
  contratos de API, componentes de frontend, fluxo de dados, decisões
  técnicas e alternativas descartadas.
- **`tasks.md`** — Checklist de implementação, derivado do `plan.md`, em
  ordem executável. Cada item deve ser pequeno o suficiente pra ser feito e
  verificado de uma vez.

Use os templates em [`_templates/`](_templates/) como ponto de partida.

## Onde a spec de uma feature mora

- **Feature cross-cutting** (toca `Fundamento.Api` **e** `fundamento-web`,
  ex: Auth, Products & Categories, Orders & Cart): pasta dedicada aqui em
  `Docs/<feature>/` na raiz do repositório. O `plan.md` cobre os dois lados
  (contrato de API + como o frontend consome).
- **Feature interna de um único projeto** (ex: um componente puramente de
  UI que não introduz endpoint novo, como o Admin Dashboard): vive em
  `<projeto>/Docs/<feature>/` dentro do próprio projeto
  (`Fundamento.Api/Docs/` ou `fundamento-web/Docs/`).

Se, ao longo do trabalho, uma feature que parecia interna de um projeto
passa a exigir mudança no outro lado, mova a pasta pra cá.

## Specs existentes

Cross-cutting (`Docs/`):

- [`auth/`](auth/spec.md) — cadastro, login, JWT, roles
- [`products-categories/`](products-categories/spec.md) — catálogo de produtos e categorias
- [`orders-cart/`](orders-cart/spec.md) — carrinho client-side e pedidos

Frontend-only:

- [`fundamento-web/Docs/admin-dashboard/`](../fundamento-web/Docs/admin-dashboard/spec.md) — painel administrativo

## Specs retroativas vs. novas

As specs acima marcadas como já implementadas foram escritas
**retroativamente**, extraídas do código existente e validadas com o autor
do projeto. O `tasks.md` delas é um checklist já concluído — serve de
registro histórico e de contexto pra IA entender o que já está pronto antes
de propor mudanças.

Para uma feature **nova** (ainda não implementada):

1. Copie os três templates de `_templates/` pra uma pasta nova.
2. Escreva o `spec.md` primeiro. Não avance pro `plan.md` até o `spec.md`
   estar validado com o autor do projeto — specs erradas viram planos
   errados viram código errado.
3. Escreva o `plan.md` com o desenho técnico.
4. Quebre o `plan.md` em `tasks.md`.
5. Implemente marcando cada task como concluída (`[x]`) conforme for
   fechando.

## Convenções gerais do domínio

Terminologia e conceitos de domínio compartilhados (Category, Product,
Cart, Order...) estão descritos em [`../CONTEXT.md`](../CONTEXT.md). As
specs individuais podem referenciar esses termos sem redefini-los.
