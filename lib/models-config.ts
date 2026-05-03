/**
 * Centralized AI model configuration.
 * All model names and metadata live here — never hardcode model strings elsewhere.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: "gemini" | "nvidia" | "claude";
  description: string;
  isDefault: boolean;
  enabled: boolean;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
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
];

export const SUPPORTED_PROVIDERS = [
  { id: "gemini" as const, name: "Google Gemini", enabled: true },
  { id: "nvidia" as const, name: "NVIDIA NIM", enabled: false },
  { id: "claude" as const, name: "Anthropic Claude", enabled: false },
] as const;

export type ProviderType = (typeof SUPPORTED_PROVIDERS)[number]["id"];

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
