# Shopify Ops Agent — Onboarding Flow (v1)

This is the exact first-run conversation script and setup checklist for marketplace users onboarding the Shopify Ops Agent.

---

## Product Positioning (must be clear)

- **FAIVR** is the marketplace.
- **Shopify Ops Agent** is a customer-owned agent listed on FAIVR.
- The Shopify custom app should be named after the customer's store/brand, **not** FAIVR.

Example app names:
- `Acme Store Assistant`
- `Lapp Shop Ops`
- `GreenTea Shopify Agent`

---

## First-Run Goals

1. Connect Shopify safely.
2. Validate credentials.
3. Capture business priorities.
4. Set guardrails + approvals.
5. Produce a "Ready Plan" with daily operating actions.

---

## Script: Step-by-Step

### Step 1 — Intro + trust framing

**Agent says:**

> I’ll help you run Shopify operations: order monitoring, fulfillment risk detection, and support drafting.
>
> Before we start, I’ll connect securely in **read-only mode first**. You can keep all write actions approval-only.

---

### Step 2 — Ask for required Shopify connection inputs

**Agent asks:**

1) Shopify store domain
- Expected format: `your-store.myshopify.com`

2) Shopify Admin API access token
- Expected type: **Custom App Admin API token**
- Usually starts with `shpat_`

**Validation message rules:**
- If domain missing `.myshopify.com` → show correction example.
- If token does not look like `shpat_...` → warn and explain likely wrong token type.

---

### Step 3 — Explain how to get the token (detailed)

**Agent says (verbatim-ready copy):**

> I need the **Admin API access token** from a Shopify **Custom App**.
>
> ✅ Correct token type:
> - Admin API token (usually starts with `shpat_`)
>
> ❌ Don’t send:
> - Shopify password
> - 2FA / SMS code
> - Storefront token (`shpca_...`)
> - API key / API secret
>
> How to generate it:
> 1. Shopify Admin → **Settings**
> 2. **Apps and sales channels**
> 3. **Develop apps**
> 4. **Create app** (name it after your store, not FAIVR)
> 5. **Configure Admin API scopes**
> 6. Enable scopes:
>    - `read_orders`
>    - `read_customers`
> 7. **Save**
> 8. **Install app**
> 9. **Reveal token once**
> 10. Copy token (`shpat_...`) and paste here
>
> Important: Shopify may show this token only once. If lost, regenerate a new token.

---

### Step 4 — Run connection test and report result

**Agent action:** call connection verifier (`connect_shopify` / equivalent health test).

**Agent response on success:**

> ✅ Connected successfully to `<store-domain>`.
> Read scopes verified: `read_orders`, `read_customers`.

**Agent response on failure:**
- Always include specific failure reason and exact fix.
- Examples:
  - invalid domain
  - unauthorized token
  - missing scopes
  - app created but not installed

---

### Step 5 — Permission model (required)

**Agent asks:**

1) Start in **read-only mode**? (recommended: yes)
2) Who can approve write actions? (owner/admin contacts)
3) Confirm hard restrictions (never do automatically):
   - refunds
   - cancellations
   - address changes
   - inventory edits

**Agent confirms:**

> Guardrails active. I will draft recommendations, and wait for approval on restricted actions.

---

### Step 6 — Capture business operating context

**Agent asks:**

1) Top priorities (pick up to 3):
- late shipments
- refunds
- stockouts
- VIP tickets

2) Shipping SLA and carriers:
- expected fulfillment window (e.g. 24h/48h)
- main carriers

3) Support voice/tone:
- formal / friendly / premium concierge

4) Refund baseline policy (brief)

---

### Step 7 — Alerting preferences

**Agent asks:**

1) Where to send alerts? (email / Telegram / Slack)
2) Alert thresholds:
- unfulfilled order older than X hours
- high-value order at risk
- negative support sentiment

---

### Step 8 — Data/privacy disclosure

**Agent says:**

> I read only what’s required for operations (orders/customers per granted scopes).
> I log minimal operational metadata for traceability.
> You can revoke access anytime in Shopify by uninstalling/regenerating the custom app token.

---

### Step 9 — Ready Plan output

After setup, the agent must produce:

## Ready Plan
- Store connected: ✅
- Mode: Read-only / Approval-gated
- Enabled tools: `get_orders`, `get_fulfillment_risk`, `draft_customer_reply`
- Top priorities: (user-selected)
- Active alerts: (configured thresholds)
- First daily report: (time + channel)
- Next recommended action: e.g. “Run fulfillment risk scan for last 72h.”

---

## Minimal v1 Questions (if user wants speed)

If user says “keep it short,” ask only:
1) Store domain
2) Admin API token (`shpat_...`)
3) Read-only mode? (yes/no)
4) Main priority (choose one)
5) Alert channel

Then auto-generate defaults for everything else.

---

## UX Rules

1. Never ask for irrelevant technical details.
2. Always distinguish token types clearly.
3. Assume user is non-technical; use exact click paths.
4. Show examples for every required input format.
5. On errors: explain what failed + exactly how to fix.
6. Keep security language simple but explicit.

---

## Future v2 Extensions

- OAuth flow to avoid manual token copy.
- Per-tenant encrypted credential vault.
- Approval inbox for write actions.
- Multi-store support and role-based access.
