# 07 — Implementation Timeline

## Phase 1 — Foundation & Teacher Pipeline (Weeks 1–3)

| Week | Tasks | Deliverable |
| --- | --- | --- |
| 1 | Scaffold Express + TS + Zod · Neon + Prisma · auth · workspace endpoints | Auth + workspace API |
| 2 | Gemini Flash proxy · teacher extraction · Zod validation · BullMQ + Upstash | Teacher extracts fields |
| 3 | Upload UI · review/correct UI · corrections endpoint · Langfuse tracing | 20–30 corrected examples |

## Phase 2 — Fine-Tuning & Evaluation (Weeks 4–6)

| Week | Tasks | Deliverable |
| --- | --- | --- |
| 4 | JSONL export · Kaggle notebook (Unsloth + Qwen 2.5 7B + QLoRA, r=64, 4-bit, 3 epochs) · push adapter to HF Hub | Trained LoRA adapter |
| 5 | Install `doceval` · create 20-document held-out set · compare teacher vs student | Evaluation report |
| 6 | Proceed if student ≥ teacher − 5% · deploy via HF Inference · wire activation endpoint | Student live |

## Phase 3 — Production Hardening (Weeks 7–9)

| Week | Tasks | Deliverable |
| --- | --- | --- |
| 7 | Langfuse on both pipelines · analytics dashboard · drift alert | Observable pipeline |
| 8 | GitHub Actions eval gate · Dockerize · deploy to Render + Vercel | CI gate active |
| 9 | End-to-end test · retraining flow · UI polish | Fully deployed product |

## Phase 4 — Portfolio Polish (Weeks 10–12)

| Week | Tasks | Deliverable |
| --- | --- | --- |
| 10 | README with diagrams · eval results table · demo GIF | Portfolio-ready repo |
| 11 | Blog post: “How I cut document extraction cost by 90%” | Public writing |
| 12 | Buffer for bugs and deployment issues | Project complete |

## Optional FastAPI Side-Wagon (after Week 6)

| Task | Time |
| --- | --- |
| Build `/parse` endpoint | 1 afternoon |
| Deploy and wire Express → FastAPI | 1 afternoon |