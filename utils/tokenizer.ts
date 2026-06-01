import type { ProviderId } from "@/types";

const PROVIDER_MULTIPLIER: Record<ProviderId, number> = {
  gpt: 1,
  claude: 0.96,
  gemini: 1.05
};

export const MODEL_PRICING: Record<
  ProviderId,
  { label: string; inputPerMillion: number; outputPerMillion: number }
> = {
  gpt: {
    label: "GPT family",
    inputPerMillion: 2.5,
    outputPerMillion: 10
  },
  claude: {
    label: "Claude family",
    inputPerMillion: 3,
    outputPerMillion: 15
  },
  gemini: {
    label: "Gemini family",
    inputPerMillion: 1.25,
    outputPerMillion: 5
  }
};

export function estimateTokens(text: string, provider: ProviderId = "gpt") {
  if (!text.trim()) {
    return 0;
  }

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();

  const words = normalized.match(/[\p{L}\p{N}_'-]+|[^\s\p{L}\p{N}]/gu) ?? [];
  const baseEstimate = Math.ceil(words.length * 1.28 + normalized.length / 28);

  return Math.max(1, Math.ceil(baseEstimate * PROVIDER_MULTIPLIER[provider]));
}

export function estimateCost(inputTokens: number, outputTokens: number, provider: ProviderId) {
  const pricing = MODEL_PRICING[provider];
  const input = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const output = (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return input + output;
}

export function formatCurrency(value: number) {
  if (value < 0.01) {
    return `$${value.toFixed(5)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4
  }).format(value);
}
