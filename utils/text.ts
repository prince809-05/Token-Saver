import { estimateTokens } from "@/utils/tokenizer";
import type { OptimizationResult } from "@/types";

const FILLER_PATTERNS = [
  /\bplease\s+/gi,
  /\bkindly\s+/gi,
  /\bI want you to\s+/gi,
  /\bcan you\s+/gi,
  /\bcould you\s+/gi,
  /\breally\s+/gi,
  /\bvery\s+/gi,
  /\bbasically\s+/gi,
  /\bin order to\b/gi
];

export function cleanContext(input: string) {
  const originalTokens = estimateTokens(input);
  const seen = new Set<string>();

  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  const cleaned = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const cleanedTokens = estimateTokens(cleaned);

  return {
    cleaned,
    originalTokens,
    cleanedTokens,
    savedTokens: Math.max(0, originalTokens - cleanedTokens),
    reductionPercentage: originalTokens
      ? Math.round(((originalTokens - cleanedTokens) / originalTokens) * 100)
      : 0
  };
}

export function optimizePrompt(input: string): OptimizationResult {
  const originalTokens = estimateTokens(input);
  const reasons = new Set<string>();
  const cleaned = cleanContext(input).cleaned;

  let optimized = cleaned;

  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(optimized)) {
      reasons.add("Removed filler wording");
      optimized = optimized.replace(pattern, "");
    }
  }

  optimized = optimized
    .replace(/\bmake sure that\b/gi, "ensure")
    .replace(/\bwith the help of\b/gi, "using")
    .replace(/\bas soon as possible\b/gi, "quickly")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const lines = optimized.split("\n").filter(Boolean);
  const taskLine = lines.find((line) => /^(task|goal|objective|build|create|write|analyze)/i.test(line));
  const constraints = lines.filter((line) => /must|should|avoid|include|use|return|format/i.test(line));
  const context = lines.filter((line) => line !== taskLine && !constraints.includes(line));

  if (taskLine || constraints.length > 1) {
    reasons.add("Improved prompt structure");
    optimized = [
      taskLine ? `Task: ${taskLine.replace(/^task:\s*/i, "")}` : "Task: Complete the requested work.",
      context.length ? `Context:\n${context.map((line) => `- ${line}`).join("\n")}` : "",
      constraints.length ? `Requirements:\n${constraints.map((line) => `- ${line}`).join("\n")}` : "",
      "Output: Provide the final answer directly, with concise reasoning only where useful."
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (cleaned.length !== input.trim().length) {
    reasons.add("Removed repetition and extra whitespace");
  }

  if (!reasons.size) {
    reasons.add("Kept wording mostly intact because it was already concise");
  }

  const optimizedTokens = estimateTokens(optimized);
  const savedTokens = Math.max(0, originalTokens - optimizedTokens);

  return {
    optimized,
    reasons: Array.from(reasons),
    metrics: {
      inputTokens: originalTokens,
      outputTokens: optimizedTokens,
      savedTokens,
      reductionPercentage: originalTokens ? Math.round((savedTokens / originalTokens) * 100) : 0
    }
  };
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
