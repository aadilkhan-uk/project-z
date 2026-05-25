"""
Google Document AI extractor — sends the invoice to a Document AI
Invoice Parser processor and returns structured data as a plain dict.

Prerequisites
-------------
1. Enable the Document AI API in your Google Cloud project.
2. Create an Invoice Parser processor in Document AI.
3. Set the three environment variables listed below (or pass them as
   keyword arguments to `extract()`).
4. Authenticate via:
     export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   OR use Application Default Credentials (gcloud auth application-default login).
"""

import mimetypes
import os
from pathlib import Path

from google.api_core.client_options import ClientOptions
from google.cloud import documentai


def extract(
    invoice_path: Path,
    *,
    project_id: str | None = None,
    location: str | None = None,
    processor_id: str | None = None,
) -> dict:
    """
    Send *invoice_path* to a Document AI Invoice Parser processor.

    Parameters
    ----------
    invoice_path   : Path to the invoice file (PDF or image).
    project_id     : GCP project ID  (falls back to env var DOCAI_PROJECT_ID).
    location       : Processor region, e.g. "us" or "eu"
                     (falls back to env var DOCAI_LOCATION, default "us").
    processor_id   : Document AI processor ID
                     (falls back to env var DOCAI_PROCESSOR_ID).

    Returns a structured dict built from the Document AI response.
    """
    project_id   = project_id   or os.environ["DOCAI_PROJECT_ID"]
    location     = location     or os.environ.get("DOCAI_LOCATION", "us")
    processor_id = processor_id or os.environ["DOCAI_PROCESSOR_ID"]

    mime_type = _get_mime_type(invoice_path)

    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    processor_name = client.processor_path(project_id, location, processor_id)

    with open(invoice_path, "rb") as f:
        raw_document = documentai.RawDocument(content=f.read(), mime_type=mime_type)

    request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)
    result = client.process_document(request=request)

    return _parse_document(result.document)


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _get_mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    mapping = {
        ".pdf":  "application/pdf",
        ".png":  "image/png",
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".tiff": "image/tiff",
        ".gif":  "image/gif",
        ".webp": "image/webp",
        ".bmp":  "image/bmp",
    }
    if suffix in mapping:
        return mapping[suffix]
    guessed = mimetypes.guess_type(str(path))[0]
    if guessed:
        return guessed
    raise ValueError(f"Cannot determine MIME type for: {path}")


def _get_text(doc: documentai.Document, text_anchor) -> str:
    """Reconstruct the text for a field from the document's full text."""
    if not text_anchor or not text_anchor.text_segments:
        return ""
    result = ""
    for segment in text_anchor.text_segments:
        start = int(segment.start_index) if segment.start_index else 0
        end   = int(segment.end_index)
        result += doc.text[start:end]
    return result.strip()


def _entity_value(doc: documentai.Document, entity: documentai.Document.Entity) -> str:
    """Return the normalised value if available, otherwise raw mention text."""
    nv = entity.normalized_value
    if nv and nv.text:
        return nv.text
    return _get_text(doc, entity.text_anchor)


def _parse_document(doc: documentai.Document) -> dict:
    """
    Map Document AI Invoice Parser entities to a human-readable dict.

    The Invoice Parser returns well-known entity types documented at:
    https://cloud.google.com/document-ai/docs/processors-list#processor_invoice-processor
    """
    # Collect scalar entities first
    scalars: dict[str, str] = {}
    line_items_raw: list[dict] = []

    for entity in doc.entities:
        etype = entity.type_

        if etype == "line_item":
            item: dict[str, str] = {}
            for prop in entity.properties:
                item[prop.type_] = _entity_value(doc, prop)
            line_items_raw.append(item)
        else:
            scalars[etype] = _entity_value(doc, entity)

    line_items = [
        {
            "description": item.get("line_item/description", ""),
            "quantity":    _try_float(item.get("line_item/quantity")),
            "unit_price":  _try_float(item.get("line_item/unit_price")),
            "total":       _try_float(item.get("line_item/amount")),
        }
        for item in line_items_raw
    ]

    return {
        "invoice_number":  scalars.get("invoice_id"),
        "invoice_date":    scalars.get("invoice_date"),
        "due_date":        scalars.get("due_date"),
        "purchase_order":  scalars.get("purchase_order"),
        "vendor": {
            "name":    scalars.get("supplier_name"),
            "address": scalars.get("supplier_address"),
            "email":   scalars.get("supplier_email"),
            "phone":   scalars.get("supplier_phone"),
            "tax_id":  scalars.get("supplier_tax_id"),
            "website": scalars.get("supplier_website"),
            "iban":    scalars.get("supplier_iban"),
        },
        "bill_to": {
            "name":    scalars.get("receiver_name"),
            "address": scalars.get("receiver_address"),
            "email":   scalars.get("receiver_email"),
            "tax_id":  scalars.get("receiver_tax_id"),
        },
        "line_items":   line_items,
        "subtotal":     _try_float(scalars.get("net_amount")),
        "tax_amount":   _try_float(scalars.get("total_tax_amount")),
        "total_amount": _try_float(scalars.get("total_amount")),
        "currency":     scalars.get("currency"),
        "payment_terms": scalars.get("payment_terms"),
        # Raw entities for debugging / fields not mapped above
        "_raw_entities": scalars,
    }


def _try_float(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        # Strip currency symbols and commas
        cleaned = value.replace(",", "").strip().lstrip("$€£¥₹")
        return float(cleaned)
    except (ValueError, AttributeError):
        return value  # return as-is if unparseable
