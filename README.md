# Docket

> Extract structured data from documents at ~90% lower inference cost.

Docket is a document field-extraction system. A large teacher model generates
candidate labels; a human corrects them; a small student model is fine-tuned on
those corrections and serves all production traffic.

**Scoping note:** `docket` is heavily used in legal-tech and Python task queues.
This project uses the **product name Docket** with a scoped npm package and a
dedicated repo path:

- npm: `@yourname/docket`
- repo: `github.com/yourname/docket`
- domain: `getdocket.dev` / `trydocket.app`

## Documentation

| # | File | Contents |
| --- | --- | --- |
| 01 | [Overview](docs/01-overview.md) | Project objective, value, target user |
| 02 | [Tech Stack](docs/02-tech-stack.md) | Every tool, with free-tier limits |
| 03 | [Architecture](docs/03-architecture.md) | System diagram and data flow |
| 04 | [Database Schema](docs/04-database-schema.md) | SQL tables and relationships |
| 05 | [API Endpoints](docs/05-api-endpoints.md) | REST contract |
| 06 | [Monorepo Structure](docs/06-monorepo-structure.md) | pnpm + Turborepo + uv layout |
| 07 | [Implementation Timeline](docs/07-implementation-timeline.md) | 12-week phase plan |
| 08 | [User Flow](docs/08-user-flow.md) | Screen-by-screen experience |
| 09 | [Teacher & Student Models](docs/09-teacher-student-models.md) | Distillation and QLoRA |
| 10 | [Observability](docs/10-observability.md) | Langfuse tracing |
| 11 | [Python Side-Wagon](docs/11-python-side-wagon.md) | FastAPI, doceval, Kaggle |
| 12 | [Risks, Interview, Week 1](docs/12-risks-interview-week1.md) | Mitigations, narrative, checklist |
