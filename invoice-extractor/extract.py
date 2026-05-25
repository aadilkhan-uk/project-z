#!/usr/bin/env python3
"""
Invoice Extractor
=================
Sends an invoice file to OpenAI and/or Google Document AI and writes the
extracted structured data to JSON output files.

Quick start
-----------
  python extract.py invoice.pdf              # run both extractors
  python extract.py invoice.pdf --openai     # OpenAI only
  python extract.py invoice.pdf --google     # Google Document AI only
  python extract.py invoice.pdf --output-dir results/

See README.md for full setup instructions.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Load .env from this directory (or a parent) before anything else
load_dotenv(Path(__file__).parent / ".env")


# ---------------------------------------------------------------------------
# Configuration — edit these defaults or pass flags / set env vars instead
# ---------------------------------------------------------------------------

# Path to the invoice you want to process (can also be passed as a CLI arg)
DEFAULT_INVOICE = "invoices/sample_invoice.pdf"

# OpenAI model used for extraction
OPENAI_MODEL = "gpt-4o"

# Google Document AI region ("us" or "eu")
DOCAI_LOCATION = os.environ.get("DOCAI_LOCATION", "us")

# ---------------------------------------------------------------------------


def run_openai(invoice_path: Path, output_dir: Path, model: str) -> Path:
    from extractors import openai_extractor

    print(f"[OpenAI] Sending {invoice_path.name} to {model} …")
    data = openai_extractor.extract(invoice_path, model=model)

    out_file = _output_path(output_dir, invoice_path, "openai")
    _write_json(out_file, data)
    print(f"[OpenAI] Saved → {out_file}")
    return out_file


def run_google(invoice_path: Path, output_dir: Path) -> Path:
    from extractors import google_docai_extractor

    print(f"[Google DocAI] Sending {invoice_path.name} …")
    data = google_docai_extractor.extract(invoice_path)

    out_file = _output_path(output_dir, invoice_path, "google_docai")
    _write_json(out_file, data)
    print(f"[Google DocAI] Saved → {out_file}")
    return out_file


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _output_path(output_dir: Path, invoice_path: Path, extractor: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = invoice_path.stem
    return output_dir / f"{stem}__{extractor}__{timestamp}.json"


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract structured data from an invoice using OpenAI and/or Google Document AI.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "invoice",
        nargs="?",
        default=DEFAULT_INVOICE,
        help=f"Path to the invoice file (default: {DEFAULT_INVOICE})",
    )
    parser.add_argument(
        "--openai",
        action="store_true",
        help="Run only the OpenAI extractor",
    )
    parser.add_argument(
        "--google",
        action="store_true",
        help="Run only the Google Document AI extractor",
    )
    parser.add_argument(
        "--model",
        default=OPENAI_MODEL,
        help=f"OpenAI model to use (default: {OPENAI_MODEL})",
    )
    parser.add_argument(
        "--output-dir",
        default="output",
        metavar="DIR",
        help="Directory to write output JSON files (default: output/)",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    invoice_path = Path(args.invoice)
    if not invoice_path.exists():
        print(f"Error: invoice file not found: {invoice_path}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output_dir)

    # If neither flag is given, run both
    run_both = not args.openai and not args.google

    errors: list[str] = []

    if args.openai or run_both:
        try:
            run_openai(invoice_path, output_dir, model=args.model)
        except Exception as exc:
            errors.append(f"[OpenAI] {exc}")
            print(f"[OpenAI] ERROR: {exc}", file=sys.stderr)

    if args.google or run_both:
        try:
            run_google(invoice_path, output_dir)
        except Exception as exc:
            errors.append(f"[Google DocAI] {exc}")
            print(f"[Google DocAI] ERROR: {exc}", file=sys.stderr)

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
