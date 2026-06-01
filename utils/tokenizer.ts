import type { ProviderId, UsagePlanId } from "@/types";

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

export const PLAN_PRESETS: Record<
  UsagePlanId,
  {
    label: string;
    provider: ProviderId;
    budgetTokens: number;
    budgetLabel: string;
    note: string;
  }
> = {
  "chatgpt-free": {
    label: "ChatGPT Free",
    provider: "gpt",
    budgetTokens: 12000,
    budgetLabel: "Approx. 12K usable tokens per heavy task window",
    note: "Free chat limits are dynamic, so this is a planning estimate rather than a guaranteed allowance."
  },
  "chatgpt-plus": {
    label: "ChatGPT Plus / Team",
    provider: "gpt",
    budgetTokens: 32000,
    budgetLabel: "Approx. 32K usable tokens per task",
    note: "Good for longer prompts, files, and multi-step work, but model-specific caps still apply."
  },
  "claude-free": {
    label: "Claude Free",
    provider: "claude",
    budgetTokens: 10000,
    budgetLabel: "Approx. 10K usable tokens before limits feel tight",
    note: "Claude free message limits vary with demand and prompt size, so keep large tasks compact."
  },
  "claude-pro": {
    label: "Claude Pro / Team",
    provider: "claude",
    budgetTokens: 50000,
    budgetLabel: "Approx. 50K usable tokens per serious task",
    note: "Better for larger docs and code context, though usage caps still reset on provider schedules."
  },
  "gemini-free": {
    label: "Gemini Free",
    provider: "gemini",
    budgetTokens: 16000,
    budgetLabel: "Approx. 16K usable tokens per task",
    note: "Useful for general work; exact limits depend on model and current account rules."
  },
  "api-paid": {
    label: "API / Paid by usage",
    provider: "gpt",
    budgetTokens: 128000,
    budgetLabel: "Approx. 128K context planning budget",
    note: "API work is usually constrained by model context and cost instead of free message limits."
  },
  custom: {
    label: "Custom budget",
    provider: "gpt",
    budgetTokens: 25000,
    budgetLabel: "Your custom token budget",
    note: "Set the token budget to match your model, plan, or team rule."
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

export function analyzeTokenBudget(totalTokens: number, budgetTokens: number) {
  const safeBudget = Math.max(1, budgetTokens);
  const usagePercentage = Math.round((totalTokens / safeBudget) * 100);
  const remainingTokens = Math.max(0, safeBudget - totalTokens);
  const similarTasks = totalTokens > 0 ? Math.floor(safeBudget / totalTokens) : 0;

  let status = "Comfortable";
  let guidance = "This should fit comfortably in the selected plan estimate.";

  if (usagePercentage >= 100) {
    status = "Over budget";
    guidance = "Reduce context, split the task, or use a higher-capacity plan/model.";
  } else if (usagePercentage >= 75) {
    status = "Tight";
    guidance = "This may work, but there is little room for follow-up messages or large outputs.";
  } else if (usagePercentage >= 45) {
    status = "Moderate";
    guidance = "This should work, with some room left for revisions and follow-up prompts.";
  }

  return {
    usagePercentage,
    remainingTokens,
    similarTasks,
    status,
    guidance
  };
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
