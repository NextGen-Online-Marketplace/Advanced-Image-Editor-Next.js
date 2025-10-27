# Copilot Instructions for Advanced Image Editor / Inspection Reporting Platform

## Architecture Overview

This is a Next.js 13 (App Router) inspection reporting platform with three-tier architecture:

- **Frontend**: React 18 + TypeScript client components with inline styles and Tailwind
- **Backend**: Next.js API routes (serverless) accessing MongoDB Atlas and Cloudflare R2
- **Storage**: Binary assets in R2 (S3-compatible), inspection data in MongoDB with Mongoose models

**Critical principle**: Large files (PDFs, HTML exports) are NEVER streamed in API responses. APIs return small JSON payloads with proxied download URLs (`/api/reports/file?key=...`) to avoid high origin transfer costs.

## Project Structure

- `src/app/` - App Router pages and API routes
  - `inspection_report/[id]/page.tsx` - Main report builder UI (4800+ lines, inline styled)
  - `api/**/route.ts` - Serverless endpoints (all use `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`)
- `components/` - All client components (`"use client"` directive required)
  - `InformationSections.tsx` - Core 5000+ line feature: template-driven checklists with drag-drop, collapsible sections, and bi-directional sync
- `lib/` - Service layer (MongoDB, R2, PDF generation, stores)
- `src/models/` - Mongoose schemas (Section, SectionChecklist, InspectionInformationBlock)
- `types/` - TypeScript definitions for external deps (Chromium, Cloudflare, LLM)
- `public/report-template/` - Static HTML/CSS for report rendering

## Key Conventions

### API Routes Pattern

Every API route in `src/app/api/**/route.ts` must export:

```typescript
export const runtime = "nodejs"; // Required for Puppeteer, R2, MongoDB
export const dynamic = "force-dynamic"; // Disable caching
export const maxDuration = 60; // For heavy operations (PDF, large uploads)
```

### Client/Server Boundaries

- All `/components/*.tsx` files require `"use client"` directive (React hooks, event handlers, canvas)
- Use `dynamic()` import for browser-only libs like `ThreeSixtyViewer` (pannellum.js):
  ```typescript
  const ThreeSixtyViewer = dynamic(
    () => import("@/components/ThreeSixtyViewer"),
    { ssr: false }
  );
  ```

### R2 Storage Patterns (`lib/r2.ts`)

1. **Upload**: `uploadToR2(buffer, key, contentType)` → returns public URL
2. **Copy**: `copyInR2(srcKey, destKey)` → duplicate R2 objects without download
3. **Inline**: `getR2ObjectAsDataURI(key)` → convert to base64 data URI for embedding
4. **Proxy**: `/api/reports/file?key=<r2-key>` and `/api/proxy-image?url=<url>` for CORS-safe access

**Key structure**:

- `inspections/{id}/...` - inspection images/videos
- `reports/inspection-{id}/...` - exported HTML/PDF and report-specific assets
- Use `extractR2KeyFromUrl()` or `resolveR2KeyFromUrl()` helpers for URL parsing

### Report Generation Flow

**HTML Export** (`/api/reports/upload-html`):

1. Rewrite all `<img>`, `<source>`, `srcset`, `background-image` URLs
2. Inline eligible R2 images as data URIs (PNG/JPEG up to ~3MB)
3. Copy non-inlined assets to `reports/inspection-{id}/images/...`
4. Upload final HTML to R2, persist `htmlReportUrl` in MongoDB
5. Return JSON: `{ success: true, url: "/api/reports/file?key=...", html: "..." }`

**PDF Export** (`/api/reports/generate`):

1. Pre-process defects + meta to inline R2 images as data URIs via `maybeInline(url)`
2. Render HTML with `generateInspectionReportHTML()` from `lib/pdfTemplate.ts`
3. Launch Puppeteer with `@sparticuz/chromium-min` (serverless-compatible)
4. Upload PDF to R2, update MongoDB with `pdfReportUrl`
5. Return JSON: `{ success: true, downloadUrl: "/api/reports/file?key=...", filename: "..." }`

### MongoDB Patterns (`lib/mongodb.ts`, `lib/inspection.ts`, `lib/defect.ts`)

- Singleton client cached in `global._mongoClientPromise` (Vercel serverless requirement)
- Use Mongoose models in `src/models/` (auto-created indexes, timestamps)
- Service functions: `createInspection()`, `updateInspection()`, `getDefectsByInspection()`, etc.
- All API routes import from `lib/` layer, never direct MongoDB calls

### AI Analysis (`/api/process-analysis`)

- OpenAI Assistants API with Vision (`image_url` message part)
- Converts data URIs to R2 before sending to API (avoids token bloat)
- Parses JSON response for `materials_total_cost`, `labor_rate`, `hours_required`
- Computes `totalCost = materials + (labor_rate * hours)` and stores as `base_cost`
- Tune pricing via Assistant's System Instructions; optionally hard-cap values server-side

### Environment Variables (`env.d.ts`)

Required for all environments:

```
OPENAI_API_KEY, OPENAI_ASSISTANT_ID
MONGODB_URI
CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_BUCKET
CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_PUBLIC_URL
```

Locally add `PUPPETEER_EXECUTABLE_PATH` if Chrome not auto-detected.

## Development Workflow

```powershell
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Build production
npm run build

# Start production build locally
npm run start

# 360° photo tests
npm run test:360          # Quick test
npm run test:360:full     # Full E2E
```

## Critical Implementation Details

### InformationSections Component

- 5000+ line component managing template-driven checklists (Status, Limitations, Information)
- **Collapsible logic**: Status and Limitations items collapse by default when selected
- **Default-checked sync**: Template flag must match selection state (can't be default=true if unselected)
- **Drag-drop**: Reorder mode for template items (Status/Limitations) and answer choices (horizontal/vertical detection)
- **Custom answers**: Inspection-specific answers tracked separately from template choices
- State managed via hooks, no external store; saves to `/api/information-sections/[inspectionId]`

### Image/Video Upload Limits

- Max 200MB per file (requires Vercel Pro for >100MB)
- HEIC/HEIF auto-converted to JPEG via `heic-convert` or `heic2any`
- 360° photos flagged with `isThreeSixty` boolean; rendered via `@photo-sphere-viewer/core`

### Styling Approach

- Mix of Tailwind utilities and inline styles (especially in `inspection_report/[id]/page.tsx`)
- Module CSS for specific components (`DefectPhotoGrid.module.css`, `user-report.module.css`)
- Global styles in `src/app/globals.css` and `public/shared-report-styles.css`
- No styled-components or CSS-in-JS library

### Next.js Configuration (`next.config.mjs`)

- `serverComponentsExternalPackages`: Exclude Puppeteer, Chromium, exifr from bundling
- Webpack externals for server to prevent ESM parse errors
- Client-side `chunkLoadTimeout: 300000` (5 min) for slow networks
- Custom chunk splitting for `InformationSections` (priority: 10)

## Common Gotchas

1. **PDF generation timeouts**: Ensure `maxDuration = 60` and `runtime = "nodejs"` in route
2. **Missing images in exports**: Check `CLOUDFLARE_PUBLIC_URL` env var and R2 key extraction logic
3. **High repair costs from AI**: Adjust OpenAI Assistant's System Instructions with conservative ranges (GC $50-75/h, 1-2h fixes, retail material costs); optionally cap in `process-analysis/route.ts`
4. **Mongoose model caching**: Use `mongoose.models.X || mongoose.model(...)` pattern to avoid recompilation errors in serverless
5. **ChunkLoadError**: Already mitigated with 5-min timeout + vendor chunk splitting; if persists, check network conditions

## Extension Points

- **New checklist types**: Extend `ISectionChecklist` interface; update `InformationSections.tsx` filter logic
- **New export formats**: Follow HTML/PDF pattern in `/api/reports/*`; upload to R2, return proxied URL JSON
- **Custom AI pricing logic**: Modify `process-analysis/route.ts` after polling Assistant response; add server-side validations/caps

## Reference Files

- Architecture: `docs/Project-Guide.md`
- Main UX logic: `components/InformationSections.tsx`
- Report builder: `src/app/inspection_report/[id]/page.tsx`
- R2 integration: `lib/r2.ts`
- PDF generation: `src/app/api/reports/generate/route.ts`, `lib/pdfTemplate.ts`
- HTML export: `src/app/api/reports/upload-html/route.ts`
