# 01 — Project Overview

## Objective

Build a document field-extraction system that:

1. Uses a large teacher model to generate candidate labels from documents.
2. Collects human corrections into a gold training set.
3. Fine-tunes a small student model with QLoRA on a free GPU.
4. Serves the student model at roughly 90% lower inference cost than the teacher.
5. Measures retrieval and extraction quality with field-level accuracy.
6. Blocks deploys when evaluation scores regress.

## Real-World Value

Small and medium enterprises processing 50–500 invoices or receipts per month
pay **$150–$450/month** when calling a frontier model for every document.
A fine-tuned 7B student model running on a free inference tier costs
**$15–$45/month** for the same workload with equal or better accuracy on the
narrow task.

The value is not “AI.” The value is **cost engineering**: a small, specialized
model replaces a large, general one for one well-defined job.

## Target User

- Small accounting and bookkeeping firms
- E-commerce sellers reconciling supplier invoices
- Freelancers and agencies processing receipts

## Non-Goals

- General-purpose chatbot
- Model research or pre-training
- Fine-tuning on raw teacher output (only human-corrected data is used)
- Real-time streaming inference from the student (batch-first is acceptable)

## Success Criteria

| Criterion | Target |
| --- | --- |
| Student field-level accuracy | ≥ 90% on a 20-document held-out test set |
| Student vs teacher gap | ≤ 5 percentage points |
| Cost reduction | ≥ 80% per 1,000 documents |
| Evaluation gate | CI blocks deploy if accuracy drops below 90% |
| Observability | Every AI call traced in Langfuse |
| Deployment | Frontend on Vercel, backend on Render, database on Neon |