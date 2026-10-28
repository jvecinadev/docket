# 11 — Python Side-Wagon

Python is used in three bounded places. The product stays TypeScript.

| Component | Why Python | Lines |
| --- | --- | --- |
| Fine-tuning notebook | Unsloth, PEFT, bitsandbytes are Python-only | ~50–80 |
| `doceval` wrapper | The CLI is Python | ~40–60 |
| FastAPI parsing service | PyMuPDF, pytesseract are stronger than Node equivalents | ~100 |

**Total Python: ~200–250 lines.**

## FastAPI Example

```python
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import fitz

app = FastAPI()

class ParseResult(BaseModel):
    text: str
    page_count: int
    ocr_used: bool

@app.post("/parse", response_model=ParseResult)
async def parse_document(file: UploadFile = File(...)):
    content = await file.read()
    doc = fitz.open(stream=content, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    return ParseResult(text=text, page_count=len(doc), ocr_used=False)
```

## Rules

| Rule | Why |
| --- | --- |
| Never move the main API to Python | Express stays the orchestrator |
| Keep Python services small | One job per service |
| Do not learn Python “in general” | Only what the task requires |
| Use AI tools for boilerplate | Read and understand what is generated |
| List honestly on the resume | `Python (working knowledge — FastAPI, fine-tuning, evaluation)` |

## Where Python Is Not Used

| Component | Language |
| --- | --- |
| Frontend | TypeScript |
| Main backend | TypeScript |
| Database queries | TypeScript (Prisma) |
| Queue workers | TypeScript (BullMQ) |
| Auth | TypeScript |
| CI/CD pipeline | YAML |