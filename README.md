# Outback Cartel

Outback Cartel is a Bangladesh-focused online storefront built with React, Vite and Three.js. The storefront includes a 3D fashion-showroom experience with a conventional product-shopping fallback.

## Project status

This repository contains both storefront code and development-only backend experiments. The live storefront is hosted on Vercel.

**Important current limitations**
- Checkout currently prepares a WhatsApp order message. Opening WhatsApp does not create or confirm a website order.
- Persistent website orders are stored in Supabase. A minimal admin panel is available at /admin.
- Cash on delivery is the only active payment method.
- Supplier products are filtered through an explicit review/approval list. New supplier products are not automatically published.
- The Cloudflare Worker configuration is a compatibility test, not the production host.
- The Supabase SQL migration has been applied to the hosted database.

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

(Mohasagor / dropshipping.com.bd was removed as a supplier — that account's API key stopped working and is no longer in use.)

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

## Admin authentication

The admin panel at `/admin` uses Supabase email OTP and an explicit server-side email allowlist. It does not use a shared admin password or browser storage for credentials.

Configure these Vercel environment variables for the relevant preview/production environments:
- `ADMIN_EMAILS` — comma-separated list of authorised admin email addresses. Only existing Supabase Auth users on this list can sign in.
- `SUPABASE_ANON_KEY` — the project's publishable/anon key used by the server-side Auth OTP endpoints (not the service-role key).
- `SUPABASE_URL` — optional; defaults to this project's URL.

The admin API verifies the HttpOnly session cookie against Supabase Auth on every request. The cookie is Secure on HTTPS, HttpOnly, SameSite=Strict and scoped to `/api/admin`. It contains only the short-lived access token; the refresh token is never placed in browser storage. Admins must request a new email code after the access token expires. Order status audit events use the verified admin email, never a client-supplied actor ID.

Before enabling this on a deployment, add the intended admin email(s) to `ADMIN_EMAILS` and ensure those accounts already exist in Supabase Auth. Configure the Supabase Magic Link/OTP email template to send the six-digit `{{ .Token }}` code.

## Deployment safety

- Work on a development branch and use preview deployments for verification.
- Never commit API keys, database service-role keys, passwords, customer data or debug tokens.
- Do not merge to `main`, change production environment variables, connect a custom domain, or deploy production changes without the owner's explicit approval.
