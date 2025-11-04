## Copilot instructions – Advanced Image Editor / Inspection Reports

Big picture

- Next.js App Router (Next 13.4.19) with React 18 + TypeScript. UI lives in `components/*` and `src/app/*`; API route handlers are in `src/app/api/**/route.ts`.
- Data: MongoDB via `lib/mongodb.ts` with simple helpers in `lib/inspection.ts` and `lib/defect.ts`. Template-driven sections use Mongoose models in `src/models/*`.
- Binary assets (images, HTML, PDF) go to Cloudflare R2 via `lib/r2.ts`.
- Principle: never stream large files back from APIs. Generate → upload to R2 → return a small JSON with a proxied URL (`/api/reports/file?key=...` or `/api/proxy-image?url=...`).

Key code paths

- Report builder page: `src/app/inspection_report/[id]/page.tsx`. Information Sections UI: `components/InformationSections.tsx`. Image editor: `components/ImageEditor.tsx` + `src/app/image-editor/page.tsx`.
- Exports: HTML → `src/app/api/reports/upload-html/route.ts`; PDF → `src/app/api/reports/generate/route.ts` (Puppeteer-core + `@sparticuz/chromium(-min)` fallback to `@sparticuz/chromium`).
- AI analysis (background): `src/app/api/llm/analyze-image/route.ts` enqueues via Upstash QStash → `src/app/api/process-analysis/route.ts` (OpenAI Assistants Vision) secured with `verifySignatureAppRouter`.
- R2 helpers in `lib/r2.ts`: `uploadToR2`, `uploadReportToR2`, `getR2ObjectAsDataURI`, `getR2Object`, `copyInR2`, `extractR2KeyFromUrl`, `resolveR2KeyFromUrl`, `generatePresignedUploadUrl`.

API route conventions

```ts
export const runtime = "nodejs"; // required for Puppeteer, AWS SDK (R2), Mongo
export const dynamic = "force-dynamic"; // disable caching
export const maxDuration = 60; // heavy routes (PDF, uploads)
```

Storage and proxying

- R2 key layout: `inspections/<id>/...` (captured media), `reports/inspection-<id>/...` (export artifacts).
- File access via proxies: `/api/reports/file?key=<r2-key>` redirects to `CLOUDFLARE_PUBLIC_URL` when set (else streams) and only allows `reports/*`; `/api/proxy-image?url=<url>` includes R2 SDK fallbacks to work around SSL issues.

Report flows

- HTML export: rewrites/inlines `<img|source|srcset|background-image>`; copies non-inlined assets to `reports/*`; uploads via `uploadReportToR2`; updates `htmlReportUrl`.
- PDF export: inlines eligible R2 images via `getR2ObjectAsDataURI`; renders with Puppeteer-core and serverless Chromium; uploads via `uploadReportToR2`; updates `pdfReportUrl`. Requires `inspectionId`; returns `{ success, downloadUrl, filename }`.

Data and costs

- Defects store `base_cost = materials_total_cost + labor_rate * hours_required`. PDF totals multiply by photo count (`1 + additional_images.length`). Pricing realism is primarily tuned in the Assistant’s system prompt; optional caps can be enforced in code when needed.

Dev workflow and env

- Scripts: `npm run dev | build | start | lint` (+ `test:360`, `test:360:full`). Engines: Node `22.x`; Next `13.4.19`.
- PDF locally: set `PUPPETEER_EXECUTABLE_PATH` or `CHROME_PATH` if Chrome isn’t auto-detected. Serverless uses `@sparticuz/chromium(-min)` and `headless: "shell"`.
- Queueing: set `QSTASH_TOKEN` and `NEXT_PUBLIC_BASE_URL` for the analyze → process flow.
- Required env (see `env.d.ts`): `OPENAI_API_KEY`, `OPENAI_ASSISTANT_ID`, `MONGODB_URI`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_PUBLIC_URL`.

Conventions and patterns

- Client components use "use client"; browser-only widgets via `dynamic(() => import(...), { ssr: false })` (see `ThreeSixtyViewer`).
- Two data layers: direct Mongo driver for inspections/defects (`lib/*`), Mongoose models for sections/templates (`src/models/*`).
- Start here to extend: `components/InformationSections.tsx`, `src/app/inspection_report/[id]/page.tsx`, `src/app/api/reports/*`, `lib/r2.ts`.
