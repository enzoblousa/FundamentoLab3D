# Authentication & Authorization — Design

## Context

`Fundamento.Api` (ASP.NET Core 10 minimal API) currently exposes only CRUD
endpoints for `Product`, backed by an EF Core InMemory database. The phase 1
e-commerce design (`2026-06-30-ecommerce-phase1-design.md`) explicitly scoped
user accounts/login out of that phase. This design covers that follow-up
slice: login with two fixed roles, Admin and User, and role-based protection
of the existing `Product` write endpoints.

The `.csproj` already references `Microsoft.AspNetCore.Authentication.JwtBearer`,
and `Program.cs` already calls `UseAuthentication()` / `UseAuthorization()`,
but neither is backed by real configuration yet.

## Scope

In scope:

- `User` entity with two roles: `Admin`, `User`.
- Password hashing (PBKDF2, via `Rfc2898DeriveBytes`, no extra NuGet package).
- Two users seeded at startup (one Admin, one User) — no self-service
  registration endpoint.
- `POST /auth/login` — issues a JWT containing the user's id, email, and role.
- JWT bearer authentication configured from `appsettings.json`.
- `Product` write endpoints (`POST`/`PUT`/`DELETE`) require role `Admin`.
  `GET` endpoints remain anonymous.
- Fixing two pre-existing bugs in `Program.cs` that currently prevent the
  project from compiling (missing `;` after `AddOpenApiDocument(...)`, a
  duplicate trailing `app.Run()`), and invalid JSON in `appsettings.json`
  (stray trailing comma) — encountered while touching these files for JWT
  config.

Explicitly out of scope:

- Self-service registration endpoint.
- Password reset / account management.
- Persisting users beyond the app's InMemory database lifetime (data resets
  on every restart, matching the rest of the app's current persistence
  story — SQLite migration remains a separate future task).
- Per-user data (e.g. order history) — no `Order` model exists yet.
- Automated tests (xUnit) — consistent with the phase 1 scope cut; revisit
  once more of the app is built out.

## Architecture

**Data model**

- `User { Id, Email, PasswordHash, Role }` — `Role` stored as a plain string
  (`"Admin"` or `"User"`); no separate roles table, since the set of roles is
  fixed and small.
- `PasswordHash` stores `{saltBase64}:{hashBase64}` produced by PBKDF2
  (`Rfc2898DeriveBytes.Pbkdf2`, SHA256, fixed iteration count baked into the
  hasher helper).
- `DbSet<User> Users` added to the existing `ProductDb` context — no second
  `DbContext` is introduced for this slice.

**Seeding**

- On startup, after `EnsureCreated()`, seed exactly two users if the table is
  empty: `admin@fundamento.com` (role `Admin`) and `user@fundamento.com`
  (role `User`), with fixed test passwords, hashed through the same helper
  used at login time.

**JWT configuration**

- New `Jwt` section in `appsettings.json`: `Key`, `Issuer`, `Audience`,
  `ExpiresMinutes`.
- `Program.cs` wires `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(...)`, reading these values and mapping the role claim so
  `RequireAuthorization` role checks work against it.
- An `"AdminOnly"` authorization policy is registered (`RequireRole("Admin")`)
  and applied to the `Product` write routes via `.RequireAuthorization("AdminOnly")`
  (minimal-API style — no controller `[Authorize]` attributes are involved).

**Endpoints**

- `POST /auth/login` — body `{ email, password }`. Looks up the user by
  email, verifies the password against the stored hash, and on success
  returns `{ token, expiresAt }`. The JWT includes the user id (`sub`),
  email, and role claims.
- `GET /product`, `GET /product/{id}` — unchanged, anonymous.
- `POST /product`, `PUT /product/{id}`, `DELETE /product/{id}` — now require
  the `AdminOnly` policy.

## Data Flow & Error Handling

- Login: invalid email or invalid password both return a generic
  `401 Unauthorized` (the response never indicates which part was wrong).
- Calling a protected endpoint without a token, with an expired token, or
  with a valid token but the wrong role: standard ASP.NET Core JWT bearer /
  authorization middleware behavior (`401` for missing/invalid token, `403`
  for a valid token lacking the required role). No custom error handling is
  added on top of the framework defaults.
- No token refresh flow — tokens simply expire after `ExpiresMinutes` and the
  user logs in again.

## Testing

No automated test project is being added in this slice, consistent with the
phase 1 scope cut. Verification is manual: log in as each seeded user via
the `.http` file / Swagger UI, confirm `GET /product` works without a token,
confirm `POST /product` returns `403` for the `User` token and succeeds for
the `Admin` token, and confirm `POST /auth/login` returns `401` for a wrong
password.

## Future Work (not designed yet)

- Self-service registration.
- Migrating persistence to SQLite (previously noted in the phase 1 spec).
- Per-user data once `Order` exists (e.g. "my orders").
- Automated tests once the broader app stabilizes.
