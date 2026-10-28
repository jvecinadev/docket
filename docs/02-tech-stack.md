# 02 — Tech Stack

## Core Application

| Layer | Tool | Free-Tier Reality |
| --- | --- | --- |
| Frontend | Next.js (App Router) + Tailwind + Vercel AI SDK | Vercel Hobby: free forever |
| Backend | Node.js + Express + TypeScript + Zod | Render Free: 512 MB RAM, 0.1 CPU, sleeps after 15 min |
| Database | Neon PostgreSQL + `pgvector` | 1 GB storage per project, 100 CU-hours/month |
| Queue & Cache | BullMQ + Upstash Redis | 500K commands/month, 250 MB data |
| Auth | JWT + httpOnly cookies | — |

## AI Pipeline

| Layer | Tool | Free-Tier Reality |
| --- | --- | --- |
| Teacher model | Gemini 1.5 Flash (Google AI Studio) | 15 RPM, 1M tokens/day, no card |
| Fine-tuning GPU | Kaggle Notebooks (T4 x2) | 30 GPU-hours/week |
| Training method | QLoRA via Unsloth | 7B model QLoRA minimum ≈ 5 GB VRAM |
| Base model | Qwen 2.5 7B Instruct | Free on Hugging Face |
| Student serving | Hugging Face Inference API | ~1,000 requests/month, ~30 req/min |
| Evaluation | `doceval` (Python CLI) | Open source |

## Python Side-Wagon

| Layer | Tool | Purpose |
| --- | --- | --- |
| Document parsing | FastAPI + PyMuPDF + pytesseract | Extract text and tables from PDFs |
| Evaluation wrapper | Python script | Call HF endpoint, feed `doceval` |
| Fine-tuning | Kaggle notebook | Unsloth + QLoRA training |

## Operations

| Layer | Tool | Free-Tier Reality |
| --- | --- | --- |
| Observability | Langfuse (Cloud Hobby or self-hosted) | 50K units/month free |
| CI/CD | GitHub Actions | Free for public repos |
| Deployment | Vercel + Render | Free tiers |
| File storage | Cloudflare R2 or local | 10 GB free |

## Monorepo Tooling

| Layer | Tool |
| --- | --- |
| Node workspaces | pnpm |
| Task runner | Turborepo |
| Python packaging | `uv` |

## Why These Choices

- **Express over FastAPI for the main API:** the backend is an orchestrator
  (auth, uploads, BullMQ, external AI calls), not a model server. Express is the
  existing strength and handles this workload cleanly.
- **Neon over Supabase:** 1 GB free storage with `pgvector`, serverless
  auto-sleep, and no inactivity timeout that drops the database.
- **HF Inference over Render for student serving:** Render’s 512 MB RAM cannot
  host a 7B model. HF Inference removes that infrastructure limit.
- **Kaggle over Colab:** 30 GPU-hours/week versus Colab’s aggressive idle
  disconnects and lower practical quota.