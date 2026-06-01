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

const SECTION_PATTERNS = [
  /^#{1,6}\s*/,
  /^(task|goal|objective|requirements?|context|output|deliverables?|constraints?)\s*[:\-]\s*/i,
  /^[-*]\s+/,
  /^\d+[\).]\s+/
];

function compactLine(line: string) {
  let compacted = line
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\bproduction-ready\b/gi, "production ready")
    .replace(/\bweb application\b/gi, "web app")
    .replace(/\bwith the help of\b/gi, "using")
    .replace(/\bmake sure that\b/gi, "ensure")
    .replace(/\bas soon as possible\b/gi, "quickly")
    .replace(/\bfor the purpose of\b/gi, "for")
    .replace(/\bthe user should be able to\b/gi, "user can")
    .replace(/\bI need you to\b/gi, "")
    .replace(/\bhelp me\b/gi, "")
    .replace(/\bI want\b/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  for (const pattern of SECTION_PATTERNS) {
    compacted = compacted.replace(pattern, "").trim();
  }

  return compacted;
}

function uniqueLines(input: string) {
  const seen = new Set<string>();

  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(compactLine)
    .filter((line) => line.length > 2)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function truncateLine(line: string, maxLength = 150) {
  if (line.length <= maxLength) {
    return line;
  }

  return `${line.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function buildCompactPrompt(input: string) {
  const lines = uniqueLines(input);
  const task =
    lines.find((line) => /\b(build|create|write|fix|improve|analy[sz]e|convert|deploy|connect)\b/i.test(line)) ??
    lines[0] ??
    "";
  const stack = lines
    .filter((line) => /\b(next\.?js|react|tailwind|vercel|typescript|pdf|markdown|api|database|localstorage)\b/i.test(line))
    .slice(0, 3);
  const requirements = lines
    .filter((line) => line !== task)
    .filter((line) => /\b(must|should|need|include|add|use|save|work|connect|deploy|token|pdf|markdown|vercel|responsive|error|copy|download)\b/i.test(line))
    .slice(0, 8);
  const fallbackContext = lines.filter((line) => line !== task && !requirements.includes(line)).slice(0, 4);

  return [
    task ? `Task: ${truncateLine(task)}` : "",
    stack.length ? `Stack: ${stack.map((line) => truncateLine(line, 80)).join("; ")}` : "",
    requirements.length
      ? `Requirements:\n${requirements.map((line) => `- ${truncateLine(line)}`).join("\n")}`
      : fallbackContext.length
        ? `Context:\n${fallbackContext.map((line) => `- ${truncateLine(line)}`).join("\n")}`
        : "",
    "Deliver: Working result, concise notes, and verification steps."
  ]
    .filter(Boolean)
    .join("\n\n");
}

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
  const candidates: Array<{ text: string; reasons: string[] }> = [];

  for (const pattern of FILLER_PATTERNS) {
    if (optimized.search(pattern) >= 0) {
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

  if (optimized) {
    candidates.push({
      text: optimized,
      reasons: Array.from(reasons)
    });

    candidates.push({
      text: buildCompactPrompt(optimized),
      reasons: [...Array.from(reasons), "Compressed into task-ready brief"]
    });
  }

  const lines = optimized.split("\n").filter(Boolean);
  const taskLine = lines.find((line) => /^(task|goal|objective|build|create|write|analyze)/i.test(line));
  const constraints = lines.filter((line) => /must|should|avoid|include|use|return|format/i.test(line));
  const context = lines.filter((line) => line !== taskLine && !constraints.includes(line));

  if (taskLine || constraints.length > 1) {
    const structured = [
      taskLine ? `Task: ${taskLine.replace(/^task:\s*/i, "")}` : "Task: Complete the requested work.",
      context.length ? `Context:\n${context.map((line) => `- ${line}`).join("\n")}` : "",
      constraints.length ? `Requirements:\n${constraints.map((line) => `- ${line}`).join("\n")}` : "",
      "Output: Provide the final answer directly, with concise reasoning only where useful."
    ]
      .filter(Boolean)
      .join("\n\n");

    candidates.push({
      text: structured,
      reasons: [...Array.from(reasons), "Improved prompt structure"]
    });
  }

  if (cleaned.length !== input.trim().length) {
    reasons.add("Removed repetition and extra whitespace");
  }

  const best = candidates.reduce(
    (currentBest, candidate) =>
      estimateTokens(candidate.text) < estimateTokens(currentBest.text) ? candidate : currentBest,
    { text: input.trim(), reasons: ["Kept original because generated versions were longer"] }
  );

  optimized = best.text;
  const finalReasons =
    estimateTokens(optimized) < originalTokens
      ? Array.from(new Set([...best.reasons, ...Array.from(reasons)]))
      : ["Kept original because generated versions were longer"];

  const optimizedTokens = estimateTokens(optimized);
  const savedTokens = Math.max(0, originalTokens - optimizedTokens);

  return {
    optimized,
    reasons: finalReasons.length
      ? finalReasons
      : ["Kept wording mostly intact because it was already concise"],
    metrics: {
      inputTokens: originalTokens,
      outputTokens: optimizedTokens,
      savedTokens,
      reductionPercentage: originalTokens ? Math.round((savedTokens / originalTokens) * 100) : 0
    }
  };
}

export function downloadTextFile(filename: string, content: string) {
  const type = filename.endsWith(".json") ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8";
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
