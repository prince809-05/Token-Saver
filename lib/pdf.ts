import type { PdfMode } from "@/types";

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
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

export async function parsePdfToMarkdown(file: File, mode: PdfMode) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];
    const rows = new Map<number, TextItem[]>();

    for (const item of items) {
      const y = Math.round(item.transform[5]);
      rows.set(y, [...(rows.get(y) ?? []), item]);
    }

    const lines = Array.from(rows.entries())
      .sort(([a], [b]) => b - a)
      .map(([, row]) =>
        row
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map((item) => item.str.trim())
          .filter(Boolean)
          .join(" ")
      )
      .filter(Boolean)
      .map((line) => {
        if (line.length < 90 && /^[A-Z0-9][A-Z0-9\s:.,/&-]{5,}$/.test(line)) {
          return toHeading(line.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()), 2);
        }

        if (/^\d+[\).]\s+/.test(line) || /^[-*]\s+/.test(line)) {
          return line.replace(/^\d+[\).]\s+/, "- ");
        }

        return line;
      });

    pages.push(lines.join("\n\n"));
  }

  const body = pages
    .map((page, index) => `<!-- Page ${index + 1} -->\n\n${page}`)
    .join("\n\n---\n\n")
    .replace(/\n{3,}/g, "\n\n");

  return sectionForMode(mode, body);
}
