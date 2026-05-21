/**
 * Centralized AI model configuration.
 * All model names and metadata live here — never hardcode model strings elsewhere.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
  isDefault: boolean;
  enabled: boolean;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  // ── Gemini Models ──
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    description: "Fast & efficient — best for high-volume batches",
    isDefault: true,
    enabled: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    description: "Higher quality — best for precision emails",
    isDefault: false,
    enabled: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    description: "Legacy fallback — stable and reliable",
    isDefault: false,
    enabled: true,
  },

  // ── NVIDIA NIM Models ──
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "nvidia",
    description: "Meta's flagship — excellent reasoning and instruction following",
    isDefault: false,
    enabled: true,
  },
  {
    id: "meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    provider: "nvidia",
    description: "Lightweight & fast — great for quick iterations",
    isDefault: false,
    enabled: true,
  },
  {
    id: "meta/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    provider: "nvidia",
    description: "Powerful general-purpose model with strong writing quality",
    isDefault: false,
    enabled: true,
  },
  {
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek R1",
    provider: "nvidia",
    description: "Advanced reasoning model — excels at structured output",
    isDefault: false,
    enabled: true,
  },
  {
    id: "mistralai/mistral-large-2",
    name: "Mistral Large 2",
    provider: "nvidia",
    description: "Mistral's top-tier model — strong multilingual capabilities",
    isDefault: false,
    enabled: true,
  },
  {
    id: "qwen/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    provider: "nvidia",
    description: "Alibaba's flagship — excellent at creative writing tasks",
    isDefault: false,
    enabled: true,
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b",
    name: "Nemotron 3 Nano 30B",
    provider: "nvidia",
    description: "NVIDIA's own model — optimized for enterprise tasks",
    isDefault: false,
    enabled: true,
  },
];

export const SUPPORTED_PROVIDERS = [
  { id: "gemini" as const, name: "Google Gemini", enabled: true },
  { id: "nvidia" as const, name: "NVIDIA NIM", enabled: true },
  { id: "claude" as const, name: "Anthropic Claude", enabled: false },
] as const;

export type ProviderType = "gemini" | "nvidia" | "claude";

export interface ModelPricing {
  inputCostPer1M: number;  // USD cost per 1M input tokens
  outputCostPer1M: number; // USD cost per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": { inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
  "gemini-2.5-pro": { inputCostPer1M: 1.25, outputCostPer1M: 5.00 },
  "gemini-2.0-flash": { inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
  "meta/llama-3.3-70b-instruct": { inputCostPer1M: 0.70, outputCostPer1M: 0.70 },
  "meta/llama-3.1-8b-instruct": { inputCostPer1M: 0.15, outputCostPer1M: 0.15 },
  "meta/llama-3.1-70b-instruct": { inputCostPer1M: 0.70, outputCostPer1M: 0.70 },
  "deepseek-ai/deepseek-r1": { inputCostPer1M: 0.55, outputCostPer1M: 2.19 },
  "mistralai/mistral-large-2": { inputCostPer1M: 2.00, outputCostPer1M: 6.00 },
  "qwen/qwen2.5-72b-instruct": { inputCostPer1M: 0.40, outputCostPer1M: 0.40 },
  "nvidia/nemotron-3-nano-30b-a3b": { inputCostPer1M: 0.15, outputCostPer1M: 0.15 },
};

export const DEFAULT_MODEL = SUPPORTED_MODELS.find((m) => m.isDefault)!;

/** Get models filtered by provider */
export function getModelsByProvider(provider: ProviderType): ModelConfig[] {
  return SUPPORTED_MODELS.filter(
    (m) => m.provider === provider && m.enabled
  );
}

/** Validate that a model ID is supported */
export function isValidModel(modelId: string): boolean {
  return SUPPORTED_MODELS.some((m) => m.id === modelId && m.enabled);
}

/** Get provider for a given model ID */
export function getProviderForModel(modelId: string): ProviderType | null {
  const model = SUPPORTED_MODELS.find((m) => m.id === modelId);
  return model?.provider ?? null;
}
