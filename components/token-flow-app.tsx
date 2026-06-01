"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, FieldLabel, Metric, TextArea } from "@/components/ui";
import { parsePdfToMarkdown } from "@/lib/pdf";
import type { PdfMode, ProviderId, SavedTemplate, TemplateCategory, ToolId, UsagePlanId } from "@/types";
import { cleanContext, downloadTextFile, optimizePrompt } from "@/utils/text";
import {
  analyzeTokenBudget,
  estimateCost,
  estimateTokens,
  formatCurrency,
  MODEL_PRICING,
  PLAN_PRESETS
} from "@/utils/tokenizer";

const tools: Array<{ id: ToolId; title: string; description: string; accent: string }> = [
  {
    id: "optimizer",
    title: "Prompt Optimizer",
    description: "Compress messy prompts into focused, one-shot instructions.",
    accent: "bg-leaf"
  },
  {
    id: "pdf",
    title: "PDF to Markdown",
    description: "Turn PDFs into clean AI-ready Markdown without server parsing.",
    accent: "bg-clay"
  },
  {
    id: "calculator",
    title: "Token Usage Calculator",
    description: "Compare local token estimates and API cost across model families.",
    accent: "bg-ink"
  },
  {
    id: "cleaner",
    title: "Context Cleaner",
    description: "Remove repeated lines, filler, and whitespace from long context.",
    accent: "bg-[#789461]"
  },
  {
    id: "templates",
    title: "Task Vault",
    description: "Save tasks and launch them into work platforms.",
    accent: "bg-[#d69961]"
  }
];

const pdfModes: PdfMode[] = [
  "Study notes",
  "Technical documentation",
  "Meeting notes",
  "Summary",
  "Custom"
];

const templateCategories: TemplateCategory[] = ["Study", "Coding", "Business", "Custom"];
const usagePlans = Object.keys(PLAN_PRESETS) as UsagePlanId[];

const promptExample = `Build a production ready Next.js + Tailwind web app for AI token saving.

It must include:
- Prompt optimizer
- PDF to Markdown converter
- Token usage calculator
- Context cleaner
- Task saving
- Vercel deployment support

Make the UI clean, responsive, and practical.`;

const calculatorExample = `I need to analyze a 20 page PDF, summarize the key points, create study notes, and then ask follow-up questions about confusing sections.`;

const cleanerExample = `Please please summarize this meeting.

Please summarize this meeting.

Action item: update the deployment docs.

Action item: update the deployment docs.

Basically we need to remove duplicate lines and make this context clean.`;

const taskSourceLabels: Record<ToolId, string> = {
  optimizer: "Prompt Optimizer",
  pdf: "PDF Markdown",
  calculator: "Token Calculator",
  cleaner: "Context Cleaner",
  templates: "Task Vault"
};

function useToast() {
  const [message, setMessage] = useState("");

  function show(next: string) {
    setMessage(next);
    window.setTimeout(() => setMessage(""), 2400);
  }

  return { message, show };
}

async function copyText(text: string, onDone: (message: string) => void) {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    onDone("Copied to clipboard");
  } catch {
    onDone("Clipboard permission blocked");
  }
}

function createId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function platformUrl(platform: "github" | "trello" | "todoist" | "email" | "notion", task: SavedTemplate, repo: string) {
  const title = encodeURIComponent(task.title);
  const body = encodeURIComponent(task.content);

  if (platform === "github") {
    const cleanRepo = repo.trim().replace(/^https:\/\/github.com\//, "").replace(/\/$/, "");
    return cleanRepo ? `https://github.com/${cleanRepo}/issues/new?title=${title}&body=${body}` : "";
  }

  if (platform === "trello") {
    return `https://trello.com/add-card?name=${title}&desc=${body}`;
  }

  if (platform === "todoist") {
    return `https://todoist.com/add?content=${title}&description=${body}`;
  }

  if (platform === "email") {
    return `mailto:?subject=${title}&body=${body}`;
  }

  return "https://www.notion.so/new";
}

export function TokenFlowApp() {
  const [activeTool, setActiveTool] = useState<ToolId>("optimizer");
  const [promptInput, setPromptInput] = useState("");
  const [calculatorInput, setCalculatorInput] = useState("");
  const [expectedOutputTokens, setExpectedOutputTokens] = useState(1000);
  const [selectedPlan, setSelectedPlan] = useState<UsagePlanId>("claude-free");
  const [customBudgetTokens, setCustomBudgetTokens] = useState(25000);
  const [cleanerInput, setCleanerInput] = useState("");
  const [pdfMode, setPdfMode] = useState<PdfMode>("Study notes");
  const [pdfMarkdown, setPdfMarkdown] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateDraft, setTemplateDraft] = useState({
    title: "",
    category: "Study" as TemplateCategory,
    content: ""
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [githubRepo, setGithubRepo] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<TemplateCategory | "All">("All");
  const toast = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tokenflow-templates");
      const savedRepo = localStorage.getItem("tokenflow-github-repo");

      if (saved) {
        setTemplates(JSON.parse(saved) as SavedTemplate[]);
      }

      if (savedRepo) {
        setGithubRepo(savedRepo);
      }
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tokenflow-templates", JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem("tokenflow-github-repo", githubRepo);
  }, [githubRepo]);

  const optimization = useMemo(() => optimizePrompt(promptInput), [promptInput]);
  const cleaned = useMemo(() => cleanContext(cleanerInput), [cleanerInput]);
  const selectedPlanPreset = PLAN_PRESETS[selectedPlan];
  const selectedProvider = selectedPlanPreset.provider;
  const planBudgetTokens = selectedPlan === "custom" ? customBudgetTokens : selectedPlanPreset.budgetTokens;
  const selectedInputTokens = useMemo(
    () => estimateTokens(calculatorInput, selectedProvider),
    [calculatorInput, selectedProvider]
  );
  const selectedTotalTokens = selectedInputTokens + expectedOutputTokens;
  const selectedEstimatedCost = estimateCost(selectedInputTokens, expectedOutputTokens, selectedProvider);
  const tokenBudgetAnalysis = analyzeTokenBudget(selectedTotalTokens, planBudgetTokens);
  const calculatorOptimized = useMemo(() => optimizePrompt(calculatorInput), [calculatorInput]);
  const calculatorOptimizedInputTokens = estimateTokens(calculatorOptimized.optimized, selectedProvider);
  const optimizedTaskTokens = calculatorOptimizedInputTokens + expectedOutputTokens;
  const optimizedBudgetAnalysis = analyzeTokenBudget(optimizedTaskTokens, planBudgetTokens);
  const visibleTemplates = useMemo(() => {
    const search = templateSearch.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesFilter = templateFilter === "All" || template.category === templateFilter;
      const matchesSearch =
        !search ||
        template.title.toLowerCase().includes(search) ||
        template.content.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [templateFilter, templateSearch, templates]);

  const calculatorRows = useMemo(() => {
    return (Object.keys(MODEL_PRICING) as ProviderId[]).map((provider) => {
      const inputTokens = estimateTokens(calculatorInput, provider);
      const totalCost = estimateCost(inputTokens, expectedOutputTokens, provider);

      return {
        provider,
        label: MODEL_PRICING[provider].label,
        inputTokens,
        outputTokens: expectedOutputTokens,
        totalCost
      };
    });
  }, [calculatorInput, expectedOutputTokens]);

  async function handlePdf(file?: File) {
    if (!file) {
      return;
    }

    setIsParsingPdf(true);
    try {
      const markdown = await parsePdfToMarkdown(file, pdfMode);
      setPdfMarkdown(markdown);
      toast.show("PDF converted locally");
    } catch {
      toast.show("PDF parsing failed. Try a text-based PDF.");
    } finally {
      setIsParsingPdf(false);
    }
  }

  function saveTemplate() {
    if (!templateDraft.title.trim() || !templateDraft.content.trim()) {
      toast.show("Add a title and prompt content first");
      return;
    }

    const now = new Date().toISOString();

    if (editingTemplateId) {
      setTemplates((current) =>
        current.map((template) =>
          template.id === editingTemplateId
            ? {
                ...template,
                title: templateDraft.title,
                category: templateDraft.category,
                content: templateDraft.content,
                updatedAt: now
              }
            : template
        )
      );
      setEditingTemplateId(null);
      toast.show("Template updated");
    } else {
      setTemplates((current) => [
        {
          id: createId(),
          title: templateDraft.title,
          category: templateDraft.category,
          content: templateDraft.content,
          createdAt: now,
          updatedAt: now
        },
        ...current
      ]);
      toast.show("Task saved locally");
    }

    setTemplateDraft({ title: "", category: "Study", content: "" });
  }

  function saveGeneratedTask(title: string, content: string, sourceTool: ToolId, category: TemplateCategory = "Custom") {
    if (!content.trim()) {
      toast.show("Nothing to save yet");
      return;
    }

    const now = new Date().toISOString();

    setTemplates((current) => [
      {
        id: createId(),
        title,
        category,
        content,
        sourceTool,
        createdAt: now,
        updatedAt: now
      },
      ...current
    ]);
    toast.show("Saved to task vault");
  }

  function editTemplate(template: SavedTemplate) {
    setTemplateDraft({
      title: template.title,
      category: template.category,
      content: template.content
    });
    setEditingTemplateId(template.id);
  }

  function deleteTemplate(id: string) {
    setTemplates((current) => current.filter((template) => template.id !== id));
    toast.show("Task deleted");
  }

  function exportTasks() {
    downloadTextFile("tokenflow-tasks.json", JSON.stringify(templates, null, 2));
  }

  function calculatorReport() {
    return [
      `Plan: ${selectedPlanPreset.label}`,
      `Input tokens: ${selectedInputTokens.toLocaleString()}`,
      `Expected output tokens: ${expectedOutputTokens.toLocaleString()}`,
      `Total task tokens: ${selectedTotalTokens.toLocaleString()}`,
      `Budget used: ${tokenBudgetAnalysis.usagePercentage}%`,
      `Remaining estimate: ${tokenBudgetAnalysis.remainingTokens.toLocaleString()} tokens`,
      `Similar tasks in budget: ${tokenBudgetAnalysis.similarTasks}`,
      `Estimated API cost: ${formatCurrency(selectedEstimatedCost)}`,
      `Status: ${tokenBudgetAnalysis.status}`,
      `Guidance: ${tokenBudgetAnalysis.guidance}`,
      calculatorOptimized.metrics.savedTokens > 0
        ? `After optimizer: ${optimizedTaskTokens.toLocaleString()} task tokens, ${optimizedBudgetAnalysis.usagePercentage}% of budget`
        : "After optimizer: no meaningful token reduction found"
    ].join("\n");
  }

  async function importTasks(file?: File) {
    if (!file) {
      return;
    }

    try {
      const imported = JSON.parse(await file.text()) as SavedTemplate[];
      if (!Array.isArray(imported)) {
        throw new Error("Invalid task file");
      }

      setTemplates((current) => [...imported, ...current]);
      toast.show("Tasks imported");
    } catch {
      toast.show("Import failed. Choose a TokenFlow JSON export.");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="grid-paper fixed inset-0 -z-10 opacity-40" />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:py-8">
        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-72 shrink-0 flex-col justify-between rounded-2xl border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur lg:flex">
          <div>
            <div className="rounded-xl bg-ink p-5 text-cream">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cream/60">TokenFlow</p>
              <h1 className="mt-3 text-3xl font-black leading-tight">Tasks, prompts, and tokens in one place.</h1>
            </div>
            <nav className="mt-5 space-y-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition ${
                    activeTool === tool.id
                      ? "bg-moss text-leaf shadow-inner"
                      : "text-ink/65 hover:bg-cream"
                  }`}
                >
                  <span className="font-extrabold">{tool.title}</span>
                  <span className="mt-1 block text-xs leading-5">{tool.description}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="rounded-xl bg-cream p-4 text-sm text-ink/65">
            Browser-first saves with platform links for GitHub, Trello, Todoist, email, and Notion.
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="mb-6 rounded-2xl border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-leaf">Vercel-ready workspace</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-ink md:text-6xl">
                  Save every AI task and send it where work happens.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/68">
                  Optimize prompts, clean noisy context, estimate model costs, convert PDFs, and move saved tasks into common platforms without backend setup.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Local-first" value="Free" tone="good" />
                <Metric label="Tools" value="5" />
                <Metric label="Connectors" value="5" tone="warm" />
              </div>
            </div>
          </header>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`group rounded-xl border p-4 text-left transition hover:-translate-y-1 hover:shadow-card ${
                  activeTool === tool.id ? "border-leaf bg-white" : "border-white/75 bg-white/55"
                }`}
              >
                <span className={`mb-4 block h-2 w-12 rounded-full ${tool.accent}`} />
                <h3 className="font-extrabold text-ink">{tool.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/58">{tool.description}</p>
              </button>
            ))}
          </div>

          {activeTool === "optimizer" && (
            <Card>
              <ToolHeading
                eyebrow="Phase 2"
                title="Prompt Optimizer"
                description="Paste a task, prompt, or notes. TokenFlow compresses it into a cleaner one-shot prompt and explains what changed."
              />
              <div className="mb-5 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setPromptInput(promptExample)}>
                  Load example
                </Button>
                <Button variant="ghost" onClick={() => setPromptInput("")} disabled={!promptInput}>
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCalculatorInput(optimization.optimized);
                    setActiveTool("calculator");
                  }}
                  disabled={!optimization.optimized}
                >
                  Send to calculator
                </Button>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="space-y-3">
                  <FieldLabel>Original</FieldLabel>
                  <TextArea
                    value={promptInput}
                    onChange={(event) => setPromptInput(event.target.value)}
                    placeholder="Paste your long prompt, rough notes, or task brief..."
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Optimized</FieldLabel>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => copyText(optimization.optimized, toast.show)}>
                        Copy
                      </Button>
                      <Button
                        onClick={() => saveGeneratedTask("Optimized prompt", optimization.optimized, "optimizer", "Coding")}
                        disabled={!optimization.optimized}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  <TextArea value={optimization.optimized} readOnly placeholder="Optimized prompt appears here..." />
                </div>
              </div>
              <MetricsGrid
                values={[
                  ["Input tokens", optimization.metrics.inputTokens],
                  ["Optimized tokens", optimization.metrics.outputTokens ?? 0],
                  ["Saved tokens", optimization.metrics.savedTokens],
                  ["Reduction", `${optimization.metrics.reductionPercentage}%`]
                ]}
              />
              <ReasonList reasons={optimization.reasons} />
            </Card>
          )}

          {activeTool === "pdf" && (
            <Card>
              <ToolHeading
                eyebrow="Phase 3"
                title="PDF to Markdown"
                description="Upload a text-based PDF and convert it in the browser. The markdown is structured for AI context and export."
              />
              <div className="mb-5 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setPdfMarkdown("")} disabled={!pdfMarkdown}>
                  Clear markdown
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCalculatorInput(pdfMarkdown);
                    setActiveTool("calculator");
                  }}
                  disabled={!pdfMarkdown}
                >
                  Send to calculator
                </Button>
              </div>
              <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Mode</FieldLabel>
                    <select
                      className="mt-2 w-full rounded-2xl border border-sand bg-cream p-3 font-semibold"
                      value={pdfMode}
                      onChange={(event) => setPdfMode(event.target.value as PdfMode)}
                    >
                      {pdfModes.map((mode) => (
                        <option key={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-leaf/30 bg-moss/70 p-8 text-center transition hover:border-leaf">
                    <span className="font-display text-3xl font-black text-leaf">Drop or choose PDF</span>
                    <span className="mt-3 text-sm leading-6 text-ink/60">
                      Parsing runs locally to reduce backend cost. Scanned PDFs may need OCR later.
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(event) => handlePdf(event.target.files?.[0])}
                    />
                  </label>
                  {isParsingPdf && <p className="text-sm font-bold text-leaf">Parsing PDF...</p>}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <FieldLabel>Markdown</FieldLabel>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => copyText(pdfMarkdown, toast.show)}>
                        Copy Markdown
                      </Button>
                      <Button
                        onClick={() => downloadTextFile("tokenflow-pdf.md", pdfMarkdown)}
                        disabled={!pdfMarkdown}
                      >
                        Download .md
                      </Button>
                      <Button
                        onClick={() => saveGeneratedTask("PDF markdown", pdfMarkdown, "pdf", "Study")}
                        disabled={!pdfMarkdown}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  <TextArea className="min-h-[32rem] font-mono" value={pdfMarkdown} onChange={(event) => setPdfMarkdown(event.target.value)} />
                </div>
              </div>
            </Card>
          )}

          {activeTool === "calculator" && (
            <Card>
              <ToolHeading
                eyebrow="Phase 4"
                title="Token Usage Calculator"
                description="Choose the plan you are using, estimate token spend, and see whether the task fits a free or paid workflow."
              />
              <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>Task or prompt</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setCalculatorInput(calculatorExample)}>
                        Load example
                      </Button>
                      <Button variant="ghost" onClick={() => setCalculatorInput("")} disabled={!calculatorInput}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  <TextArea
                    value={calculatorInput}
                    onChange={(event) => setCalculatorInput(event.target.value)}
                    placeholder="Paste text to estimate token usage..."
                  />
                </div>
                <div className="space-y-4 rounded-xl bg-cream p-5">
                  <div>
                    <FieldLabel>What are you using?</FieldLabel>
                    <select
                      className="mt-3 w-full rounded-xl border border-sand bg-white p-3 font-bold"
                      value={selectedPlan}
                      onChange={(event) => setSelectedPlan(event.target.value as UsagePlanId)}
                    >
                      {usagePlans.map((plan) => (
                        <option key={plan} value={plan}>
                          {PLAN_PRESETS[plan].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedPlan === "custom" && (
                    <div>
                      <FieldLabel>Custom token budget</FieldLabel>
                      <input
                        type="number"
                        min={1000}
                        className="mt-3 w-full rounded-xl border border-sand bg-white p-3 text-lg font-black"
                        value={customBudgetTokens}
                        onChange={(event) => setCustomBudgetTokens(Number(event.target.value))}
                      />
                    </div>
                  )}
                  <FieldLabel>Expected output tokens</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-sand bg-white p-3 text-lg font-black"
                    value={expectedOutputTokens}
                    onChange={(event) => setExpectedOutputTokens(Number(event.target.value))}
                  />
                  <p className="text-sm leading-6 text-ink/58">
                    {selectedPlanPreset.budgetLabel}. {selectedPlanPreset.note}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() =>
                      saveGeneratedTask(
                        "Token cost estimate",
                        calculatorReport(),
                        "calculator",
                        "Business"
                      )
                    }
                    disabled={!calculatorInput}
                  >
                    Save estimate
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => copyText(calculatorReport(), toast.show)}
                    disabled={!calculatorInput}
                  >
                    Copy full report
                  </Button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Metric label="Task tokens" value={selectedTotalTokens.toLocaleString()} />
                <Metric label="Budget used" value={`${tokenBudgetAnalysis.usagePercentage}%`} tone={tokenBudgetAnalysis.usagePercentage >= 75 ? "warm" : "good"} />
                <Metric label="Remaining" value={tokenBudgetAnalysis.remainingTokens.toLocaleString()} />
                <Metric label="Similar tasks" value={tokenBudgetAnalysis.similarTasks} tone="warm" />
              </div>
              <div className="mt-5 rounded-xl border border-sand bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-clay">{selectedPlanPreset.label}</p>
                    <h3 className="mt-1 text-2xl font-black text-ink">{tokenBudgetAnalysis.status}</h3>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-ink/65">{tokenBudgetAnalysis.guidance}</p>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-cream">
                  <div
                    className={`h-full rounded-full ${
                      tokenBudgetAnalysis.usagePercentage >= 100
                        ? "bg-red-500"
                        : tokenBudgetAnalysis.usagePercentage >= 75
                          ? "bg-clay"
                          : "bg-leaf"
                    }`}
                    style={{ width: `${Math.min(100, tokenBudgetAnalysis.usagePercentage)}%` }}
                  />
                </div>
              </div>
              {calculatorInput && (
                <div className="mt-5 rounded-xl border border-leaf/15 bg-moss p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-leaf">Optimizer preview</p>
                      <p className="mt-2 text-sm leading-6 text-ink/70">
                        Optimizing first would use about{" "}
                        <strong>{optimizedTaskTokens.toLocaleString()}</strong> total tokens and{" "}
                        <strong>{optimizedBudgetAnalysis.usagePercentage}%</strong> of this plan estimate.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setPromptInput(calculatorInput);
                        setActiveTool("optimizer");
                      }}
                    >
                      Open optimizer
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-6 overflow-hidden rounded-xl border border-sand bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-moss text-xs uppercase tracking-[0.16em] text-leaf">
                    <tr>
                      <th className="p-4">Provider</th>
                      <th className="p-4">Input Tokens</th>
                      <th className="p-4">Output Tokens</th>
                      <th className="p-4">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatorRows.map((row) => (
                      <tr key={row.provider} className="border-t border-sand/60">
                        <td className="p-4 font-black">{row.label}</td>
                        <td className="p-4">{row.inputTokens.toLocaleString()}</td>
                        <td className="p-4">{row.outputTokens.toLocaleString()}</td>
                        <td className="p-4 font-black text-leaf">{formatCurrency(row.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTool === "cleaner" && (
            <Card>
              <ToolHeading
                eyebrow="Phase 5"
                title="Context Cleaner"
                description="Remove duplicate lines, repeated prompts, whitespace, and obvious noise before sending context to an AI model."
              />
              <div className="mb-5 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setCleanerInput(cleanerExample)}>
                  Load example
                </Button>
                <Button variant="ghost" onClick={() => setCleanerInput("")} disabled={!cleanerInput}>
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCalculatorInput(cleaned.cleaned);
                    setActiveTool("calculator");
                  }}
                  disabled={!cleaned.cleaned}
                >
                  Send to calculator
                </Button>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <TextArea
                  value={cleanerInput}
                  onChange={(event) => setCleanerInput(event.target.value)}
                  placeholder="Paste messy notes, transcripts, repeated prompt chains, or copied context..."
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Clean Version</FieldLabel>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => copyText(cleaned.cleaned, toast.show)}>
                        Copy
                      </Button>
                      <Button onClick={() => downloadTextFile("tokenflow-cleaned.md", cleaned.cleaned)} disabled={!cleaned.cleaned}>
                        Download
                      </Button>
                      <Button
                        onClick={() => saveGeneratedTask("Cleaned context", cleaned.cleaned, "cleaner", "Custom")}
                        disabled={!cleaned.cleaned}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  <TextArea value={cleaned.cleaned} readOnly />
                </div>
              </div>
              <MetricsGrid
                values={[
                  ["Original", cleaned.originalTokens],
                  ["Cleaned", cleaned.cleanedTokens],
                  ["Saved", cleaned.savedTokens],
                  ["Reduction", `${cleaned.reductionPercentage}%`]
                ]}
              />
            </Card>
          )}

          {activeTool === "templates" && (
            <Card>
              <ToolHeading
                eyebrow="Phase 6"
                title="Task Vault and Connectors"
                description="Save any output as a task, export/import the vault, or launch a saved task into GitHub, Trello, Todoist, email, and Notion."
              />
              <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-4 rounded-xl bg-cream p-5">
                  <FieldLabel>{editingTemplateId ? "Edit Task" : "New Task"}</FieldLabel>
                  <input
                    className="w-full rounded-xl border border-sand bg-white p-3 font-bold"
                    placeholder="Task title"
                    value={templateDraft.title}
                    onChange={(event) => setTemplateDraft({ ...templateDraft, title: event.target.value })}
                  />
                  <select
                    className="w-full rounded-xl border border-sand bg-white p-3 font-bold"
                    value={templateDraft.category}
                    onChange={(event) =>
                      setTemplateDraft({ ...templateDraft, category: event.target.value as TemplateCategory })
                    }
                  >
                    {templateCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                  <TextArea
                    value={templateDraft.content}
                    onChange={(event) => setTemplateDraft({ ...templateDraft, content: event.target.value })}
                    placeholder="Paste task details, prompt, checklist, or context..."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveTemplate}>{editingTemplateId ? "Update Task" : "Save Task"}</Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTemplateDraft({ title: "", category: "Study", content: "" });
                        setEditingTemplateId(null);
                      }}
                      disabled={!templateDraft.title && !templateDraft.content && !editingTemplateId}
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="border-t border-sand pt-4">
                    <FieldLabel>Platform setup</FieldLabel>
                    <input
                      className="mt-3 w-full rounded-xl border border-sand bg-white p-3 font-bold"
                      placeholder="GitHub repo, e.g. owner/repo"
                      value={githubRepo}
                      onChange={(event) => setGithubRepo(event.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={exportTasks} disabled={!templates.length}>
                        Export JSON
                      </Button>
                      <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-moss px-4 py-2 text-sm font-bold text-leaf transition hover:bg-[#e3f0dc]">
                        Import JSON
                        <input
                          type="file"
                          accept="application/json"
                          className="sr-only"
                          onChange={(event) => importTasks(event.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-xl border border-sand/70 bg-white p-4 md:grid-cols-[1fr_12rem]">
                    <input
                      className="w-full rounded-xl border border-sand bg-cream p-3 font-bold"
                      placeholder="Search saved tasks"
                      value={templateSearch}
                      onChange={(event) => setTemplateSearch(event.target.value)}
                    />
                    <select
                      className="w-full rounded-xl border border-sand bg-cream p-3 font-bold"
                      value={templateFilter}
                      onChange={(event) => setTemplateFilter(event.target.value as TemplateCategory | "All")}
                    >
                      <option>All</option>
                      {templateCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  {templates.length === 0 && (
                    <div className="rounded-xl border border-dashed border-sand bg-white/70 p-8 text-center text-ink/58">
                      No saved tasks yet. Save from any tool or create one here.
                    </div>
                  )}
                  {templates.length > 0 && visibleTemplates.length === 0 && (
                    <div className="rounded-xl border border-dashed border-sand bg-white/70 p-8 text-center text-ink/58">
                      No saved tasks match this search.
                    </div>
                  )}
                  {visibleTemplates.map((template) => (
                    <article key={template.id} className="rounded-xl border border-sand/70 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-clay">
                            {template.category}
                            {template.sourceTool ? ` / ${taskSourceLabels[template.sourceTool]}` : ""}
                          </p>
                          <h3 className="mt-1 text-xl font-black text-ink">{template.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => copyText(template.content, toast.show)}>
                            Copy
                          </Button>
                          <Button variant="ghost" onClick={() => editTemplate(template)}>
                            Edit
                          </Button>
                          <Button variant="danger" onClick={() => deleteTemplate(template.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap rounded-xl bg-cream p-4 text-sm leading-6 text-ink/70">
                        {template.content}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(["github", "trello", "todoist", "email", "notion"] as const).map((platform) => {
                          const url = platformUrl(platform, template, githubRepo);
                          const disabled = platform === "github" && !url;

                          return (
                            <a
                              key={platform}
                              href={disabled ? undefined : url}
                              target={platform === "email" ? undefined : "_blank"}
                              rel="noreferrer"
                              onClick={(event) => {
                                if (disabled) {
                                  event.preventDefault();
                                  toast.show("Add a GitHub repo first");
                                }
                              }}
                              className={`inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-bold capitalize transition ${
                                disabled
                                  ? "cursor-not-allowed bg-sand/60 text-ink/40"
                                  : "bg-ink text-cream hover:-translate-y-0.5"
                              }`}
                            >
                              {platform}
                            </a>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </section>
      </div>

      {toast.message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-cream shadow-soft">
          {toast.message}
        </div>
      )}
    </main>
  );
}

function ToolHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-clay">{eyebrow}</p>
      <h2 className="mt-2 font-display text-4xl font-black text-ink">{title}</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-ink/62">{description}</p>
    </div>
  );
}

function MetricsGrid({ values }: { values: Array<[string, string | number]> }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {values.map(([label, value], index) => (
        <Metric key={label} label={label} value={value} tone={index === 2 ? "good" : "neutral"} />
      ))}
    </div>
  );
}

function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <div className="mt-6 rounded-3xl bg-cream p-5">
      <FieldLabel>Why optimization happened</FieldLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <span key={reason} className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink/70">
            {reason}
          </span>
        ))}
      </div>
    </div>
  );
}
