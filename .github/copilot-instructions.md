# Copilot Instructions for AGI Property Inspections Platform

## Project Overview

A Next.js 13+ property inspection platform with AI-powered defect analysis, canvas-based image editing, and Puppeteer PDF report generation. Built for field inspectors to capture defects, annotate images with drawing tools, manage inspection checklists, and generate professional reports with color-coded sections.

**Tech Stack**: Next.js 13 App Router, TypeScript, MongoDB, Cloudflare R2, OpenAI GPT-4, Upstash QStash, Puppeteer, Zustand, Tailwind CSS

## Architecture

### Core Structure

- **Next.js 13 App Router**: Routes in `src/app`, reusable UI in `components`, business logic in `lib`
- **Database**: MongoDB (`agi_inspections_db`) with collections: `inspections`, `defects`, `sections`, `inspection_information_blocks`
- **Storage**: Cloudflare R2 (S3-compatible) for images/videos/reports; public URLs at `${CLOUDFLARE_PUBLIC_URL}/{key}`
- **AI Pipeline**: OpenAI GPT-4 Assistant API + Upstash QStash for async defect analysis (two-phase: enqueue → process)
- **PDF Generation**: Puppeteer with `@sparticuz/chromium-min` for serverless; data URI image inlining required

### Key Components

- **`components/ImageEditor.tsx`** (2800+ lines): Canvas-based editor with draw/arrow/circle/square tools, drag-to-move/rotate/resize shapes, complex undo/redo history with action snapshots
- **`components/InformationSections.tsx`** (4000+ lines): Inspection checklist UI with localStorage persistence, drag-and-drop reordering, template vs inspection-specific items, auto-save
- **`components/ThreeSixtyViewer.tsx`**: Photo Sphere Viewer for 360° photos (dynamically imported to avoid SSR issues)
- **`lib/pdfTemplate.ts`**: HTML report template generator with inline CSS, color-coded defect sections (red/orange/blue/purple), dynamic numbering

## Critical Patterns

### Event-Driven Image Editor

`ImageEditor.tsx` uses **DOM CustomEvents** for toolbar communication to avoid prop drilling across 2800+ lines:

```typescript
// Dispatch from toolbar buttons (e.g., image-editor/page.tsx):
window.dispatchEvent(new CustomEvent("undoAction"));
window.dispatchEvent(new CustomEvent("rotateImage"));
window.dispatchEvent(new CustomEvent("applyCrop"));

// Listen inside ImageEditor useEffect (~line 350+):
window.addEventListener("undoAction", handleUndoAction);
```

**When adding annotation tools**: (1) Add toolbar button with CustomEvent dispatch, (2) Add listener in `ImageEditor.tsx` useEffect, (3) Implement handler updating `actionHistory` for undo/redo, (4) Use `renderMetricsRef.current` for coordinate transforms between screen/canvas space.

### localStorage Inspection State

`InformationSections.tsx` persists inspection-specific data in browser localStorage (not server):

- **`inspection_checklists_{sectionId}_{inspectionId}`**: Custom checklist items added during this inspection (not in template)
- **`hidden_checklists_{inspectionId}`**: Template items hidden for this specific inspection
- **`pendingAnnotation`**: Image annotation data waiting to be attached to checklist (after image editor redirect)
- **`returnToSection`**: Navigate back to correct section/tab after image editing

**Pattern**: Check localStorage keys in `useEffect` on mount, sync changes to both React state AND localStorage. Auto-save timer debounces writes (500ms). Clear keys on inspection completion or block deletion.

### Zustand Store for Cross-Page State

`lib/store.ts` provides persistent storage (localStorage-backed) for analysis data passed between image editor and inspection pages:

```typescript
// Set from image editor after annotation:
useAnalysisStore.getState().setAnalysisData({
  inspectionId,
  imageFile,
  description,
  location,
  section,
  subSection,
  selectedArrowColor,
});

// Read from inspection page to display/submit:
const { analysisData } = useAnalysisStore();
```

**Usage**: Files converted to base64 data URIs before storage. Store is hydrated from localStorage on page load.

### R2 Media Proxying

All remote media goes through `/api/proxy-image?url=` to handle CORS and normalize R2 URLs:

```typescript
const getProxiedSrc = (url?: string) => {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};
```

**When displaying external images**: Always proxy through this endpoint (see `InformationSections.tsx` line 130).

### R2 Media Proxying & URL Patterns

All R2-hosted media MUST proxy through `/api/proxy-image?url=` to handle CORS and normalize URLs:

```typescript
// Always use this pattern in React components:
const getProxiedSrc = (url?: string) => {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};
```

**R2 URL structure**: `${CLOUDFLARE_PUBLIC_URL}/{key}` where keys follow `inspections/{inspectionId}/{timestamp}.{ext}` or `reports/inspection-{id}/inspection-{id}-{mode}-{timestamp}.{ext}`

**Deleting R2 objects**: Always extract key from URL first via `extractR2KeyFromUrl(url)` or `resolveR2KeyFromUrl(url)` before calling `DeleteObjectCommand`.

### Async AI Analysis Queue (Upstash QStash)

Two-phase analysis prevents serverless timeouts:

1. **`POST /api/llm/analyze-image`**: Accepts image (File/base64), uploads to R2, enqueues job to QStash targeting `/api/process-analysis`
2. **`POST /api/process-analysis`**: Background worker (signature-verified via `verifySignatureAppRouter`) runs OpenAI Assistant API analysis, creates defect in MongoDB

**Critical**: Process endpoint MUST preserve `verifySignatureAppRouter` wrapper. Images are base64-encoded in queue payload to avoid secondary storage. Analysis uses OpenAI Assistant ID from `OPENAI_ASSISTANT_ID` env var.

## Data Flow Patterns

### Inspection Lifecycle

1. **Create inspection**: `POST /api/inspections` → MongoDB `inspections` collection (fields: `name`, `status`, `date`, `headerImage`, `headerText`)
2. **Add defects**: Image annotation → `POST /api/llm/analyze-image` → QStash queue → `POST /api/process-analysis` → OpenAI analysis → MongoDB `defects` collection
3. **Add information sections**: Checklist UI → `POST /api/information-sections/{inspectionId}` → MongoDB `inspection_information_blocks` collection
4. **Generate report**: `POST /api/reports/generate` → Puppeteer renders HTML → R2 PDF storage → `updateInspection()` with `pdfReportUrl`

**MongoDB Structure**: All IDs stored as `ObjectId` in database. Convert via `new ObjectId(stringId)` when querying. Database name hardcoded to `agi_inspections_db`.

### Image Upload Flow

```
User Upload/Camera Capture → ImageEditor (canvas annotations) →
  Base64 data URI → Zustand store OR FormData →
  POST /api/llm/analyze-image →
  decodeBase64Image() → uploadToR2() →
  R2 public URL stored in defect/block record
```

**File size limits**: 200MB max (Vercel Pro required for >100MB). HEIC/HEIF auto-converted to JPEG via `heic-convert` or `heic2any` client-side. 360° photos flagged with `isThreeSixty: true`.

### Report Generation

`lib/pdfTemplate.ts` generates HTML with:

- **Inline CSS only** (no external stylesheets; Puppeteer doesn't load them reliably)
- **Data URI images** (via `maybeInline()` in `api/reports/generate/route.ts` to embed R2 images as base64)
- **Color-coded sections**: Defects classified by arrow color (red=Immediate, orange=Repair, blue=Maintenance, purple=Evaluation)
- **Dynamic numbering**: `display_number` like "3.1.2" based on section/subsection hierarchy
- **Information blocks first**: Custom checklists displayed before defect sections

**Deployment note**: PDF route uses `export const runtime = "nodejs"` (NOT Edge). Chromium binary from `CHROMIUM_PACK_URL` on serverless.

## Environment & Deployment

### Required Environment Variables

```bash
# MongoDB (connection pooling via global._mongoClientPromise)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# Cloudflare R2 (S3-compatible storage)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_PUBLIC_URL=https://pub-xxxxx.r2.dev  # Public access URL for bucket

# OpenAI (GPT-4 Assistant API)
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...  # Pre-configured assistant for defect analysis

# Upstash QStash (async job queue)
QSTASH_TOKEN=...  # Used for signature verification
NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # QStash callback target

# Puppeteer/Chromium
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome  # Local dev only
CHROMIUM_PACK_URL=https://...  # Serverless chromium binary URL
```

### Development Commands

```bash
npm install              # Install dependencies (Node 22.x required per package.json engines)
npm run dev             # Start dev server (localhost:3000)
npm run build           # Production build
npm run lint            # ESLint check
npm run test:360        # Quick 360° photo test
npm run test:360:full   # Full E2E 360° test
```

### Webpack Configuration Gotchas

`next.config.mjs` externalizes packages to prevent server-side bundling issues:

- `puppeteer-core`, `@sparticuz/chromium*`: Prevents SWC private field parse errors
- `exifr`: Avoids UMD dynamic require warnings when SSR picks it up

`config.ignoreWarnings` suppresses known warnings from `libheif-bundle.js` (HEIC conversion) and `exifr` UMD build.

## Common Tasks

### Adding a New Image Annotation Tool

1. Add toolbar button in `src/app/image-editor/page.tsx` (around toolbar section)
2. Dispatch CustomEvent: `window.dispatchEvent(new CustomEvent('yourToolAction', { detail: {...} }))`
3. Add listener in `ImageEditor.tsx` useEffect (lines 350-450): `window.addEventListener('yourToolAction', handler)`
4. Implement handler: update canvas state, push to `actionHistory` for undo/redo
5. Handle rendering in main `useEffect` redraw loop (~line 1500+)

**Coordinate transforms**: Use `renderMetricsRef.current.{offsetX, offsetY, drawWidth, drawHeight}` to convert between screen mouse coordinates and canvas drawing space.

### Adding Checklist Field Types

1. Update `ISectionChecklist` interface in `InformationSections.tsx` (line ~10)
2. Add form UI in checklist modal (status/limitations tabs around line 2500)
3. Handle persistence in `saveInformationBlock()` (line ~1100)
4. Update backend schema in `models/SectionChecklist.ts` if server validation needed
5. Add migration script if changing existing records

**Template vs Inspection-specific**: Template checklists stored in `sections` collection; inspection-specific stored in localStorage as `inspection_checklists_{sectionId}_{inspectionId}`.

### Modifying PDF Report Layout

1. Edit HTML template in `lib/pdfTemplate.ts` → `generateInspectionReportHTML()`
2. **Critical**: Inline ALL CSS (Puppeteer doesn't reliably load external stylesheets)
3. Test data URI inlining: Check `maybeInline()` converts R2 URLs to base64 (`api/reports/generate/route.ts`)
4. Test PDF output via `POST /api/reports/generate` (don't just test browser HTML)
5. Verify color classification: Red/orange/blue/purple arrows map to importance levels

**Deployment**: Ensure `export const runtime = "nodejs"` in route file. Edge runtime doesn't support Puppeteer.

### Adding New Media Type Support

1. **Client upload**: Update `FileUpload.tsx` accept attribute for new MIME types
2. **Analysis endpoint**: Handle new MIME in `api/llm/analyze-image/route.ts` (FormData parsing)
3. **Proxy endpoint**: Add special headers in `api/proxy-image/route.ts` if needed (e.g., video ranges)
4. **Viewer component**: Create React component if not standard `<img>` or `<video>` (see `ThreeSixtyViewer.tsx` dynamic import pattern for heavy libraries)
5. **R2 upload**: Ensure correct `contentType` passed to `uploadToR2(buffer, key, contentType)`

## Debugging & Common Issues

### PDF Images Missing or Broken

**Cause**: R2 images not inlined as data URIs; Puppeteer can't fetch external URLs reliably in headless mode.
**Solution**: Ensure `maybeInline()` in `api/reports/generate/route.ts` converts all R2 URLs to base64 data URIs before passing to `generateInspectionReportHTML()`. Check `extractR2KeyFromUrl()` correctly parses URL format.

### ImageEditor Undo/Redo Not Working

**Cause**: New action not added to `actionHistory` or history snapshot incomplete.
**Solution**: When implementing new tool, push complete action object to `setActionHistory([...actionHistory, newAction])`. For crop/rotate, snapshot previous state in action object (see `CropAction` and `RotateAction` types).

### localStorage Checklist State Out of Sync

**Cause**: Component state updated without corresponding localStorage write, or vice versa.
**Solution**: Always update both in same function. Use `setInspectionChecklists()` AND `localStorage.setItem()` together. Check auto-save timer debounce (500ms) doesn't drop rapid changes.

### Serverless Function Timeout (Vercel 10s limit)

**Cause**: Synchronous processing of large images or AI analysis exceeding free tier timeout.
**Solution**: Use QStash queue pattern (already implemented for `/api/llm/analyze-image`). For other endpoints, check if Vercel Pro plan needed (60s timeout) or break into async steps.

### HEIC/HEIF Images Not Displaying

**Cause**: Browser doesn't natively support HEIC; conversion library failed.
**Solution**: Check `heic-convert` or `heic2any` conversion in `FileUpload.tsx` or `ImageEditor.tsx`. Ensure conversion happens before canvas rendering. For server-side, use `sharp` with libheif.

### 360° Photo Viewer Not Loading

**Cause**: Photo Sphere Viewer library loaded during SSR (server-side rendering).
**Solution**: Use dynamic import with `ssr: false` in `ThreeSixtyViewer.tsx`: `const PhotoSphereViewerComponent = dynamic(() => import('./PhotoSphereViewerComponent'), { ssr: false });`

### Webpack Build Errors with Puppeteer

**Cause**: SWC trying to parse private fields in chromium binary or puppeteer internals.
**Solution**: Ensure packages externalized in `next.config.mjs` under `serverComponentsExternalPackages` and `config.externals`. Don't remove existing externals.

## Project-Specific Conventions

### Color Coding System

Defects use arrow colors to indicate importance (inspectors select during annotation):

- **Red (`#d63636`)**: Immediate Attention (safety/structural issues)
- **Orange (`#f59e0b`)**: Items for Repair (functional problems)
- **Blue (`#3b82f6`)**: Maintenance Items (routine upkeep)
- **Purple (`#7c3aed`)**: Further Evaluation (needs specialist review)

Colors stored in defect records, classified by nearest match in `lib/pdfTemplate.ts` `nearestCategory()`.

### File Naming Patterns

- **R2 keys**: `inspections/{inspectionId}/{timestamp}.{ext}` for media; `reports/inspection-{id}/inspection-{id}-{mode}-{timestamp}.{ext}` for reports
- **Components**: PascalCase, descriptive (`ImageEditor.tsx`, `InformationSections.tsx`)
- **API routes**: RESTful structure in `src/app/api/`, use `route.ts` file naming convention

### TypeScript Interfaces

- **MongoDB models**: Interfaces in `types/mongo.ts` (e.g., `Inspection`, `Defect`)
- **Component props**: Inline interfaces at component definition (see `ImageEditorProps` in `ImageEditor.tsx`)
- **API payloads**: Type aliases in route files or `lib/pdfTemplate.ts` (e.g., `DefectItem`, `ReportMeta`)

**Convention**: Use `_id` for MongoDB ObjectId strings (after `.toString()`), `id` for client-side identifiers.

- **Stale API responses**: Add `export const dynamic = "force-dynamic"` to route (16 routes currently use this)
- **localStorage sync issues**: Check key format matches `inspection_checklists_{sectionId}_{inspectionId}` pattern
- **QStash job failures**: Verify `NEXT_PUBLIC_BASE_URL` is publicly accessible and signature verification passes
- **Puppeteer crashes**: Ensure Node runtime (`export const runtime = "nodejs"`), check memory limits, verify Chrome binary path

### Debug Helpers

- Enable R2 logging: Add console logs in `lib/r2.ts` upload/download methods
- Trace analysis queue: Check QStash dashboard for job status
- Inspect localStorage: DevTools → Application → Local Storage → look for `inspection_*` keys
- Test PDF generation locally: `curl -X POST http://localhost:3000/api/reports/generate -H "Content-Type: application/json" -d @test-payload.json`

## Architecture Decisions

### Why CustomEvents for ImageEditor?

Avoids re-rendering 2800-line component on every toolbar state change. Events decouple toolbar UI from canvas logic.

### Why localStorage for Checklists?

Template items live in MongoDB, but inspection-specific overrides (hidden items, custom answers) are session-scoped and don't warrant DB persistence.

### Why Proxy Images?

Cloudflare R2 URLs can change (virtual-hosted vs path-style), and external sources have CORS restrictions. Proxying normalizes all sources.

### Why Async Analysis Queue?

OpenAI API calls take 5-15 seconds. QStash enables fire-and-forget requests, avoids Vercel function timeouts, and handles retries.
