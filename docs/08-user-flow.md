# 08 — User Flow

```mermaid
flowchart TD
    A[Sign up] --> B[Create workspace: define fields]
    B --> C[Upload 5 samples]
    C --> D[Teacher extracts]
    D --> E[Review & correct]
    E --> F[Upload 50 more]
    F --> G[Review & correct]
    G --> H{50 corrections?}
    H -->|No| G
    H -->|Yes| I[Trigger training ~45 min]
    I --> J[Evaluation runs]
    J --> K{Student ≥ teacher − 5%?}
    K -->|No| L[Review data quality, retrain]
    L --> I
    K -->|Yes| M[Activate student model]
    M --> N[All new uploads use student]
    N --> O[Low-confidence docs flagged]
    O --> P[Correct edge cases]
    P --> Q[Retrain v2]
    Q --> R[Eval gate]
    R --> S{Auto-promote?}
    S -->|Yes| M
    S -->|No| N
```

## Screen Summary

| Phase | Screen | User Does | System Does |
| --- | --- | --- | --- |
| Onboarding | Workspace setup | Selects document type, defines fields, uploads 5 samples | Saves schema, validates samples with teacher |
| Upload | Batch upload | Drags 20–50 files | Queues jobs, respects 15 RPM limit |
| Review | Review queue | Corrects low-confidence fields | Saves gold labels to `corrections` |
| Training | Training dashboard | Waits or navigates away | Runs QLoRA, checkpoints per epoch |
| Evaluation | Model comparison | Reviews accuracy, cost, latency | Runs `doceval` on held-out set |
| Production | Analytics dashboard | Monitors drift | Traces every call in Langfuse |