# Advanced Image Editor / Inspection Reporting Platform – Comprehensive Guide

This document gives you a complete, practical understanding of the project: what it does, how it’s built, how data flows end‑to‑end, how to run and deploy it, and where to extend it safely. Reading this alone should let an engineer or a product owner grasp functionality, architecture, and operational concerns.

## 1) What this app is

A Next.js (App Router) application for property inspection workflows that lets inspectors:

- Capture, annotate, and upload images and 360° photos for inspection items
- Build Information Blocks with checklist-driven Status, Limitations, and Information sections
- Generate shareable HTML reports and downloadable, branded PDF reports
- Persist media in Cloudflare R2 and inspection data in MongoDB
- Use AI (OpenAI Assistants + Vision) to analyze images and propose defect narratives with realistic cost estimates (tunable via instructions)

The UI is a modern React + TypeScript SPA, with inline styles/Tailwind styles and some custom CSS for report rendering.

## 2) High-level features

- Image editor: drawing, arrows, crop, undo/redo; uploads to R2 via signed endpoints
- 360° photo support flagging and hints
- Information Sections with templates (Status, Limitations/Information), reordering, show/hide per inspection
- “Default to checked?” template option, synced bi-directionally with selection
- Collapsible selected rows for Status and Limitations for faster navigation
- Report generation
  - HTML export: assets rewritten/inlined, uploaded to R2, proxied through app
  - PDF export: Puppeteer renders template; file uploaded to R2; API returns a small JSON with a proxied download URL (no large file in API response)
- AI-assisted defect analysis via OpenAI Assistants API (vision on image_url) to extract description, materials, labor, and estimated cost

## 3) Repository layout (key paths)

- `src/app` – App Router pages and API routes
  - `app/inspection_report/[id]/page.tsx` – Main report builder UI and export actions
  - `app/image-editor/page.tsx` – Standalone image editor page
  - `app/user-report/page.tsx` – User-facing aggregated cost view
  - `app/api/*` – Serverless endpoints (Mongo, R2, LLM, reports)
- `components/*` – UI components (InformationSections, ImageEditor, grids, modals, etc.)
- `lib/*` – Platform services: MongoDB, R2 helpers, PDF template assembly, stores
- `models/*` – Mongoose schema models for sections and information blocks
- `public/report-template/*` – Static report assets (HTML/CSS template source)
- `types/*` – Type definitions (Chromium, Cloudflare, LLM types, etc.)
- `wrangler.toml` – R2 (Cloudflare) config hints for local/dev

## 4) Architecture at a glance

```
[Browser/Next.js client]
  |  (React UI: image editor, info sections, report screens)
  v
[App Router API routes]
  - /api/inspections/*       (read/write inspection metadata)
  - /api/information-sections/* (section templates & checklists)
  - /api/process-analysis     (OpenAI Assistants Vision for defect pricing)
  - /api/reports/generate     (HTML -> PDF via Puppeteer; uploads to R2; returns JSON URL)
  - /api/reports/upload-html  (post-process HTML; inline or copy assets; upload; return URL)
  - /api/reports/file         (proxy R2 objects by key)
  - /api/proxy-image          (safe proxy for remote images)
  |
  v
[Cloudflare R2] <— binary assets (images, html, pdf) stored as objects
  |
  v
[MongoDB Atlas] <— inspection documents, sections, checklists, report URLs
```

Primary principles:

- Large files never stream back from API responses; instead, APIs return proxied URLs (R2 → app) to avoid high origin transfer costs.
- Image links used in reports are either inlined as data URIs or rewritten to stable, proxied URLs so exported HTML/PDF renders reliably.

## 5) Data model and templates

Key models (see `models/`):

- `Section.ts` – A report “section” containing ordered checklists
- `SectionChecklist.ts` – Items with text, type (`status` | `information`), `tab` (`information` | `limitations`), `answer_choices`, `default_checked`, and `order_index`
- `InspectionInformationBlock.ts` – A block instance on an inspection with selected checklist IDs, selected answers, custom text, and images

Important behaviors:

- “Default to checked?”
  - If enabled in a template item, new inspections can start with it selected by default
  - Toggled in the main modal and the per-item edit modal; kept in sync with the item’s selected state (can’t be default-true while unselected)
- Collapsible items
  - Status and Limitations items collapse by default when selected; clicking title expands, header ✕ collapses

## 6) Media storage and proxying

Library: `lib/r2.ts` exposes helpers to upload/copy/resolve keys and proxy URLs.

- Images and report artifacts are stored under logical prefixes, e.g. `inspections/<id>/...`, `reports/inspection-<id>/...`
- Public access is via the app’s proxy: `/api/reports/file?key=<r2-key>` or `/api/proxy-image?url=<url>`

Why proxy

- Consistent CORS/SSL behavior across environments
- Offline-ready exported HTML with inlined or rewritten assets

## 7) Report generation flows

### 7.1 HTML export (`POST /api/reports/upload-html`)

- Input: raw HTML + `inspectionId` and optional `reportMode`
- Processing steps:
  - Rewrites `<img>`, `<source>`, `srcset`, `background-image`, and `data-gallery` payloads
  - Attempts to inline eligible images from R2 as data URIs; otherwise copies them into the report’s `reports/*` folder and rewrites URLs
  - Uploads final HTML to R2
  - Persists `htmlReportUrl` in Mongo and returns a JSON payload with a proxied `url`
- Output JSON example:
  ```json
  {
    "success": true,
    "url": "/api/reports/file?key=reports/inspection-<id>/index.html",
    "html": "...processed..."
  }
  ```

### 7.2 PDF export (`POST /api/reports/generate`)

- Input: `defects[]`, `meta` (title, header, information blocks, etc.), `inspectionId`, `reportMode`
- Rendering:
  - `lib/pdfTemplate.ts` renders report HTML
  - Puppeteer-core + `@sparticuz/chromium(-min)` render a PDF in Node runtime
  - All images that are hosted in R2 are inlined where appropriate to improve reliability
- Storage and response:
  - PDF is uploaded to R2 (`uploadReportToR2`) under `reports/inspection-<id>/...`
  - Mongo inspection updated with `pdfReportUrl`
  - API returns a small JSON with a proxied `downloadUrl` instead of streaming the file
- Output JSON example:
  ```json
  {
    "success": true,
    "downloadUrl": "/api/reports/file?key=reports/inspection-<id>/report.pdf",
    "filename": "inspection-report.pdf"
  }
  ```

This change avoids high “Fast Origin Transfer” quotas on hosting providers.

## 8) AI analysis and pricing

Endpoint: `POST /api/process-analysis`

- Tech: OpenAI Node SDK + Assistants API (Vision via `image_url`)
- Flow:
  1. Upload or reference the defect image (R2 URL or data URL converted to R2)
  2. Create a thread and add a user message with:
     - description and location text
     - `image_url` pointing to the uploaded image
  3. Run the configured assistant (`OPENAI_ASSISTANT_ID`)
  4. Poll until completed, extract the assistant message text, parse its JSON block
  5. Compute a `totalCost = materials_total_cost + labor_rate * hours_required`
  6. Persist a defect document with calculated `base_cost` for later multipliers

Tuning repair prices

- The pricing realism depends on the Assistant’s “System instructions”. Add conservative ranges (e.g., GC $50–75/h, small fixes 1–2h, retail materials) and single-defect scope rules.
- Optionally enforce caps in code:
  ```ts
  const MAX_LABOR_RATE = 150,
    MAX_HOURS = 8,
    MAX_MATERIALS = 500;
  parsed.labor_rate = Math.min(parsed.labor_rate || 0, MAX_LABOR_RATE);
  parsed.hours_required = Math.min(parsed.hours_required || 0, MAX_HOURS);
  parsed.materials_total_cost = Math.min(
    parsed.materials_total_cost || 0,
    MAX_MATERIALS
  );
  ```

## 9) Frontend UI overview

Main screens

- Inspection Report Builder (`/inspection_report/[id]`)
  - Status, Limitations/Information lists with selection, reordering, and editing
  - Hidden manager panels per tab
  - Image uploads per checklist, 360° flag, and preview
  - Export to HTML/PDF actions
- Image Editor (`/image-editor`)
  - Upload, annotate, crop, arrows, color pickers
- User Report (`/user-report`)
  - Aggregated total estimated cost view for end users

Important components

- `components/InformationSections.tsx` – Central feature:
  - Selection state, answers (template choices + custom), default-checked logic
  - Collapsible headers and content gating
  - Drag-and-drop ordering for items and answer choices
  - Per-item edit modal and "Add New" checklist creation
- `components/ImageEditor.tsx` – Interactive canvas editing and export

## 10) API surface (selected)

- `POST /api/reports/generate` → { downloadUrl, filename }
- `POST /api/reports/upload-html` → { url, html, key }
- `GET  /api/reports/file?key=...` → streams object from R2 via proxy
- `GET  /api/proxy-image?url=...` → displays remote image through the app
- `GET  /api/information-sections/sections` → list templates
- `GET  /api/information-sections/[inspectionId]` → list info blocks for inspection
- `POST/PUT/DELETE /api/...` for blocks/checklists (see routes under `src/app/api`)
- `POST /api/process-analysis` → triggers OpenAI vision analysis and persists a defect

## 11) Environment variables

See `env.d.ts` for types. Expected keys:

- `OPENAI_API_KEY` – OpenAI API key
- `OPENAI_ASSISTANT_ID` – Assistant ID (pricing rules live here)
- `MONGODB_URI` – MongoDB connection string
- `CLOUDFLARE_ACCOUNT_ID` – Cloudflare account
- `CLOUDFLARE_R2_BUCKET` – R2 bucket name
- `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY` – R2 credentials
- `CLOUDFLARE_R2_ENDPOINT` – R2 S3 endpoint
- `CLOUDFLARE_PUBLIC_URL` – Public base used for URL resolution/rewrite

Minimal example (`.env.local`):

```bash
OPENAI_API_KEY=sk-
OPENAI_ASSISTANT_ID=asst_...
MONGODB_URI=mongodb+srv://user:pass@cluster/db
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
CLOUDFLARE_PUBLIC_URL=https://<public-domain-or-r2-public-base>
```

## 12) Running locally

Requirements: Node 18+, npm, access to MongoDB + R2 credentials.

```bash
# install deps
npm install

# dev server
npm run dev

# build
npm run build

# start production build locally
npm run start
```

If Puppeteer PDF fails locally: set `PUPPETEER_EXECUTABLE_PATH` to your Chrome binary.

## 13) Deployment notes

- Next.js App Router running on a serverless platform (e.g., Vercel)
- Ensure `runtime = "nodejs"` for Puppeteer routes
- Set `maxDuration` large enough for PDF generation (the code already does)
- R2 credentials must be available at runtime for upload/download
- Origin transfer savings: Return URLs instead of binary files from report generation endpoints

## 14) Cost control (hosting + AI)

- Hosting bandwidth: Avoid streaming PDF in API response (already implemented); reuse `/api/reports/file` proxy for downloads
- AI:
  - Prefer Assistant model with vision that’s cost‑efficient (e.g., `gpt-4o-mini`) if pricing is a concern
  - Add conservative pricing ranges to the System Instructions; optionally hard-cap values in code

## 15) Troubleshooting

- Exported HTML missing images → check `/api/proxy-image` and `upload-html` rewrite logs; ensure `CLOUDFLARE_PUBLIC_URL` is set
- PDF generation times out → confirm Node runtime, Chromium pack, and executable path; try increasing `maxDuration`
- Very high repair costs → tune assistant instructions; confirm your changes by running a single image in Playground; optionally apply server caps
- 360° photos not loading → confirm size limits and recommended dimensions in UI hints; overly large images may fail in browsers

## 16) Extending the system

- Add new checklist answer choices:
  - Template-level in per-item edit modal; inspection-specific custom answers are also supported
- Add new export formats:
  - Follow the HTML and PDF patterns; upload to R2; return proxied URL JSON
- Add validations:
  - On `/api/process-analysis`, enforce min/max labor/materials/hours prior to persisting

## 17) Glossary

- Information Block – A bundle of selected checklists (status/limitations/information) with answers, notes, and images
- Template – The master list of checklists and ordering for a section
- R2 – Cloudflare object storage where images, HTML, and PDFs live
- Proxy URL – App-hosted path that fetches an R2 object, used in exports and downloads

---

If you need a quick orientation: open `components/InformationSections.tsx` for the main UX logic and `src/app/inspection_report/[id]/page.tsx` for the page that brings it all together. For exports, read `src/app/api/reports/upload-html/route.ts` and `src/app/api/reports/generate/route.ts`. For AI pricing, see `src/app/api/process-analysis/route.ts` and adjust the assistant’s System Instructions.
