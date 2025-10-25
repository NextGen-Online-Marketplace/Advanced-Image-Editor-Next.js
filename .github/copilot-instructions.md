## Copilot guide for this repo (keep it short and specific)

What this is
- Next.js 13 App Router app for property inspections: image editing + AI defect analysis + PDF/HTML report generation.
- Tech: TypeScript, MongoDB, Cloudflare R2 (S3), OpenAI Assistants, Upstash QStash, Puppeteer-core + @sparticuz/chromium-min, Zustand, Tailwind.

How to run
- Node 22.x. Install: npm install. Dev: npm run dev. Build: npm run build. Lint: npm run lint.
- Puppeteer routes require Node runtime. For serverless, set CHROMIUM_PACK_URL. Local Chrome can be set via PUPPETEER_EXECUTABLE_PATH.

Architecture (where things live)
- UI: components/ (e.g., ImageEditor.tsx, InformationSections.tsx). App routes: src/app/**/route.ts. Domain logic: lib/*.ts. Types/models: types/*, models/*.
- MongoDB: lib/mongodb.ts with global connection; DB name is agi_inspections_db. Helpers in lib/inspection.ts, lib/defect.ts store ObjectId fields.
- R2 storage: lib/r2.ts wraps S3Client. Public URLs base: CLOUDFLARE_PUBLIC_URL. Keys: uploads/*, inspections/{inspectionId}/*, reports/inspection-{id}/*.

Media rules (important)
- Always display remote media via the proxy: /api/proxy-image?url=... (has R2 SDK fallback, CORS, TLS fixes). Example: const src = url?.startsWith('data:') ? url : `/api/proxy-image?url=${encodeURIComponent(url)}`.
- For uploads, prefer presigned flow via GET /api/r2api?action=presigned&fileName=...&contentType=... then PUT directly to R2; send only URLs to server.

AI analysis (async by design)
- POST /api/llm/analyze-image accepts JSON or multipart; uploads media to R2; enqueues Upstash QStash → calls /api/process-analysis.
- /api/process-analysis is wrapped with verifySignatureAppRouter; runs OpenAI Assistants; saves a defect via lib/defect.createDefect. Keep that wrapper intact.

PDF/HTML reports
- POST /api/reports/generate builds HTML with lib/pdfTemplate.generateInspectionReportHTML, inlines R2 images (maybeInline), renders with puppeteer-core, uploads to R2 via lib/r2.uploadReportToR2, and returns a downloadable PDF. The saved link is proxied through /api/reports/file?key=...
- POST /api/reports/upload-html does HTML-only: rewrites <img>/<source>/background-image to data URIs or copies to reports/* in R2, then saves and proxies via /api/reports/file.

Image editor patterns (avoid re-renders)
- src/app/image-editor/page.tsx dispatches DOM CustomEvents (undoAction, redoAction, rotateImage, applyCrop, setArrowColor) to the large components/ImageEditor.tsx.
- In ImageEditor.tsx, listen in useEffect and push complete actions into actionHistory for undo/redo. Use renderMetricsRef.current.{offsetX,offsetY,drawWidth,drawHeight} for coordinate transforms.

Information sections (localStorage contract)
- components/InformationSections.tsx persists per-inspection UI state:
  - inspection_checklists_${inspectionId}
  - inspection_hidden_checklists_${inspectionId}
  - pendingAnnotation (set by image editor flow)
  - returnToSection (used to reopen correct modal/section)

Conventions and gotchas
- Routes using Puppeteer or AWS SDK should export: export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; optionally export const maxDuration.
- next.config.mjs: puppeteer-core and @sparticuz/chromium* are externalized; exifr is externalized on server; chunkLoadTimeout increased for client.
- When you have an R2 URL and need the key, use extractR2KeyFromUrl or resolveR2KeyFromUrl from lib/r2.ts. Use getR2ObjectAsDataURI to inline into PDFs/HTML.
- Defect costs: lib/pdfTemplate multiplies a base_cost by the number of photos (1 + additional_images.length). If you add photos, also maintain base_cost.

Environment (minimal set to be productive)
- MONGODB_URI, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_PUBLIC_URL, OPENAI_API_KEY, OPENAI_ASSISTANT_ID, QSTASH_TOKEN, NEXT_PUBLIC_BASE_URL.

Quick examples from this repo
- Proxy an image in UI: <img src={`/api/proxy-image?url=${encodeURIComponent(publicUrl)}`} />
- Generate a report: POST /api/reports/generate with { defects: DefectItem[], meta: { title, headerImageUrl, informationBlocks, reportType } }.
- Add an annotation tool: add toolbar button dispatch in image-editor/page.tsx → add event listener + action in ImageEditor.tsx.

When in doubt
- Look at: lib/r2.ts (R2 helpers), lib/pdfTemplate.ts (report HTML), src/app/api/proxy-image/route.ts (robust proxy), src/app/api/llm/analyze-image/route.ts and src/app/api/process-analysis/route.ts (AI flow), src/app/api/reports/* (report generation/storage).
