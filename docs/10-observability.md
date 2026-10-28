# 10 — Observability

## What Langfuse Does

Open-source observability for LLM applications. It records every AI call —
input, output, latency, token counts, cost, and errors — and exposes a dashboard
for filtering and debugging.

Without tracing, a failed extraction is opaque. With Langfuse, you see the exact
prompt, response, latency, and validation result for every document.

## Example Trace

```text
Trace: extraction (documentId: "doc_47")
├─ Generation: teacher-extract
│  ├─ Model: gemini-1.5-flash
│  ├─ Input: "Extract vendor, date, total, tax from: [...]"
│  ├─ Output: '{"vendor":"ABC Corp","date":"2024-01-15",...}'
│  ├─ Latency: 1,847 ms
│  ├─ Tokens: 1,200 in / 85 out
│  ├─ Cost: $0.0023
│  └─ Status: success
└─ Validation (Zod)
   ├─ Result: passed
   └─ Confidence: high
```

## Integration

```typescript
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

async function extractWithTeacher(documentText: string, documentId: string) {
  const trace = langfuse.trace({ name: "extraction", metadata: { documentId } });
  const generation = trace.generation({
    name: "teacher-extract",
    model: "gemini-1.5-flash",
    input: prompt,
  });

  const start = Date.now();
  const response = await callGemini(prompt);
  generation.end({
    output: response.text,
    usage: { input: response.inputTokens, output: response.outputTokens },
    metadata: { latency_ms: Date.now() - start },
  });

  return response;
}
```

## When to Use It

| Phase | Use |
| --- | --- |
| Teacher | Trace every call; build a failure taxonomy |
| Training | Export worst teacher outputs; prioritize for correction |
| Evaluation | Compare teacher and student traces side by side |
| Production | Monitor student latency, cost, and validation failure rate |

Tracing must be non-blocking. A Langfuse outage must not break extraction.