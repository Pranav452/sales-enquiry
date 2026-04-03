#!/usr/bin/env python3
"""
Extract text and tables from rate sheet PDFs using pdfplumber.
Called by Node.js via subprocess.
"""
import sys
import json
import logging
import pdfplumber

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text and tables from a digital PDF using pdfplumber."""
    full_text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                full_text += f"\n--- PAGE {i + 1} ---\n"

                # Extract tables first (rate sheets are usually tables)
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            # Clean cell content
                            cleaned = [
                                (cell.replace("\n", " ").strip() if cell else "")
                                for cell in row
                            ]
                            full_text += "\t".join(cleaned) + "\n"
                        full_text += "\n"

                # Then extract remaining text
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text:
                    full_text += text + "\n"

        logger.info(f"Extracted {len(full_text)} chars from {file_path}")
        return full_text.strip()
    except Exception as e:
        logger.error(f"Error extracting PDF: {str(e)}")
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        text = extract_text_from_pdf(file_path)
        print(json.dumps({"success": True, "text": text}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
