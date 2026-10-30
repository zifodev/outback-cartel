# Orders and admin: production implementation contract

Status: design only. No persistent orders, customer tracking, or authenticated admin have been deployed.

## Current behaviour
- Checkout prepares a WhatsApp message; the customer must send it, and staff must confirm it.
- Browser-side prices, shipping charges, product IDs, and totals are untrusted.
- The existing account/OTP UI is not a secure server-side admin identity system.
- Supplier product availability and variants must be checked at confirmation time.

## Minimum viable architecture
Use a server-side API backed by a managed database and a managed identity provider. Stay within a free tier until owner approves a paid service. Do not place service-role credentials in Vite `VITE_*` variables, browser code, or the repository.

### Orders API
- `POST /api/orders`: validate request schema, quantity (1–99), product IDs, variant selections, contact fields and consent. Require one valid `Idempotency-Key` request header; scope its uniqueness to the authenticated customer or a server-verified guest checkout session, store a SHA-256 scope hash and request fingerprint alongside the key, and persist the fingerprint plus resulting order in the same transaction. Do not derive the guest scope from a caller-controlled header or customer phone number. Reuse of the same key with the same payload must return the original safe response; reuse with a different payload must return a conflict. The key parser alone does not implement idempotency. The server should hash a server-verified customer ID or guest-session identifier for the idempotency scope (the current helper rejects missing/short/oversized identifiers), fingerprint the validated, normalized request (the current helper canonicalizes object-key order and hashes the JSON with SHA-256), and compare that fingerprint when a key is reused; it does not store keys, serialize concurrent requests, or implement replay responses by itself. Apply request-size limits and rate limiting. Resolve prices and availability server-side from an approved, cached catalogue; never trust the browser total or shipping charge. Save a pending order with a random, non-sequential public reference. Return only reference and safe status.
- `GET /api/orders/:reference`: never disclose personal data based on reference alone. Require a signed, expiring customer access token or verified customer identity. Return only allowed status fields.
- `PATCH /api/admin/orders/:id`: require a server-verified admin session and role check. In the same database transaction, set transaction-local `app.actor_id` to the verified identity before updating status; the database trigger rejects missing actors and invalid transitions and appends the audit event atomically. Never accept the actor ID from the request body.

**Important trust boundary:** `app.actor_id` is only transaction context supplied by the caller; PostgreSQL does not authenticate that value. The trigger's non-empty check prevents accidental unattributed updates, but it does not prove that the actor is an admin. The API must verify the session/token and active admin role on every request before opening the privileged database operation, derive the actor ID from that verified identity, and set it with `SET LOCAL` inside the same transaction. Never expose the database service-role key, allow browser clients to connect with a privileged role, or copy an actor ID from request input. If any other service can use the privileged database credential, it must enforce the same authorization contract.

### Suggested tables
- `products`: stable internal ID, supplier ID, name, category, approved state, price in BDT minor units, image, last_sync_at.
- `variants`: product ID, SKU, size, colour, availability state, last_verified_at.
- `orders`: internal UUID, unique random public reference, customer contact/address fields, consent timestamp, status, subtotal, delivery zone, delivery fee, total, currency, created/updated timestamps.
- `order_items`: order ID, product ID, SKU/selected variant, immutable product title and unit-price snapshot, quantity, line total.
- `order_events`: order ID, actor ID/type, previous/new status, timestamp, safe event metadata. The draft schema blocks ordinary UPDATE/DELETE operations with an append-only trigger; database owners can still alter triggers, so restrict database ownership and treat this as tamper-resistance rather than absolute immutability.
- `admin_members`: identity-provider user ID, role, active state.

### State machine
`pending_review -> confirmed -> processing -> dispatched -> delivered`.
Allow `pending_review -> cancelled` and `confirmed -> cancelled` only under a documented policy. Refunds and returns need separate explicit workflows. Do not claim an order is confirmed merely because a WhatsApp link opened.

### Access and privacy
- Verify auth tokens on the server, and enforce authorization per endpoint.
- Deny by default; no public list endpoint for orders or customer records.
- Never expose supplier API keys or database service credentials to the client.
- Restrict CORS, protect against CSRF where cookie sessions are used, add input validation, rate limiting and audit logs.
- Keep PII out of analytics, logs and public URLs. Establish a retention/deletion policy before launch.
- Use transactionally consistent order and order-item inserts. Idempotency keys prevent duplicate orders from retries.
- Store delivery/return policies as verified owner-approved content, not hardcoded promises.

## Launch gates
1. Select and configure database/auth provider and secret storage.
2. Implement and test server-side pricing, shipping and variant validation.
3. Verify rate limiting, admin role enforcement, private tracking and duplicate-order handling.
4. Test a full order lifecycle with synthetic customer data.
5. Review Bangladesh consumer/privacy requirements and supplier fulfilment rules.
6. Deploy to preview, verify CI and manual flows, then explicitly approve production rollout.

Until these gates pass, keep the WhatsApp flow clearly labelled as temporary and do not enable the old browser-password admin.
