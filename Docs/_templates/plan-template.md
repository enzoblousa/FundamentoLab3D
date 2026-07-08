# [Nome da Feature] — Plan

> Depende de: [spec.md](spec.md)

## Visão geral da solução

Resumo de 3-5 linhas de como a feature vai ser construída.

## Modelo de dados (backend)

Modelos/entidades novos ou alterados. Só o que muda — não repita o schema
inteiro do banco.

```
NomeDoModelo
- Campo: Tipo — descrição/constraint
```

Migração necessária: sim/não. Se sim, o que ela faz.

## Endpoints (backend)

| Método | Rota | Autorização | Request | Response | Descrição |
|---|---|---|---|---|---|
| GET | `/exemplo` | pública / autenticado / AdminOnly | — | `Exemplo[]` | ... |

Regras de validação e casos de erro por endpoint (400/401/403/404/409...).

## Frontend

- **Serviços**: quais `*.service.ts` novos/alterados e seus métodos.
- **Componentes/rotas**: quais telas, guards aplicados (`authGuard` /
  `adminGuard`), navegação entre elas.
- **Estado**: onde o estado vive (signal local, service singleton,
  localStorage) e por quê.

## Fluxo de dados

Passo a passo do fluxo principal, do clique do usuário até a persistência
e de volta. Inclua os pontos de falha e como cada um é tratado.

## Decisões técnicas e alternativas descartadas

Decisões não óbvias e por que a alternativa não foi escolhida. Isso evita
que alguém (ou uma IA) "corrija" a decisão sem saber que ela foi
deliberada.

- **Decisão**: ...
  **Alternativa descartada**: ...
  **Motivo**: ...

## Testes

O que precisa de cobertura (mesmo que o projeto ainda não tenha suíte
automatizada — documente o que deveria ser testado manualmente ou depois).
