# PDF Extraction Microservice Setup

Deploy this lightweight Python service to **Railway** (free tier, recommended) or **Render**.

## Deploy on Railway (Recommended)

1. **Create Railway account** → https://railway.app
2. **Connect GitHub repo** (or upload files)
3. **Create `requirements.txt`** in project root:
   ```txt
   fastapi==0.104.1
   uvicorn==0.24.0
   python-multipart==0.0.6
   pdfplumber==0.10.3
   ```
4. **Create `Procfile`** (Railway auto-detects):
   ```
   web: python -m uvicorn pdf-service:app --host 0.0.0.0 --port $PORT
   ```
5. **Deploy:**
   - Push to GitHub or upload files to Railway
   - Railway auto-detects Python + requirements.txt
   - Build and deploy automatically
   - You get a public URL like `https://pdf-service-xyz.railway.app`

## Deploy on Render (Alternative)

1. **Create Render account** → https://render.com
2. **Create New Web Service**
   - Connect GitHub repo
   - Runtime: `Python 3.11`
   - Build command: `pip install -r requirements.txt`
   - Start command: `python -m uvicorn pdf-service:app --host 0.0.0.0 --port 8000`
3. **Set Environment Variables:**
   - Add any needed env vars
4. **Deploy** — Render builds and serves the app

## Configure Vercel

Once your service is deployed, set the environment variable in Vercel:

**In Vercel Dashboard:**
- Go to Settings → Environment Variables
- Add: `PDF_SERVICE_URL=https://your-service-url.railway.app` (no trailing slash)
- Redeploy

**Locally:**
Add to `.env.local`:
```
PDF_SERVICE_URL=https://your-service-url.railway.app
```

## How It Works

1. User uploads PDF in Manage Rates
2. Vercel receives file → writes temp file
3. Calls Python service: `POST /extract` with PDF
4. pdfplumber extracts text + tables
5. Service returns JSON with extracted text
6. GPT-4o structures into rates

## Test Locally

```bash
# Terminal 1: Start Python service
python -m uvicorn pdf-service:app --reload

# Terminal 2: Set service URL and start Vercel
export PDF_SERVICE_URL=http://localhost:8000
npm run dev
```

## Cost

- **Railway:** Free tier includes $5 credit/month (more than enough for this service)
- **Render:** Free tier with limitations, or pay-as-you-go

Railway is recommended for reliable free hosting.
