# Invoice Extractor

Sends an invoice to **OpenAI (GPT-4o)** and/or **Google Document AI Invoice Parser** and saves the extracted data as structured JSON files.

---

## Setup

### 1. Install dependencies

```bash
cd invoice-extractor
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure credentials

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `DOCAI_PROJECT_ID` | Google Cloud Console → project selector |
| `DOCAI_LOCATION` | Region where your processor lives (`us` or `eu`) |
| `DOCAI_PROCESSOR_ID` | Document AI → Processors → your processor → **ID** field |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service account JSON key (or omit and use `gcloud auth application-default login`) |

#### Google Document AI — one-time processor setup

1. Enable the API: `gcloud services enable documentai.googleapis.com`
2. Go to **Document AI → Processors → Create Processor**
3. Choose **Invoice Parser** and pick a region
4. Copy the processor ID into your `.env`

---

## Usage

Place your invoice file anywhere and pass the path as the first argument.

```bash
# Run both extractors (default)
python extract.py invoices/my_invoice.pdf

# OpenAI only
python extract.py invoices/my_invoice.pdf --openai

# Google Document AI only
python extract.py invoices/my_invoice.pdf --google

# Custom output directory
python extract.py invoices/my_invoice.pdf --output-dir results/

# Use a different OpenAI model
python extract.py invoices/my_invoice.pdf --model gpt-4o-mini
```

Output JSON files are written to `output/` (or your `--output-dir`) with names like:

```
my_invoice__openai__20260524_153000.json
my_invoice__google_docai__20260524_153001.json
```

### Supported file types

| Format | OpenAI | Google DocAI |
|---|---|---|
| PDF | ✅ | ✅ |
| PNG | ✅ | ✅ |
| JPG / JPEG | ✅ | ✅ |
| TIFF | ❌ | ✅ |
| GIF | ✅ | ✅ |
| WEBP | ✅ | ✅ |

---

## Changing the default invoice path

Edit the `DEFAULT_INVOICE` constant at the top of `extract.py`:

```python
DEFAULT_INVOICE = "invoices/sample_invoice.pdf"
```

---

## Output format

Both extractors produce JSON with a consistent schema:

```json
{
  "invoice_number": "INV-0042",
  "invoice_date": "2026-05-01",
  "due_date": "2026-05-31",
  "vendor": { "name": "...", "address": "...", "email": "...", "phone": "...", "tax_id": "..." },
  "bill_to": { "name": "...", "address": "...", "email": "..." },
  "line_items": [
    { "description": "...", "quantity": 1, "unit_price": 100.0, "total": 100.0 }
  ],
  "subtotal": 100.0,
  "tax_rate": 0.2,
  "tax_amount": 20.0,
  "discount": 0.0,
  "total_amount": 120.0,
  "currency": "GBP",
  "payment_terms": "Net 30",
  "notes": "..."
}
```

> **Note:** Google Document AI also includes a `_raw_entities` key with every entity the model returned, useful for debugging or accessing fields not in the standard schema.
