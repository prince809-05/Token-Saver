# TokenFlow AI

TokenFlow AI is a local-first Next.js MVP for reducing AI token usage, cleaning long context, estimating API cost, and converting PDFs into AI-ready Markdown.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Browser localStorage for templates
- Client-side PDF parsing with `pdfjs-dist`
- Local token estimation and cost calculation
- Vercel-ready static deployment

## Install

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run typecheck
npm run build
```

## Build Phases

### Phase 1: Project Setup + Dashboard UI

Files:

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `components/token-flow-app.tsx`
- `components/ui.tsx`

What it includes:

- Next.js App Router setup
- Tailwind theme and responsive desktop-first layout
- SaaS-style dashboard cards for all five tools
- Local-first architecture messaging

### Phase 2: Prompt Optimizer

Files:

- `utils/text.ts`
- `utils/tokenizer.ts`
- `components/token-flow-app.tsx`

What it includes:

- Original and optimized prompt panels
- Estimated input and optimized tokens
- Saved token count and reduction percentage
- Explanation tags for removed repetition, filler, and structure improvements
- Copy button

### Phase 3: PDF Upload + Markdown Conversion

Files:

- `lib/pdf.ts`
- `components/token-flow-app.tsx`

What it includes:

- PDF upload
- Modes for study notes, technical docs, meeting notes, summary, and custom
- Client-side text extraction with `pdfjs-dist`
- Markdown editor output
- Copy and `.md` download actions

Note: text-based PDFs work best. Scanned PDFs need OCR, which is intentionally left out of the MVP to keep cost low.

### Phase 4: Token Usage Calculator

Files:

- `utils/tokenizer.ts`
- `components/token-flow-app.tsx`

What it includes:

- Local token estimates for GPT, Claude, and Gemini families
- Editable expected output token count
- Cost comparison table
- Pricing constants in `utils/tokenizer.ts` for easy updates

### Phase 5: Context Cleaner

Files:

- `utils/text.ts`
- `components/token-flow-app.tsx`

What it includes:

- Duplicate line removal
- Whitespace cleanup
- Repeated prompt/context cleanup
- Token savings metrics
- Copy button

### Phase 6: Templates

Files:

- `types/index.ts`
- `components/token-flow-app.tsx`

What it includes:

- Save, edit, delete, and copy templates
- Save outputs from every tool into the task vault
- Export/import saved tasks as JSON
- Launch saved tasks into GitHub Issues, Trello, Todoist, email, and Notion
- Study, coding, business, and custom categories
- Browser localStorage persistence
- Data shape that can later move to a database

### Phase 7: Polish + Error Handling

Files:

- `components/ui.tsx`
- `components/token-flow-app.tsx`
- `app/globals.css`

What it includes:

- Toast messages
- Empty states
- PDF parsing error fallback
- Copy/download states
- Modern light theme with cards, soft shadows, and responsive spacing

## Vercel Deployment

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import `prince809-05/Token-Saver`.
4. Keep the defaults:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: leave empty
5. Deploy.

This repo also includes `vercel.json` and a Node 20+ engine requirement so Vercel uses the expected Next.js build path.

No environment variables are required for the MVP.

## Future Scaling Notes

- Replace localStorage templates with a database table.
- Add authenticated template sync.
- Add optional OCR for scanned PDFs.
- Add model-specific tokenizer libraries if exact counts become necessary.
- Add server-side API routes only for features that truly need backend processing.
