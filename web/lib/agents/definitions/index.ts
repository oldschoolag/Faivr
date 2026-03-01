import type { ModelTier } from "../model-router";

export interface AgentDefinition {
  id: string;
  name: string;
  tier: ModelTier;
  priceCentsUSDC: number;
  greeting: string;
  systemPrompt: string;
  inputHint: string;
}

import { shoppilot } from "./shoppilot";
import { listingforge } from "./listingforge";
import { adcraft } from "./adcraft";
import { contentengine } from "./contentengine";
import { invoicebot } from "./invoicebot";
import { hirescout } from "./hirescout";
import { supporthero } from "./supporthero";
import { reviewradar } from "./reviewradar";
import { bookkeep } from "./bookkeep";
import { datapulse } from "./datapulse";
import { yieldguard } from "./yieldguard";
import { auditshield } from "./auditshield";
import { socialpulse } from "./socialpulse";

export const AGENT_DEFINITIONS: Record<string, AgentDefinition> = {
  shoppilot,
  listingforge,
  adcraft,
  contentengine,
  invoicebot,
  hirescout,
  supporthero,
  reviewradar,
  bookkeep,
  datapulse,
  yieldguard,
  auditshield,
  socialpulse,
};

export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS[id.toLowerCase()];
}

export function getAllAgents(): AgentDefinition[] {
  return Object.values(AGENT_DEFINITIONS);
}
