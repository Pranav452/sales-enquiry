<!-- second-brain spoke (auto-added 2026-07-14) -->
## Project context (second brain)

Links Cargo freight-enquiry CRM — sales lead intake, quotations, admin analytics dashboard.
Stack: Next.js 16/React 19/TS, Tailwind 4, Supabase + direct MSSQL (2 DBs: manilal, links), Radix, Zustand, TanStack Query, Recharts, jsPDF/pdf-parse, OpenAI+Gemini, Nodemailer, web-push; separate Python/FastAPI pdf-service.
Run: npm run dev. PDF microservice separately: start.sh (uvicorn pdf-service:app), deployed on Railway/Render — see PDF_SERVICE_SETUP.md.
Watch out: .env.local packed with secrets (Supabase keys, 2 MSSQL sets, OpenAI/Gemini, Gmail app pw, VAPID, CRON_SECRET) — never commit. Stray misnamed sql file + dwdw.md scratch junk in root, safe to ignore.

Cross-project brain: `C:\Users\Manilal\second-brain` — full card `notes/projects/sales-crm.md`, recent context `hot.md`. Read the brain for cross-project/domain knowledge; do NOT read it for general coding questions.
