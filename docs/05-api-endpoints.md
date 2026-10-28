# 05 — API Endpoints

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create user, return JWT | No |
| POST | `/api/auth/login` | Login, set httpOnly cookie | No |
| POST | `/api/auth/logout` | Clear cookie | Yes |
| POST | `/api/workspaces` | Create workspace + field schema | Yes |
| GET | `/api/workspaces` | List user workspaces | Yes |
| POST | `/api/workspaces/:id/upload` | Upload batch → BullMQ jobs | Yes |
| GET | `/api/workspaces/:id/documents` | List documents + status | Yes |
| GET | `/api/documents/:id` | Get document + latest extraction | Yes |
| PATCH | `/api/extractions/:id/correct` | Save human correction | Yes |
| GET | `/api/workspaces/:id/review-queue` | Low-confidence documents | Yes |
| POST | `/api/workspaces/:id/train` | Trigger fine-tuning (≥ 50 corrections) | Yes |
| GET | `/api/training-runs/:id` | Poll training status | Yes |
| GET | `/api/workspaces/:id/analytics` | Dashboard data | Yes |
| POST | `/api/workspaces/:id/model/activate` | Switch teacher → student | Yes |

## Validation Contract

Every AI response is parsed through a Zod schema that mirrors
`workspaces.field_schema`. A failed parse marks the document `failed` and logs
the raw output to Langfuse. No malformed JSON reaches the database.