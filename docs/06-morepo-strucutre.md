# 06 — Monorepo Structure

```text
docket/
├── apps/
│   ├── web/                       # Next.js 15 (App Router)
│   ├── api/                       # Express + TypeScript
│   └── python-service/            # FastAPI (optional)
├── packages/
│   ├── db/                        # Prisma schema + client
│   ├── types/                     # Shared Zod schemas
│   ├── ui/                        # Shared components
│   └── ai-eval/                   # doceval wrapper
├── infra/
│   ├── docker-compose.yml
│   └── render.yaml
├── docs/
├── .github/workflows/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Turborepo Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true },
    "eval": { "dependsOn": ["build"], "cache": false }
  }
}
```

## Python Bridge

`apps/python-service/package.json` wraps `uv` commands so Turborepo can run
Python tasks:

```json
{
  "name": "@docket/python-service",
  "scripts": {
    "dev": "uv run uvicorn app.main:app --reload --port 8000",
    "lint": "uv run ruff check .",
    "test": "uv run pytest"
  }
}
```

## Boundary Rules

| Rule | Enforcement |
| --- | --- |
| Apps never import from other apps | ESLint `no-restricted-imports` |
| Packages never import from apps | Same |
| Python never imports from Node | HTTP only; code review |
| Shared types live in `packages/types` | Every app imports `@docket/types` |