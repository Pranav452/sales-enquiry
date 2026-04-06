"""
Lightweight PDF extraction microservice using pdfplumber.
Deploy on Railway/Render and call from Vercel.

pip install fastapi uvicorn python-multipart pdfplumber
python -m uvicorn pdf-service:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import pdfplumber
import logging
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    """Extract text and tables from uploaded PDF using pdfplumber."""
    try:
        # Validate file type
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files allowed")

        # Read uploaded file into memory
        contents = await file.read()

        # Extract using pdfplumber — wrap bytes in BytesIO so pdfplumber can seek
        full_text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for i, page in enumerate(pdf.pages):
                full_text += f"\n--- PAGE {i + 1} ---\n"

                # Extract tables (rate sheets have tables)
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            cleaned = [
                                (cell.replace("\n", " ").strip() if cell else "")
                                for cell in row
                            ]
                            full_text += "\t".join(cleaned) + "\n"
                        full_text += "\n"

                # Extract remaining text
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text:
                    full_text += text + "\n"

        full_text = full_text.strip()
        logger.info(f"Extracted {len(full_text)} chars from {file.filename}")

        if not full_text or len(full_text) < 50:
            raise HTTPException(
                status_code=422,
                detail="PDF contains no extractable text",
            )

        return JSONResponse(
            {
                "success": True,
                "text": full_text,
                "filename": file.filename,
                "char_count": len(full_text),
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "pdf-extraction"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
