# Docket Coding Standards

Official coding standards for the Docket modular monolith monorepo.

---

## 1. Project Shape

Docket is a modular monolith in a pnpm/Turborepo monorepo.

### Main Packages

| Package | Purpose |
|---|---|
| `apps/web` | Next.js frontend |
| `apps/api` | Express backend |
| `apps/python-service` | Python helpers |
| `packages/db` | Prisma schema + Prisma client |
| `packages/types` | Shared Zod schemas + shared TS types |
| `packages/ui` | Shared UI components |
| `packages/ai-eval` | Eval wrapper |

---

## 2. Source of Truth by Concern

| Concern | Source of Truth |
|---|---|
| Database | `packages/db` |
| Prisma schema | `packages/db` |
| Prisma client singleton | `packages/db` |
| Shared API contracts | `packages/types` |
| Zod schemas | `packages/types` |
| Inferred TypeScript types | `packages/types` |
| Shared enums/constants | `packages/types` |
| Backend business logic | `apps/api` |
| Routes, controllers, services, repositories | `apps/api` |
| Frontend UI | `apps/web` |

---

## 3. Folder Rules

### `packages/db`

```text
packages/db/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── client.ts
│   └── index.ts
└── package.json
```

### `packages/types`

```text
packages/types/
├── src/
│   ├── auth/
│   ├── workspaces/
│   ├── documents/
│   ├── audit/
│   ├── common/
│   └── index.ts
└── package.json
```

### `apps/api`

```text
apps/api/src/
├── config/
├── middleware/
├── utils/
├── routes/
├── modules/
├── app.ts
└── server.ts
```

---

## 4. Backend Architecture

Backend is **module-based**, not monolithic.

Each feature module has:

```text
modules/<feature>/
├── <feature>.routes.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
└── <feature>.schemas.ts
```

### Layer Responsibilities

| Layer | Responsibilities |
|---|---|
| **Routes** | Define endpoints, attach middleware, call controllers. No business logic. |
| **Controllers** | Read `req`, call services, return `res`. No Prisma logic. No heavy business logic. |
| **Services** | Business logic, authorization decisions, orchestration, transactions. |
| **Repositories** | Prisma only. Database access only. No Express. No cookies. No validation. |
| **Schemas** | Zod validation only. Request/response contracts. |

---

## 5. Coding Style

### Function Style

Use **arrow functions** almost everywhere.

**Preferred:**

```ts
export const authService = {
  login: async () => {},
  register: async () => {},
};
```

**Preferred:**

```ts
const hashToken = (token: string) => {};
```

Avoid regular function declarations unless there is a strong reason.

---

## 6. TypeScript Style

- Use **strict TypeScript**.
- Be strict at boundaries:
  - Env vars
  - Request bodies
  - Auth payloads
  - Repository inputs
  - Service DTOs
- Use inference where safe.
- Don't over-type obvious local values.

### Avoid

- `any`
- Unsafe casts
- Untyped request bodies
- Giant unstructured objects

### Good Pattern

```ts
import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
```

---

## 7. Prisma Rules

### General

- Use Prisma for **persistence only**.
- Prisma models are the DB source of truth.
- Repositories contain Prisma calls.

### Prisma Style Rules

- UUID primary keys.
- Timestamps on most models.
- Enums for fixed states.
- Indexes on query paths.
- `select` instead of returning full rows when possible.
- `JSON` only when the data is naturally flexible.

### Never

- Put Prisma in controllers.
- Put Prisma in routes.
- Expose password hashes.
- Store raw auth tokens.

---

## 8. Auth Rules

Auth should be **production-grade**.

### Required Auth Features

- Register
- Login
- Logout
- Current user (`me`)
- DB-backed sessions
- Hashed session tokens
- Password reset tokens
- Email verification tokens

### Auth Storage Rules

- Session tokens are hashed in DB.
- Reset/verification tokens are hashed in DB.
- Raw tokens are only shown once to the user.
- Tokens are never logged.

### Auth Transport

- Use `httpOnly` cookies.
- Do **not** use `localStorage` for auth tokens.

---

## 9. Multi-Tenant Rules

**Workspace** is the tenant boundary.

### Rules

- All tenant data must be scoped by `workspaceId`.
- Every workspace request must verify membership.
- Never trust workspace IDs from the client without authorization checks.

### Workspace-Scoped Data

- Documents
- Extraction runs
- Corrections
- Training runs
- Evaluation runs
- Audit logs

---

## 10. Audit Log Rules

Audit logs are **first-class data**.

### Log Important Actions

- User registered
- User logged in
- Workspace created
- Document uploaded
- Extraction created
- Correction saved
- Training started
- Evaluation completed

### Audit Log Fields

| Field | Description |
|---|---|
| `workspaceId` | Workspace context. |
| `actorUserId` | User who performed the action. |
| `action` | Action name. |
| `entityType` | Entity type. |
| `entityId` | Entity ID. |
| `metadata` | Additional context. |
| `ipAddress` | Request IP. |
| `userAgent` | Request user agent. |
| `requestId` | Request ID for tracing. |
| `createdAt` | Timestamp. |

### Rules

- Append-only.
- Never edit logs.
- Never store secrets in logs.

---

## 11. Error Handling Rules

Use a custom `AppError`.

Application errors should be thrown with a custom error class.

**Example:**

```ts
throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
```

### Error Handler Should Normalize

Must handle:

- Invalid JSON
- Zod validation errors
- `AppError`
- Prisma known errors
- Unknown errors

### Error Response Format

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

---

## 12. Main Router Rule

`app.ts` must stay **thin**.

`app.ts` does only:

- Helmet
- CORS
- Cookie parser
- Body parsers
- Mount main router
- 404 handler
- Error handler

### Main Router File

Use:

```text
apps/api/src/routes/index.ts
```

That file mounts:

- `/auth`
- `/workspaces`
- `/documents`
- `/audit`
- `/health`

---

## 13. How Imports Like `@docket/types` Work

> This is important.

### What `@docket/types` Actually Is

It is a **workspace package name**.

When you write:

```ts
import { registerBodySchema } from "@docket/types";
```

You are importing from the `packages/types` workspace package.

---

### Step 1: Name the Package Correctly

In `packages/types/package.json`:

```json
{
  "name": "@docket/types",
  "private": true,
  "version": "0.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

**Why this matters:**  
That `name` field is what makes the import path work.

---

### Step 2: Export From a Barrel File

In `packages/types/src/index.ts`:

```ts
export * from "./auth/auth.schemas";
export * from "./auth/auth.types";
export * from "./auth/auth.constants";
export * from "./workspaces/workspace.schemas";
export * from "./documents/document.schemas";
export * from "./audit/audit.schemas";
```

**Why this matters:**  
Now other packages can import from one clean path.

---

### Step 3: Make Apps Depend on the Package

In `apps/api/package.json`:

```json
{
  "dependencies": {
    "@docket/types": "workspace:*"
  }
}
```

In `apps/web/package.json`:

```json
{
  "dependencies": {
    "@docket/types": "workspace:*"
  }
}
```

**Why this matters:**  
pnpm links the local package into each app.

---

### Step 4: Build or Transpile the Package

For production-safe imports, `packages/types` should compile to `dist`.

Example build script:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

**Why this matters:**  
At runtime, Node wants JS, not raw TS.

---

### Step 5: Import It Anywhere in the Monorepo

**In `apps/api`:**

```ts
import { registerBodySchema } from "@docket/types";
```

**In `apps/web`:**

```ts
import { registerBodySchema } from "@docket/types";
```

**In controllers/services:**

```ts
import type { RegisterBody } from "@docket/types";
```

---

### Recommended `tsconfig` Paths

This helps TypeScript understand your workspace imports in editor/dev.

**Root `tsconfig.base.json`:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@docket/types": ["packages/types/src/index.ts"],
      "@docket/types/*": ["packages/types/src/*"],
      "@docket/db": ["packages/db/src/index.ts"],
      "@docket/db/*": ["packages/db/src/*"],
      "@docket/ui": ["packages/ui/src/index.ts"],
      "@docket/ui/*": ["packages/ui/src/*"]
    }
  }
}
```

> **Important note:**  
> `paths` helps TypeScript/editor resolution.  
> It does not always replace runtime package resolution.  
> For runtime, the package should still be a real workspace package with proper exports.

---

### Best Import Pattern for Docket

**Preferred:**

```ts
import { loginBodySchema } from "@docket/types";
import { prisma } from "@docket/db";
```

**Avoid:**

```ts
import { loginBodySchema } from "../../../../packages/types/src/auth/auth.schemas";
```

**Why?**

- Cleaner
- Easier to refactor
- Better architecture
- Less brittle

---

### Import Rules Summary

#### Allowed

- `apps/api` → `@docket/types`, `@docket/db`, `@docket/ui`
- `apps/web` → `@docket/types`, `@docket/ui`
- `packages/*` → other packages through public exports only

#### Not Allowed

- Importing directly from another app.
- Cross-importing app internals.
- Importing raw source files with deep relative paths across packages.

---

### Shared Package Rule

`packages/types` is the **contract layer**.

**It should contain:**

- Zod schemas
- Inferred types
- Enums/constants
- Request DTOs
- Response DTOs

**It should not contain:**

- Prisma
- Express
- DB code
- Services
- Repository logic

---

### Example Package Structure for `packages/types`

```text
packages/types/src/
├── auth/
│   ├── auth.schemas.ts
│   ├── auth.types.ts
│   └── auth.constants.ts
├── workspaces/
│   ├── workspace.schemas.ts
│   └── workspace.types.ts
├── documents/
│   ├── document.schemas.ts
│   └── document.types.ts
├── audit/
│   ├── audit.schemas.ts
│   └── audit.types.ts
└── index.ts
```

---

## Short AI Prompt Version

> If you want a shorter version to paste into another AI, use this:

```text
Docket is a modular monolith monorepo. Backend is Express + TypeScript, structured as routes → controllers → services → repositories. apps/api/src/app.ts stays thin and mounts a main router from apps/api/src/routes/index.ts. Prisma schema and singleton live in packages/db (packages/db/prisma/schema.prisma, packages/db/src/client.ts). Shared Zod schemas and inferred TypeScript types live in packages/types. Use arrow functions almost everywhere, strict TypeScript at boundaries, explicit Prisma selects, UUID IDs, enums for fixed states, audit logs, and workspace-based multi-tenancy. Auth uses httpOnly cookies and DB-backed sessions. Import shared code via workspace package names like @docket/types, not deep relative paths.
```