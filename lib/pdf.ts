import type { PdfMode } from "@/types";

const MAX_PDF_BYTES = 30 * 1024 * 1024;

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

type TextRow = {
  y: number;
  items: TextItem[];
};

function toHeading(line: string, level: number) {
  const clean = line.replace(/\s+/g, " ").trim();
  return `${"#".repeat(level)} ${clean}`;
}

function sectionForMode(mode: PdfMode, body: string) {
  const content = body.trim() || "_No readable text was found in this PDF._";

  if (mode === "Meeting notes") {
    return `# Meeting Notes\n\n## Discussion\n\n${content}\n\n## Decisions\n\n- \n\n## Action Items\n\n- `;
  }

  if (mode === "Technical documentation") {
    return `# Technical Documentation\n\n## Overview\n\n${content}\n\n## Implementation Notes\n\n- \n\n## Open Questions\n\n- `;
  }

  if (mode === "Summary") {
    return `# Summary\n\n## Main Points\n\n${content}\n\n## Key Takeaways\n\n- `;
  }

  if (mode === "Study notes") {
    return `# Study Notes\n\n## Key Concepts\n\n${content}\n\n## Important Points\n\n- \n\n## Definitions\n\n- `;
  }

  return `# PDF Markdown\n\n${content}`;
}

function isTextItem(item: unknown): item is TextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item &&
    typeof (item as TextItem).str === "string" &&
    Array.isArray((item as TextItem).transform)
  );
}

function addToRows(rows: TextRow[], item: TextItem) {
  const y = item.transform[5] ?? 0;
  const row = rows.find((candidate) => Math.abs(candidate.y - y) <= 3);

  if (row) {
    row.items.push(item);
    row.y = (row.y + y) / 2;
    return;
  }

  rows.push({ y, items: [item] });
}

function normalizeLine(row: TextItem[]) {
  return row
    .sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0))
    .map((item) => item.str.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function markdownLine(line: string) {
  if (line.length < 90 && /^[A-Z0-9][A-Z0-9\s:.,/&-]{5,}$/.test(line)) {
    return toHeading(
      line.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
      2
    );
  }

  if (/^\d+[\).]\s+/.test(line) || /^[-*]\s+/.test(line)) {
    return line.replace(/^\d+[\).]\s+/, "- ");
  }

  return line;
}

function validatePdf(file: File) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Choose a valid PDF file.");
  }

  if (file.size === 0) {
    throw new Error("This PDF is empty.");
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new Error("This PDF is over 30 MB. Split or compress it first.");
  }
}

export function pdfErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/password/i.test(message)) {
    return "This PDF is password protected. Unlock it first, then upload again.";
  }

  if (/invalid|corrupt|missing pdf/i.test(message)) {
    return "This file could not be read as a valid PDF.";
  }

  if (/worker|module|import/i.test(message)) {
    return "PDF worker failed to load. Refresh once and try again.";
  }

  return message || "PDF parsing failed. Try a text-based PDF.";
}

export async function parsePdfToMarkdown(file: File, mode: PdfMode) {
  validatePdf(file);

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(data),
    stopAtErrors: false,
    useSystemFonts: true
  }).promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const rows: TextRow[] = [];

      for (const item of textContent.items) {
        if (isTextItem(item)) {
          addToRows(rows, item);
        }
      }

      const lines = rows
        .sort((a, b) => b.y - a.y)
        .map((row) => normalizeLine(row.items))
        .filter(Boolean)
        .map(markdownLine);

      pages.push(lines.join("\n\n"));
    }
  } finally {
    await pdf.destroy();
  }

  const body = pages
    .map((page, index) => `<!-- Page ${index + 1} -->\n\n${page}`)
    .join("\n\n---\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sectionForMode(mode, body);
}
