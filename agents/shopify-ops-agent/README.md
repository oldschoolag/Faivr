# Shopify Ops Agent (v1)

MVP agent service for FAIVR onboarding.

## Capabilities (v1)
- `get_orders` (read)
- `get_fulfillment_risk` (read + heuristic)
- `draft_customer_reply` (draft only, human review required)

## Quick Start

```bash
cd agents/shopify-ops-agent
cp .env.example .env
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:8787/health
```

## Auth
All tool endpoints require:

`Authorization: Bearer <AGENT_API_KEY>`

## Example calls

```bash
curl -X POST http://localhost:8787/tools/get_orders \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

```bash
curl -X POST http://localhost:8787/tools/get_fulfillment_risk \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 3}'
```

```bash
curl -X POST http://localhost:8787/tools/draft_customer_reply \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Mia","issueType":"delay","orderName":"#1001"}'
```

## Required Shopify scopes
- `read_orders`
- `read_customers`

(Write scopes intentionally not needed for v1 safety.)
