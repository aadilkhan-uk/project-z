"""
OpenAI extractor — uploads the invoice to the OpenAI Files API and uses
GPT-4o to pull out structured invoice data.
"""

import base64
import json
import mimetypes
import os
from pathlib import Path

from openai import OpenAI

EXTRACTION_PROMPT = """
You are an invoice data extraction assistant.

Extract ALL of the following fields from the invoice (use null if a field is not present):

{
  "invoice_number": "<string>",
  "invoice_date": "<YYYY-MM-DD>",
  "due_date": "<YYYY-MM-DD>",
  "vendor": {
    "name": "<string>",
    "address": "<string>",
    "email": "<string>",
    "phone": "<string>",
    "tax_id": "<string>"
  },
  "bill_to": {
    "name": "<string>",
    "address": "<string>",
    "email": "<string>"
  },
  "line_items": [
    {
      "description": "<string>",
      "quantity": <number>,
      "unit_price": <number>,
      "total": <number>
    }
  ],
  "subtotal": <number>,
  "tax_rate": <number>,
  "tax_amount": <number>,
  "discount": <number>,
  "total_amount": <number>,
  "currency": "<ISO 4217 code>",
  "payment_terms": "<string>",
  "notes": "<string>"
}

Return ONLY the JSON object — no extra fields or commentary.
""".strip()


def extract(invoice_path: Path, model: str = "gpt-4o") -> dict:
    """
    Send *invoice_path* to OpenAI and return extracted data as a dict.

    Supports PDF, PNG, JPG, JPEG, GIF, and WEBP inputs.
    PDFs are uploaded via the Files API; images are base64-encoded inline.
    """
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    suffix = invoice_path.suffix.lower()
    mime_type = mimetypes.guess_type(str(invoice_path))[0] or "application/octet-stream"

    if suffix == ".pdf":
        content = _build_pdf_content(client, invoice_path)
    elif suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        content = _build_image_content(invoice_path, mime_type)
    else:
        raise ValueError(f"Unsupported file type: {suffix}. Use PDF or an image format.")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": content,
            }
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_pdf_content(client: OpenAI, path: Path) -> list:
    """Upload the PDF to the Files API and reference it as a file_id."""
    with open(path, "rb") as f:
        uploaded = client.files.create(file=f, purpose="assistants")

    return [
        {"type": "text", "text": EXTRACTION_PROMPT},
        {
            "type": "file",
            "file": {"file_id": uploaded.id},
        },
    ]


def _build_image_content(path: Path, mime_type: str) -> list:
    """Encode the image as a base64 data URL."""
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    return [
        {"type": "text", "text": EXTRACTION_PROMPT},
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{b64}", "detail": "high"},
        },
    ]
