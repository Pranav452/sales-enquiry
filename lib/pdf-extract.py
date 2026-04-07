#!/usr/bin/env python3
"""
Raw PDF content extractor — returns text + unmodified table arrays.
Structure analysis (which row is the header, which columns are rates, etc.)
is intentionally left to the AI layer in TypeScript.
"""
import sys
import json
import logging
import pdfplumber

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)


def clean_cell(cell) -> str:
    if cell is None:
        return ""
    return str(cell).replace("\n", " ").replace("\r", " ").strip()


def extract_pdf(pdf_path: str) -> dict:
    full_text = ""
    raw_tables = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            page_text = f"\n--- PAGE {page_num + 1} ---\n"

            page_tables = page.extract_tables()
            if page_tables:
                for table in page_tables:
                    if not table:
                        continue
                    # Return raw rows — no header detection, no interpretation
                    rows = [
                        [clean_cell(c) for c in row]
                        for row in table
                        if any(clean_cell(c) for c in row)  # skip fully empty rows
                    ]
                    if len(rows) >= 2:
                        raw_tables.append({"page": page_num + 1, "rows": rows})
                    # Also add to text for context extraction
                    for row in rows:
                        page_text += "\t".join(row) + "\n"
                    page_text += "\n"

            text = page.extract_text(x_tolerance=3, y_tolerance=3)
            if text:
                page_text += text + "\n"

            full_text += page_text

    full_text = full_text.strip()
    return {
        "success":    True,
        "text":       full_text,
        "header_text": full_text[:3000],
        "tables":     raw_tables,
        "has_tables": len(raw_tables) > 0,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        result = extract_pdf(file_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
