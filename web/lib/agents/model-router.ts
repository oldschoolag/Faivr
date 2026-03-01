export type ModelTier = "simple" | "medium" | "complex";

const MODEL_MAP: Record<ModelTier, string> = {
  simple: "anthropic/claude-haiku-4-5-20251001",
  medium: "anthropic/claude-sonnet-4-20250514",
  complex: "anthropic/claude-sonnet-4-20250514",
};

const MAX_TOKENS_MAP: Record<ModelTier, number> = {
  simple: 2048,
  medium: 4096,
  complex: 8192,
};

export function getModel(tier: ModelTier): string {
  return MODEL_MAP[tier];
}

export function getMaxTokens(tier: ModelTier): number {
  return MAX_TOKENS_MAP[tier];
}
