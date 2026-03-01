import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";
import type { AgentData } from "@/components/agent/AgentCard";
import { useMemo } from "react";

type MarketplaceAgent = AgentData & {
  agentSlug?: string;
  greeting?: string;
  inputHint?: string;
  pricing?: { amount: number; currency: string; per: string };
};

const MOCK_AGENTS: MarketplaceAgent[] = [
  {
    id: 1,
    name: "ShopPilot",
    description: "Full-service Shopify setup and optimization agent. Configures themes, products, payments, and shipping — then stays on as your 24/7 store advisor for inventory, SEO, and conversion optimization.",
    rating: 0.0,
    reviews: 0,
    tags: ["E-Commerce", "Support"],
    validated: true,
    isGenesis: true,
    agentSlug: "shoppilot",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "Hey! I'm ShopPilot, your Shopify expert. Tell me about your store and what you need help with — setup, themes, SEO, conversions, product organization — I've got you.",
    inputHint: "Describe your store or ask a Shopify question...",
  },
  {
    id: 2,
    name: "ListingForge",
    description: "Creates optimized product listings for Amazon, eBay, Etsy, and Shopify. Writes compelling copy, suggests pricing strategies, and generates SEO-friendly titles and descriptions from your product photos.",
    rating: 0.0,
    reviews: 0,
    tags: ["E-Commerce", "Marketing"],
    validated: true,
    isGenesis: true,
    agentSlug: "listingforge",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm ListingForge — I write product listings that sell. Give me your product details and I'll craft optimized listings for Amazon, eBay, Etsy, or Shopify.",
    inputHint: "Describe your product (name, features, target audience)...",
  },
  {
    id: 3,
    name: "AdCraft",
    description: "Designs and manages ad campaigns across Meta, Google, and TikTok. Handles audience targeting, A/B testing, budget allocation, and weekly performance reports — all autonomously.",
    rating: 0.0,
    reviews: 0,
    tags: ["Marketing"],
    validated: true,
    isGenesis: true,
    agentSlug: "adcraft",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm AdCraft, your ad strategist. Tell me about your product, audience, and budget — I'll design campaigns that actually convert.",
    inputHint: "Describe your product/service and advertising goals...",
  },
  {
    id: 4,
    name: "ContentEngine",
    description: "Generates blog posts, newsletters, and social media content aligned with your brand voice. Plans editorial calendars, writes SEO-optimized articles, and schedules posts across platforms.",
    rating: 0.0,
    reviews: 0,
    tags: ["Marketing"],
    validated: true,
    isGenesis: true,
    agentSlug: "contentengine",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm ContentEngine — I create content that builds audiences. Blog posts, newsletters, social calendars — tell me what you need and your brand voice.",
    inputHint: "What content do you need? (blog post, newsletter, social calendar...)",
  },
  {
    id: 5,
    name: "InvoiceBot",
    description: "Automates invoicing, payment reminders, and expense tracking. Integrates with Stripe, QuickBooks, and Xero. Chases overdue payments so you don't have to.",
    rating: 0.0,
    reviews: 0,
    tags: ["Finance", "Operations"],
    validated: true,
    isGenesis: true,
    agentSlug: "invoicebot",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm InvoiceBot, your financial ops assistant. I help with invoice templates, payment chase scripts, expense categorization, and financial workflows.",
    inputHint: "What do you need? (invoice template, payment reminder, expense help...)",
  },
  {
    id: 6,
    name: "HireScout",
    description: "Screens resumes, schedules interviews, and ranks candidates based on your criteria. Handles the back-and-forth with applicants and delivers a shortlist ready for your final call.",
    rating: 0.0,
    reviews: 0,
    tags: ["Operations"],
    validated: true,
    isGenesis: true,
    agentSlug: "hirescout",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm HireScout, your HR screening assistant. Share a job description and resumes — I'll rank candidates and suggest interview questions.",
    inputHint: "Paste a job description, resume, or describe what you're hiring for...",
  },
  {
    id: 7,
    name: "SupportHero",
    description: "Customer support agent that learns your product, FAQ, and policies. Handles tickets via email, chat, and social media. Escalates edge cases to humans with full context summaries.",
    rating: 0.0,
    reviews: 0,
    tags: ["Support"],
    validated: true,
    isGenesis: true,
    agentSlug: "supporthero",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm SupportHero — your customer support agent. Give me your product info or knowledge base and I'll help answer customer questions.",
    inputHint: "Paste a customer question, or share your product info for me to learn...",
  },
  {
    id: 8,
    name: "ReviewRadar",
    description: "Monitors and responds to customer reviews across Google, Trustpilot, Yelp, and app stores. Flags negative trends, drafts professional responses, and tracks sentiment over time.",
    rating: 0.0,
    reviews: 0,
    tags: ["Support", "Marketing"],
    validated: false,
    agentSlug: "reviewradar",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm ReviewRadar — I craft professional responses to customer reviews and analyze sentiment. Paste a review and I'll draft the perfect response.",
    inputHint: "Paste a customer review to respond to, or a batch for analysis...",
  },
  {
    id: 9,
    name: "BookKeep",
    description: "Categorizes transactions, reconciles accounts, and prepares monthly financial summaries. Connects to your bank feeds and flags anomalies before they become problems.",
    rating: 0.0,
    reviews: 0,
    tags: ["Finance"],
    validated: true,
    isGenesis: true,
    agentSlug: "bookkeep",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm BookKeep, your bookkeeping analyst. Paste transactions, describe expenses, or ask about financial categorization — I'll organize everything.",
    inputHint: "Paste transactions (CSV or text), or ask a bookkeeping question...",
  },
  {
    id: 10,
    name: "YieldGuard",
    description: "Optimizes DeFi yield strategies across Aave, Morpho, and Compound. Real-time risk monitoring, automated rebalancing, and impermanent loss protection.",
    rating: 0.0,
    reviews: 0,
    tags: ["DeFi", "Finance"],
    validated: true,
    isGenesis: true,
    agentSlug: "yieldguard",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm YieldGuard, your DeFi yield analyst. Tell me about your portfolio, risk tolerance, and goals — I'll analyze opportunities and assess risks.",
    inputHint: "Describe your DeFi portfolio, ask about a protocol, or request yield analysis...",
  },
  {
    id: 11,
    name: "DataPulse",
    description: "Builds custom dashboards and reports from your business data. Connects to Shopify, Stripe, GA4, and databases. Delivers daily insights and anomaly alerts via email or Slack.",
    rating: 0.0,
    reviews: 0,
    tags: ["Data", "Operations"],
    validated: true,
    isGenesis: true,
    agentSlug: "datapulse",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm DataPulse, your data analyst. Share your business data or metrics and I'll extract insights, identify trends, and recommend KPIs.",
    inputHint: "Share your data, metrics, or describe what you want to analyze...",
  },
  {
    id: 12,
    name: "AuditShield",
    description: "Security scanning agent for smart contracts and web applications. Catches vulnerabilities before deployment and provides actionable remediation steps.",
    rating: 0.0,
    reviews: 0,
    tags: ["Security"],
    validated: true,
    isGenesis: true,
    agentSlug: "auditshield",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm AuditShield, your smart contract security auditor. Paste your Solidity code and I'll review it for vulnerabilities, gas optimizations, and best practices.",
    inputHint: "Paste your Solidity code or describe the contract to audit...",
  },
  {
    id: 13,
    name: "SocialPulse",
    description: "Phase-1 Instagram + TikTok copilot. Generates weekly content plans, hooks, scripts, captions, and CTAs designed for reach, engagement, and conversion — in suggestion mode (no auto-posting yet).",
    rating: 0.0,
    reviews: 0,
    tags: ["Marketing", "E-Commerce"],
    validated: true,
    isGenesis: true,
    agentSlug: "socialpulse",
    pricing: { amount: 0, currency: "USDC", per: "task" },
    greeting: "I'm SocialPulse — your Instagram + TikTok growth copilot. Share your product, audience, and goal, and I'll generate your next content sprint.",
    inputHint: "Describe your brand, offer, and this week's content goal...",
  },
];

function parseAgentURI(uri: string, id: number): AgentData | null {
  try {
    const parsed = JSON.parse(uri);
    return {
      id,
      name: parsed.name || `Agent #${id}`,
      description: parsed.description || "",
      rating: 0,
      reviews: 0,
      tags: parsed.category ? [parsed.category] : [],
      validated: false,
      isExample: false,
    };
  } catch {
    return {
      id,
      name: `Agent #${id}`,
      description: uri.slice(0, 200),
      rating: 0,
      reviews: 0,
      tags: [],
      validated: false,
      isExample: false,
    };
  }
}

export function useAgents() {
  const { data: agentCount, isLoading } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  const count = agentCount ? Number(agentCount) : 0;

  const tokenURICalls = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: CONTRACTS.identity,
      abi: IDENTITY_ABI,
      functionName: "tokenURI" as const,
      args: [BigInt(i + 1)] as const,
    }));
  }, [count]);

  const { data: tokenURIs } = useReadContracts({
    contracts: tokenURICalls,
    query: { enabled: count > 0 },
  });

  const agents = useMemo(() => {
    if (count === 0 || !tokenURIs) return [];

    const onChainAgents: AgentData[] = [];
    for (let i = 0; i < tokenURIs.length; i++) {
      const result = tokenURIs[i];
      if (result.status === "success" && typeof result.result === "string") {
        const agent = parseAgentURI(result.result, i + 1);
        if (agent) onChainAgents.push(agent);
      }
    }

    return onChainAgents.length > 0 ? onChainAgents : MOCK_AGENTS;
  }, [count, tokenURIs]);

  return { agents, isLoading, count };
}
