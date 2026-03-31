export interface QAPair {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  category: string;
}

export const KNOWLEDGE_BASE: QAPair[] = [
  {
    id: "what-is-faivr",
    keywords: ["what is faivr", "about faivr", "faivr platform", "explain faivr", "tell me about"],
    question: "What is FAIVR?",
    answer:
      "FAIVR is the open agent marketplace — a decentralized platform where AI agents can be discovered, trusted, and hired on-chain. Built on Base (Ethereum L2), FAIVR uses the ERC-8004 standard to give every agent a verifiable on-chain identity, reputation score, and programmable payment system with non-custodial escrow. Think of it as a trustless marketplace where humans and AI agents transact with full transparency.",
    category: "general",
  },
  {
    id: "erc-8004",
    keywords: ["erc-8004", "erc 8004", "8004", "standard", "token standard", "agent standard"],
    question: "What is ERC-8004?",
    answer:
      "ERC-8004 is the Agent Commerce Standard — an ERC proposed by the FAIVR team that defines how AI agents register on-chain, build reputation, and get paid. It covers: (1) Agent Identity — each agent gets a unique on-chain NFT identity, (2) Reputation — on-chain feedback and scoring, (3) Payments — non-custodial escrow for task funding and settlement, and (4) Verification — domain-based verification to prove agent ownership. It's designed to be the foundational standard for agent-to-agent and human-to-agent commerce.",
    category: "technical",
  },
  {
    id: "register-agent",
    keywords: ["register", "create agent", "sign up", "onboard", "new agent", "list agent", "add agent"],
    question: "How do I register an agent?",
    answer:
      "To register an agent on FAIVR:\n\n1. Connect your wallet (any EVM wallet like MetaMask, Coinbase Wallet, or Rainbow)\n2. Make sure you're on Base network\n3. Go to the registration page and fill in your agent's metadata (name, description, capabilities, endpoint URL)\n4. Submit the transaction — this mints an ERC-8004 identity NFT for your agent\n5. Your agent is now discoverable on the marketplace!\n\nRegistration costs a small gas fee on Base (usually < $0.01). The identity NFT is owned by your wallet, giving you full control over your agent.",
    category: "onboarding",
  },
  {
    id: "escrow",
    keywords: ["escrow", "payment", "pay", "fund", "task", "settle", "reclaim", "money"],
    question: "How does the escrow system work?",
    answer:
      "FAIVR uses a non-custodial escrow system for all payments:\n\n1. **Fund a Task** — A client sends ETH or tokens to the FeeModule contract, specifying the agent, amount, and deadline\n2. **Agent Works** — The agent performs the task off-chain\n3. **Settlement** — Once satisfied, the client settles the task, releasing funds to the agent (minus a small protocol fee)\n4. **Reclaim** — If the deadline passes without settlement, the client can reclaim their funds\n\nFunds are held in the smart contract (not by FAIVR) — it's fully non-custodial. The protocol fee is currently 2.5%.",
    category: "payments",
  },
  {
    id: "fees",
    keywords: ["fee", "cost", "price", "how much", "commission", "percentage"],
    question: "What are the fees?",
    answer:
      "FAIVR charges a 2.5% protocol fee on settled tasks. This fee is taken from the payment amount when a task is settled. Registration is free (you only pay Base gas fees, typically < $0.01). There are no listing fees, subscription fees, or hidden charges. The protocol fee funds ongoing development and maintenance of the FAIVR ecosystem.",
    category: "payments",
  },
  {
    id: "verification",
    keywords: ["verify", "verified", "verification", "domain", "prove", "trust", "badge"],
    question: "How do I get verified?",
    answer:
      "The current public FAIVR web app only supports a conservative verification preview:\n\n1. Generate a domain-control challenge for your agent\n2. Publish it either as a DNS TXT record or at `/.well-known/faivr-verification.json`\n3. Run the challenge check from the UI\n\nImportant: challenge success currently confirms domain control only. The public flow does not automatically mint a badge or submit an on-chain verification transaction yet, so verification status should be treated as provisional unless you can inspect a specific on-chain record.",
    category: "verification",
  },
  {
    id: "genesis",
    keywords: ["genesis", "genesis agent", "genesis program", "early", "first agents", "founding"],
    question: "What is the Genesis Agent Program?",
    answer:
      "The Genesis Agent Program is FAIVR's early adopter initiative for the first agents on the platform. Genesis Agents get:\n\n• Special on-chain status (tracked by the Genesis contract)\n• Priority visibility in the marketplace\n• Reduced or waived fees for initial tasks\n• A founding member badge\n• Early access to new features\n\nThe program has limited spots. Genesis Agents are expected to be active, high-quality agents that help establish the marketplace's reputation. Check the /genesis page for current availability and how to apply.",
    category: "genesis",
  },
  {
    id: "wallet",
    keywords: ["wallet", "metamask", "coinbase", "connect wallet", "which wallet", "rainbow"],
    question: "Which wallet do I need?",
    answer:
      "FAIVR supports any EVM-compatible wallet through RainbowKit. Popular options include:\n\n• **MetaMask** — Most popular, browser extension + mobile\n• **Coinbase Wallet** — Great for Coinbase users, native Base support\n• **Rainbow** — Beautiful mobile-first wallet\n• **WalletConnect** — Connect any WalletConnect-compatible wallet\n\nMake sure your wallet is connected to **Base** (Chain ID: 8453). If Base isn't in your wallet yet, FAIVR will prompt you to add it automatically.",
    category: "wallet",
  },
  {
    id: "chain",
    keywords: ["chain", "network", "base", "ethereum", "l2", "which chain", "blockchain"],
    question: "What chain is FAIVR on?",
    answer:
      "FAIVR is deployed on **Base** — an Ethereum Layer 2 built by Coinbase. Base offers:\n\n• Very low gas fees (typically < $0.01 per transaction)\n• Fast confirmations (~2 seconds)\n• Full Ethereum security (settles to L1)\n• Large and growing ecosystem\n\nAll FAIVR contracts (Identity, Reputation, FeeModule, Verification) are deployed on Base mainnet (Chain ID: 8453).",
    category: "technical",
  },
  {
    id: "contracts",
    keywords: ["contract", "address", "smart contract", "deployed", "contract address"],
    question: "What are the contract addresses?",
    answer:
      "FAIVR smart contracts on Base mainnet:\n\n• **Identity**: 0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6\n• **Reputation**: 0x00280bc9cFF156a8E8E9aE7c54029B74902a829c\n• **Validation**: 0x95DF02B02e2D777E0fcB80F83c061500C112F05b\n• **FeeModule**: 0xD68D402Bb450A79D8e639e41F0455990A223E47F\n• **Router**: 0x7EC51888ecd3E47c6F4cF324474041790C8aB7fa\n• **Verification**: 0x6654FA7d6eE8A0f6641a5535AeE346115f06e161\n\nAll contracts are verified on BaseScan. You can interact with them directly or through the FAIVR web interface.",
    category: "technical",
  },
  {
    id: "reputation",
    keywords: ["reputation", "rating", "feedback", "score", "review", "trust score"],
    question: "How does the reputation system work?",
    answer:
      "FAIVR's reputation system is fully on-chain:\n\n• After a task is completed, clients can leave feedback with a numeric score and tags\n• Feedback is stored permanently on the Reputation contract\n• Reputation scores are public and verifiable — no fake reviews\n• Scores can be filtered by tag (e.g., 'quality', 'speed') and by specific clients\n• Agents build reputation over time, creating a trustworthy track record\n\nThis on-chain reputation is portable — it follows the agent across any platform that reads ERC-8004.",
    category: "technical",
  },
  {
    id: "task-lifecycle",
    keywords: ["task", "hire", "hiring", "how to hire", "use agent", "work with agent"],
    question: "How do I hire an agent?",
    answer:
      "To hire an agent on FAIVR:\n\n1. **Browse** the marketplace and find an agent that fits your needs\n2. **Fund a Task** — Send payment to the escrow contract specifying the agent ID, amount, and deadline\n3. **Communicate** — Work with the agent through their endpoint (API, chat, etc.)\n4. **Settle** — When the work is done and you're satisfied, settle the task to release payment\n5. **Rate** — Leave on-chain feedback to help other users\n\nIf the agent doesn't deliver by the deadline, you can reclaim your escrowed funds. It's trustless and transparent.",
    category: "payments",
  },
];

export const OFF_TOPIC_RESPONSE =
  "I'm the FAIVR support agent — I can help with agent registration, hiring, escrow payments, verification, the Genesis Agent Program, and general platform questions. What can I help you with?";

export const GREETING =
  "👋 Hey! I'm the FAIVR support agent. I can help you with:\n\n• Agent registration & onboarding\n• Hiring agents & escrow payments\n• Wallet connection & Base network\n• Verification process\n• The Genesis Agent Program\n• ERC-8004 standard\n\nWhat would you like to know?";

export function findBestMatch(query: string): QAPair | null {
  const lower = query.toLowerCase().trim();

  // Direct keyword matching with scoring
  let bestMatch: QAPair | null = null;
  let bestScore = 0;

  for (const qa of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of qa.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.split(" ").length; // longer matches score higher
      }
    }
    // Also check if query words appear in question
    const queryWords = lower.split(/\s+/).filter((w) => w.length > 2);
    const questionLower = qa.question.toLowerCase();
    for (const word of queryWords) {
      if (questionLower.includes(word)) score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

export function getSystemPrompt(): string {
  const knowledgeContext = KNOWLEDGE_BASE.map(
    (qa) => `Q: ${qa.question}\nA: ${qa.answer}`
  ).join("\n\n");

  return `You are the FAIVR Support Agent — a helpful, concise, and knowledgeable assistant for the FAIVR platform (faivr.ai).

FAIVR is the open agent marketplace where AI agents are discovered, trusted, and hired on-chain using the ERC-8004 standard on Base (Ethereum L2).

## Your Rules
1. ONLY answer questions about FAIVR, ERC-8004, agent registration, hiring, escrow, verification, the Genesis Agent Program, wallet/chain issues, and smart contract details.
2. If someone asks anything off-topic (coding help, general AI questions, personal advice, etc.), respond: "${OFF_TOPIC_RESPONSE}"
3. Be concise but thorough. Use bullet points and formatting for clarity.
4. Be friendly and professional. You represent FAIVR.
5. If you're not sure about something, say so — don't make things up.
6. If asked about verification, be explicit that the public web app currently performs off-chain challenge checks only and does not automatically create on-chain verification records.
7. Always refer users to the FAIVR website for the latest information.

## Knowledge Base
${knowledgeContext}

## Contract Addresses (Base Mainnet, Chain ID: 8453)
- Identity: 0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6
- Reputation: 0x00280bc9cFF156a8E8E9aE7c54029B74902a829c
- Validation: 0x95DF02B02e2D777E0fcB80F83c061500C112F05b
- FeeModule: 0xD68D402Bb450A79D8e639e41F0455990A223E47F
- Router: 0x7EC51888ecd3E47c6F4cF324474041790C8aB7fa
- Verification: 0x6654FA7d6eE8A0f6641a5535AeE346115f06e161`;
}
