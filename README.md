# Outback Cartel

Outback Cartel is a Bangladesh-focused online storefront built with React, Vite and Three.js. The storefront includes a 3D fashion-showroom experience with a conventional product-shopping fallback.

## Project status

This repository contains both storefront code and development-only backend experiments. The live storefront is hosted on Vercel.

**Important current limitations**
- Checkout currently prepares a WhatsApp order message. Opening WhatsApp does not create or confirm a website order.
- Persistent website orders, customer order tracking, and a secure admin order-management system are not active.
- SSLCommerz is not connected. Cash on delivery is the intended initial payment method.
- Supplier products are filtered through an explicit review/approval list. New supplier products are not automatically published.
- The Cloudflare Worker configuration is a compatibility test, not the production host.
- The Supabase SQL migration is a draft and has not been applied to a live database.

Do not treat browser cart data, browser prices, or a WhatsApp message as a confirmed order.

## Technology

- React 19
- Vite 8
- Three.js, React Three Fiber and Drei
- Vercel serverless API for the supplier product feed
- Optional Cloudflare Worker compatibility test

## Local development

Requirements: Node.js 22 and npm.

```bash
npm ci
npm run dev
```

Create a production build:

```bash
npm run build
```

Run automated tests:

```bash
npm test
```

Run ESLint:

```bash
npm run lint
```

## Supplier product feed

The public product feed is served from `GET /api/products`. Supplier credentials are server-side environment variables and must never be added to browser code or committed to Git.

### Business Koro

- `BUSINESSKORO_API_KEY` — required to enable the supplier.
- `BUSINESSKORO_DOMAIN` — optional domain header, if required by the supplier account.
- `BUSINESSKORO_MARKUP_PERCENT` — optional percentage markup.
- `BUSINESSKORO_MARKUP_FLAT` — optional fixed BDT markup.

### Mohasagor / Dropshipping

- `DROPSHIP_API_KEY` and `DROPSHIP_SECRET_KEY` — both required to enable the supplier.
- `DROPSHIP_MARKUP_PERCENT` and `DROPSHIP_MARKUP_FLAT` — optional price adjustments.
- `DROPSHIP_IMAGE_BASE` — optional base URL for relative image paths.
- `DROPSHIP_CATEGORY_MAP` — optional JSON mapping of supplier categories.
- `DROPSHIP_MAX_PAGES` — optional page limit.
- `DROPSHIP_PRICE_FIELD` — `price` by default, or `sale_price`.
- `DROPSHIP_IN_STOCK_ONLY` — set to `1` to include only explicitly available products.

### Shared feed settings

- `DROPSHIP_MAX_PRODUCTS` — optional maximum number of published products.
- `SUPPLIER_CALL_LIMIT` — optional per-request supplier-call budget.
- `PRODUCTS_DEBUG_TOKEN` — optional random token of at least 16 characters to enable the protected supplier review report.

Supplier debug access uses `GET /api/products?debug=<token>`. Keep the token private. Never paste supplier keys or debug tokens into issues, screenshots, or public messages.

The product approval list and safety hold rules are maintained in `api/_lib/products-core.js`. Review product identity, authenticity, legal status, price and availability before approving a supplier listing. Name-based filters are not a substitute for human review.

## Order and admin architecture

The current checkout is a temporary WhatsApp handoff. The design contract for a future secure order API, database, private tracking and authenticated admin is documented in [docs/orders-admin-architecture.md](docs/orders-admin-architecture.md).

The Supabase migration under `supabase/migrations/` is a draft only. Do not apply it or enable order endpoints until authentication, authorization, rate limiting, transactional writes, privacy controls and the complete order lifecycle have been implemented and tested.

## Cloudflare test

`worker/` and `wrangler.jsonc` are for compatibility experiments only. The configuration uses a stand-in supplier fixture and a test feed-cache namespace. It is not the production deployment and must not be treated as a source of live supplier inventory.

## CI

GitHub Actions runs dependency installation, automated tests and a Vite production build for the configured branches and pull requests targeting `main`.

## Deployment safety

- Work on a development branch and use preview deployments for verification.
- Never commit API keys, database service-role keys, passwords, customer data or debug tokens.
- Do not merge to `main`, change production environment variables, connect a custom domain, or deploy production changes without the owner's explicit approval.
