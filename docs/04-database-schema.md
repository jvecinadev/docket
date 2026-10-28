# 04 — Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT,
  document_type TEXT,
  field_schema JSONB NOT NULL,
  active_model TEXT DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  filename TEXT,
  storage_url TEXT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  model_version TEXT,
  raw_output JSONB,
  confidence NUMERIC,
  latency_ms INTEGER,
  cost_usd NUMERIC,
  validation_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID REFERENCES extractions(id),
  corrected_fields JSONB NOT NULL,
  is_training_example BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  base_model TEXT DEFAULT 'Qwen/Qwen2.5-7B-Instruct',
  adapter_path TEXT,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_run_id UUID REFERENCES training_runs(id),
  model_version TEXT,
  field_accuracy NUMERIC,
  f1_score NUMERIC,
  test_set_size INTEGER,
  passed_gate BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Design Rules

- `field_schema` in `workspaces` defines the expected JSON shape. Every
  extraction is validated against a Zod schema derived from it.
- `corrections.is_training_example = true` is the **only** source of training
  data. Raw `extractions` are never used for training.
- `evaluations.passed_gate` is what GitHub Actions reads to decide whether a
  deploy is allowed.