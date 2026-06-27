export type ToolId =
  | "optimizer"
  | "pdf"
  | "calculator"
  | "cleaner"
  | "templates";

export type ProviderId = "gpt" | "claude" | "gemini";

export type UsagePlanId =
  | "chatgpt-free"
  | "chatgpt-plus"
  | "claude-free"
  | "claude-pro"
  | "gemini-free"
  | "api-paid"
  | "custom";

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
  tags: string[];
  content: string;
  sourceTool?: ToolId;
  createdAt: string;
  updatedAt: string;
};

export type PdfMode =
  | "Study notes"
  | "Technical documentation"
  | "Meeting notes"
  | "Summary"
  | "Custom";
