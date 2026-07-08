# Autenticação e Autorização — Tasks

> Depende de: [plan.md](plan.md)
> Status: já implementado — checklist histórico.

## Backend

- [x] Modelo `User` (Id, Email, PasswordHash com `[JsonIgnore]`, Role)
- [x] `PasswordHasher` — PBKDF2/SHA256, salt de 16 bytes, 100k iterações,
      hash de 32 bytes, verificação em tempo constante
- [x] `POST /auth/register` — valida email único, hasheia senha, cria User
      com role `User`, retorna 201 sem o hash
- [x] `POST /auth/login` — verifica hash, emite JWT com claims `sub`,
      `email`, role
- [x] Config `JwtSettings` (Issuer, Audience, Key, ExpiresMinutes) +
      `AddJwtBearer` no pipeline
- [x] Policy `AdminOnly` (`RequireRole("Admin")`) registrada
- [x] Seed de contas dev (`admin@fundamento.com`, `user@fundamento.com`) no
      startup, só se a tabela de usuários estiver vazia
- [x] CORS restrito a `http://localhost:4200`

## Frontend

- [x] `AuthService` — login/register/logout, token em `localStorage`,
      signals derivados do payload do JWT (`isLoggedIn`, `userId`, `email`,
      `role`, `isAdmin`)
- [x] `authGuard` (exige login) e `adminGuard` (exige login + role Admin)
- [x] `authInterceptor` — injeta `Authorization: Bearer`, desloga em 401
      quando havia token
- [x] `LoginComponent` — form reativo, mensagens de erro amigáveis (401)
- [x] `RegisterComponent` — form reativo com senha mínima de 6 caracteres
      (validação client-side), mensagem de erro amigável (409), sem
      autologin após cadastro

## Verificação end-to-end

- [x] Fluxo cadastro → login → acesso a rota protegida validado
      manualmente contra os critérios de aceite do `spec.md`.
