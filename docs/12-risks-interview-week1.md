# 12 — Risks, Interview Narrative, Week 1 Checklist

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Poor training data quality | Student learns mistakes | Only train on human-corrected examples; 50 high-quality beats 500 noisy |
| Student accuracy below teacher | Cost-saving premise fails | Hold out test set; if gap > 5 points, review data quality first |
| Render 512 MB RAM limit | Cannot serve 7B locally | Use HF Inference API; Render runs only the Express orchestrator |
| Kaggle session limits | Training interrupted | Checkpoint adapter after every epoch |
| Gemini rate limit (15 RPM) | Batch stalls | BullMQ queue + exponential backoff; process sequentially |
| HF cold starts | First request 10–30 s | Warm-up request every few minutes or accept for portfolio scale |
| Zod validation failures | Malformed output breaks pipeline | Catch, mark failed, log raw output to Langfuse |

## Interview Narrative

> “I built Docket — a document field-extraction system for SMEs. I used Gemini
> Flash as a teacher to generate candidate labels from invoices, then built a
> human-in-the-loop review UI where users correct mistakes. Those 80 corrected
> examples became training data for a Qwen 2.5 7B model I fine-tuned with QLoRA
> on a free Kaggle GPU. On a 20-document held-out test set, the student matched
> the teacher’s field-level accuracy at 94% but cost 90% less per prediction and
> ran five times faster. I served it via the Hugging Face Inference API, traced
> every call with Langfuse, and added a GitHub Actions gate that blocks deploys
> if `doceval` accuracy drops below 90%.”

### Skills Proven

- Cost engineering: teacher → student distillation
- Fine-tuning lifecycle: QLoRA, data curation, evaluation
- Human-in-the-loop UX
- Production observability: Langfuse traces and cost dashboards
- CI/CD for AI: eval-gated deploys
- Full-stack ownership: Next.js + Express + PostgreSQL + Python side-wagon

### Follow-Up Questions

| Question | Answer |
| --- | --- |
| Why not GPT-4 for everything? | At 500 docs/day, GPT-4 costs $150–$450/month; the student costs $15–$45 with equal accuracy |
| How do you know the student is good enough? | 20-document held-out test set; student 94% vs teacher 96%; tracked F1 per field |
| What happens when the model fails? | Zod rejects malformed JSON; low-confidence fields are flagged; failures are traced in Langfuse |
| How do you prevent bad deploys? | GitHub Actions runs `doceval` on every push; below 90% blocks the deploy |
| Why Python if the stack is TypeScript? | Python is only for training, evaluation, and PDF parsing; the product stays TypeScript |
| Why Express and not FastAPI for the backend? | The backend is API orchestration; Express is the existing strength and handles it cleanly |

## Week 1 Checklist

### Day 1–2: Scaffolding

- [ ] Create Neon database
- [ ] Run the schema from `04-database-schema.md`
- [ ] `pnpm init`, `pnpm-workspace.yaml`, `turbo.json`
- [ ] Create `apps/api` (Express + TS)
- [ ] Create `apps/web` (Next.js App Router)
- [ ] Create `packages/db` (Prisma → Neon)
- [ ] Create `packages/types` (Zod schemas)
- [ ] Add `infra/docker-compose.yml` for local Postgres + Redis

### Day 3–4: Auth & Workspace

- [ ] `POST /api/auth/register` (bcrypt + JWT)
- [ ] `POST /api/auth/login` (httpOnly cookie)
- [ ] `POST /api/auth/logout`
- [ ] Auth middleware
- [ ] `POST /api/workspaces`
- [ ] `GET /api/workspaces`
- [ ] Next.js auth pages
- [ ] Workspace setup page
- [ ] Verify: signup → workspace → database row

### Day 5: Gemini Integration

- [ ] Get Gemini API key from Google AI Studio
- [ ] Add `GEMINI_API_KEY` to `.env` and Render
- [ ] Create Gemini client with retry/backoff
- [ ] `POST /api/workspaces/:id/upload`
- [ ] Teacher extraction service:
  - [ ] Build prompt
  - [ ] Call Gemini Flash with JSON mode
  - [ ] Validate with Zod
  - [ ] Save to `extractions`
- [ ] Verify: upload → structured JSON in database

### Day 6–7: Queue & First UI

- [ ] BullMQ + Upstash Redis
- [ ] Worker: fetch text → teacher extract → update status
- [ ] Next.js upload UI
- [ ] Extraction preview page
- [ ] Langfuse tracing on teacher calls
- [ ] Verify: upload → queue → extract → preview

## Week 1 Milestone

Working teacher pipeline: upload → extract → preview → traced in Langfuse.