# 03 — Architecture

```mermaid
flowchart TB
    subgraph FE["Frontend — Vercel"]
        A["Next.js + Tailwind + Vercel AI SDK"]
    end

    subgraph BE["Backend — Render"]
        B["Express + TypeScript + Zod<br/>Auth · Upload · BullMQ · LLM proxy"]
    end

    subgraph DATA["Data Layer"]
        C["Neon PostgreSQL + pgvector"]
        D["Upstash Redis<br/>BullMQ · Rate limit · Cache"]
    end

    subgraph AI["External AI"]
        E["Gemini 1.5 Flash<br/>Teacher"]
        F["HF Inference API<br/>Student"]
        G["Langfuse<br/>Tracing"]
    end

    subgraph PY["Python Side-Wagon"]
        H["FastAPI /parse<br/>PyMuPDF · pytesseract"]
        I["doceval (CI)"]
        J["Kaggle<br/>QLoRA training"]
    end

    subgraph CI["CI/CD"]
        K["GitHub Actions<br/>Eval gate"]
    end

    A -->|REST + SSE| B
    B --> C
    B --> D
    B --> E
    B --> F
    B --> G
    B --> H
    K --> I
    J -.->|LoRA adapter| F
```

## Request Flow: Document Upload

1. User uploads a PDF in the Next.js UI.
2. Frontend sends the file to `POST /api/workspaces/:id/upload`.
3. Express stores the file and creates a `documents` row with status `uploaded`.
4. Express enqueues a BullMQ job `{ documentId, workspaceId }`.
5. The BullMQ worker:
   - Fetches document text (via FastAPI `/parse` or local parsing).
   - Builds the extraction prompt.
   - Creates a Langfuse trace and generation span.
   - Calls Gemini 1.5 Flash with JSON mode.
   - Validates the response with Zod.
   - Saves an `extractions` row with latency, cost, and validation status.
   - Updates the document status to `extracted` or `failed`.
   - Ends the Langfuse generation span.
6. Frontend polls or receives an SSE event and renders the extraction.

**Total latency per document:** 1–4 seconds, dominated by the Gemini API call,
not the Express backend.