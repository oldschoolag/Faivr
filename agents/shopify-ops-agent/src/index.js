import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

const {
  PORT = '8787',
  AGENT_API_KEY,
  SHOPIFY_STORE,
  SHOPIFY_ADMIN_ACCESS_TOKEN,
} = process.env;

function mask(value) {
  if (!value) return null;
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function requireAuth(c, next) {
  const header = c.req.header('authorization') || '';
  const token = header.replace('Bearer ', '').trim();

  if (!AGENT_API_KEY) {
    return c.json({ error: 'AGENT_API_KEY not configured' }, 500);
  }

  if (token !== AGENT_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
}

async function shopifyGraphQL(query, variables = {}) {
  if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error('Missing SHOPIFY_STORE or SHOPIFY_ADMIN_ACCESS_TOKEN');
  }

  const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();

  if (!response.ok || payload.errors) {
    throw new Error(JSON.stringify(payload.errors || payload));
  }

  return payload.data;
}

app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'shopify-ops-agent',
    store: SHOPIFY_STORE || null,
    authConfigured: Boolean(AGENT_API_KEY),
    shopifyTokenConfigured: Boolean(SHOPIFY_ADMIN_ACCESS_TOKEN),
  });
});

app.get('/manifest', (c) => {
  return c.json({
    name: 'Shopify Ops Agent',
    handle: 'shopify-ops-ben',
    version: '0.1.0',
    description:
      'AI operations agent for Shopify stores: order visibility, fulfillment risk signals, and customer-reply drafting.',
    auth: 'Bearer token',
    tools: [
      {
        name: 'get_orders',
        description: 'List recent orders from Shopify.',
        input: {
          limit: 'number (1-50, default 10)',
          status: "string optional: 'open' | 'closed' | 'cancelled' | 'any'",
        },
      },
      {
        name: 'get_fulfillment_risk',
        description: 'Find likely delayed/unfulfilled orders.',
        input: {
          lookbackDays: 'number (default 3)',
        },
      },
      {
        name: 'draft_customer_reply',
        description: 'Draft support response text based on issue context.',
        input: {
          customerName: 'string',
          issueType: "string e.g. 'delay' | 'refund' | 'address_change'",
          orderName: 'string optional',
          context: 'string optional',
        },
      },
    ],
  });
});

app.post('/tools/get_orders', requireAuth, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(50, Number(body.limit || 10)));
    const status = body.status || 'any';

    const query = `#graphql
      query GetOrders($first: Int!, $query: String!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $query) {
          nodes {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              displayName
              email
            }
          }
        }
      }
    `;

    const search = status === 'any' ? '' : `status:${status}`;
    const data = await shopifyGraphQL(query, { first: limit, query: search });

    return c.json({ ok: true, orders: data.orders.nodes });
  } catch (error) {
    return c.json({ ok: false, error: String(error.message || error) }, 500);
  }
});

app.post('/tools/get_fulfillment_risk', requireAuth, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const lookbackDays = Math.max(1, Math.min(30, Number(body.lookbackDays || 3)));

    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const query = `#graphql
      query RiskOrders($first: Int!, $query: String!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $query) {
          nodes {
            id
            name
            createdAt
            displayFulfillmentStatus
            displayFinancialStatus
            customer {
              displayName
              email
            }
          }
        }
      }
    `;

    const search = `created_at:>=${cutoff} fulfillment_status:unfulfilled financial_status:paid`;
    const data = await shopifyGraphQL(query, { first: 50, query: search });

    const riskyOrders = data.orders.nodes.map((order) => {
      const ageHours = Math.round((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60));
      return {
        ...order,
        riskLevel: ageHours > 72 ? 'high' : ageHours > 24 ? 'medium' : 'low',
        ageHours,
      };
    });

    return c.json({ ok: true, riskyOrders, count: riskyOrders.length });
  } catch (error) {
    return c.json({ ok: false, error: String(error.message || error) }, 500);
  }
});

app.post('/tools/draft_customer_reply', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const customerName = body.customerName || 'there';
  const issueType = body.issueType || 'general';
  const orderName = body.orderName ? ` (${body.orderName})` : '';
  const context = body.context ? `\n\nDetails: ${body.context}` : '';

  const templates = {
    delay: `Hi ${customerName},\n\nThanks for your message about order${orderName}. I checked the current status and we’re actively tracking shipment progress. I’m sorry for the delay — we know that’s frustrating.\n\nWe’ll send you a fresh update within 24 hours, and if the carrier timeline slips further, we’ll offer options immediately.\n\nThanks for your patience,\nSupport Team`,
    refund: `Hi ${customerName},\n\nThanks for reaching out about order${orderName}. I can help with this.\n\nIf you confirm you want to proceed, I’ll trigger the refund workflow right away and share confirmation once it’s processed.\n\nBest,\nSupport Team`,
    address_change: `Hi ${customerName},\n\nThanks for the update on order${orderName}.\n\nIf the parcel has not yet been handed to the carrier, we can still change the shipping address. Please reply with the full corrected address and phone number, and we’ll confirm immediately.\n\nBest,\nSupport Team`,
    general: `Hi ${customerName},\n\nThanks for contacting us about order${orderName}. I’m looking into this now and will come back with a precise update shortly.\n\nBest,\nSupport Team`,
  };

  const draft = (templates[issueType] || templates.general) + context;

  return c.json({
    ok: true,
    issueType,
    draft,
    reviewRequired: true,
  });
});

app.get('/debug/config', (c) => {
  return c.json({
    store: SHOPIFY_STORE || null,
    apiKeyConfigured: Boolean(AGENT_API_KEY),
    apiKeyPreview: mask(AGENT_API_KEY),
    tokenConfigured: Boolean(SHOPIFY_ADMIN_ACCESS_TOKEN),
    tokenPreview: mask(SHOPIFY_ADMIN_ACCESS_TOKEN),
  });
});

serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
  console.log(`Shopify Ops Agent running on http://localhost:${info.port}`);
});
