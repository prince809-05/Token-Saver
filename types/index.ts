export type ToolId =
  | "optimizer"
  | "pdf"
  | "calculator"
  | "cleaner"
  | "templates";

export type ProviderId = "gpt" | "claude" | "gemini";

export type TokenMetrics = {
  inputTokens: number;
  outputTokens?: number;
  savedTokens: number;
  reductionPercentage: number;
};

export type OptimizationResult = {
  optimized: string;
  reasons: string[];
  metrics: TokenMetrics;
};

export type TemplateCategory = "Study" | "Coding" | "Business" | "Custom";

export type SavedTemplate = {
  id: string;
  title: string;
  category: TemplateCategory;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PdfMode =
  | "Study notes"
  | "Technical documentation"
  | "Meeting notes"
  | "Summary"
  | "Custom";
