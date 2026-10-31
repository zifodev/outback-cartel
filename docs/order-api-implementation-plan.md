# Order API implementation plan

Status: plan only — no database, auth provider, or service-role credentials are configured.

## What exists today

| Layer | Status |
|-------|--------|
| **Order validation** (`order-validation.js`) | Complete. Validates cart, customer, delivery zone. Resolves trusted prices from a `Map` catalogue. |
| **Idempotency helpers** (`order-security.js`) | Complete. Generates references, tokens, fingerprints. Classifies replays vs conflicts. No persistence. |
| **Status machine** (`order-status.js`) | Complete. Pure transition rules. |
| **SQL schema** (`202610310001_orders_schema.sql`) | Clean draft. All tables, triggers, RLS, constraints. Not applied. |
| **Products feed** (`products-core.js`, `products.js`) | Live on both Vercel and CF Worker. Returns approved products with trusted prices. |
| **Frontend checkout** | WhatsApp link only. No API call. |
| **Database** | None configured. No Supabase project, no connection string, no service-role key. |
| **Auth provider** | None. No admin identity system. |
| **Order API endpoint** | Does not exist. |

## Implementation phases

### Phase 1: Validation-only endpoint (safe to build now)

Create `api/orders.js` as a Vercel serverless function that:

1. Accepts `POST /api/orders` only (reject other methods with 405).
2. Reads and validates the `Idempotency-Key` header via `readIdempotencyKey()`.
3. Validates the request body via `validateOrderPayload()`.
4. Fetches the current approved product catalogue from the products feed (internal call to `productsResponse()`).
5. Resolves trusted prices via `priceValidatedOrder()`.
6. Generates order identifiers via `createOrderIdentifiers()`.
7. Computes the request fingerprint via `hashOrderRequest()`.
8. Returns a structured response with:
   - `status: "accepted_for_review"` (honest — no persistence yet)
   - `publicReference` (the generated OC-... reference)
   - `totalBdt`, `deliveryBdt`, `subtotalBdt` (server-computed)
   - `itemCount`
   - A clear `notice` field: "Order validation succeeded. Persistence is not yet configured — this order has not been saved."

This endpoint does NOT:
- Persist anything (no database).
- Claim the order is confirmed or tracked.
- Return a lookup token (no point without storage).
- Accept guest session identifiers (no server-side session system).

**Value**: Proves the full validation pipeline end-to-end. Lets the frontend be developed against a real API shape. Catches pricing, variant, and constraint bugs before a database is connected.

### Phase 2: Database connection (requires owner action)

Prerequisites the owner must complete:
1. Create a Supabase project (or equivalent managed PostgreSQL).
2. Run the migration (`202610310001_orders_schema.sql`) after final review.
3. Add the service-role key as a Vercel environment variable (not `VITE_*`).
4. Add the database connection URL as a Vercel environment variable.

Once configured, the endpoint gains:
- Atomic order creation in a single transaction.
- Idempotency key persistence with scope hashing.
- Replay detection (same key + same fingerprint → return original).
- Conflict detection (same key + different fingerprint → 409).
- Lookup token hash storage for customer order retrieval.
- Proper `201 Created` responses with the lookup token.

### Phase 3: Authentication and admin (requires owner action)

Prerequisites:
1. Select an auth provider (Supabase Auth, Clerk, Auth.js, etc.).
2. Configure admin roles and session management.
3. Set up `app.actor_id` derivation from verified admin identity.

Once configured:
- `GET /api/orders/:reference` with customer access tokens.
- `PATCH /api/admin/orders/:id` with admin session verification.
- Status transitions through the database trigger.
- Full audit trail via `oc_order_events`.

### Phase 4: Frontend integration

Once Phase 2 is live:
1. Replace WhatsApp checkout with a real `POST /api/orders` call.
2. Show the `publicReference` as the order confirmation.
3. Provide the lookup token for order tracking.
4. Keep WhatsApp as a fallback/support channel, not the order mechanism.

Once Phase 3 is live:
1. Build admin dashboard for order review and status management.
2. Build customer order tracking page (lookup token → status).

## API contract (all phases)

```
POST /api/orders
Content-Type: application/json
Idempotency-Key: <client-generated-key-16-to-200-chars>

{
  "deliveryZone": "inside" | "sub" | "outside",
  "customer": {
    "name": "...",          // 2-100 chars
    "phone": "+880...",     // BD phone format
    "district": "Dhaka",   // 1-80 chars
    "area": "Dhanmondi",   // optional, max 100 chars
    "address": "..."        // 5-300 chars
  },
  "items": [
    { "productId": "...", "variantId": "...", "quantity": 1 }
    // 1-30 lines, qty 1-99 each
  ]
}

// Phase 1 response (validation only, no persistence):
200 OK
{
  "status": "accepted_for_review",
  "publicReference": "OC-A1B2C3D4E5F67890",
  "subtotalBdt": 1199,
  "deliveryBdt": 0,
  "totalBdt": 1199,
  "itemCount": 1,
  "paymentMethod": "cod",
  "notice": "Order validation succeeded. Persistence is not yet configured."
}

// Phase 2 response (with database):
201 Created
{
  "status": "pending_review",
  "publicReference": "OC-A1B2C3D4E5F67890",
  "lookupToken": "<43-char-base64url>",
  "subtotalBdt": 1199,
  "deliveryBdt": 0,
  "totalBdt": 1199,
  "itemCount": 1,
  "paymentMethod": "cod"
}
```

## Error responses

| Status | Meaning |
|--------|---------|
| 400 | Invalid payload (missing fields, bad quantities, unknown zone) |
| 404 | Product not found, not approved, or variant unavailable |
| 405 | Method not allowed (only POST accepted) |
| 409 | Idempotency conflict (same key, different payload) — Phase 2+ only |
| 422 | Price computation failed (unsafe integer, zero-price product) |
| 429 | Rate limited — Phase 3+ only |
| 503 | Product catalogue temporarily unavailable |

## Security checklist for each phase

- [ ] No service-role credentials in browser code or `VITE_*` variables
- [ ] No PII in response bodies beyond what the customer submitted
- [ ] No order lookup without verified identity (Phase 3)
- [ ] CORS restricted to the shop's own origin
- [ ] Request body size limited (Vercel default: 5MB, sufficient)
- [ ] Rate limiting before database writes (Phase 3)
- [ ] Idempotency scoped to server-verified identity, not caller-controlled header (Phase 2)
- [ ] `app.actor_id` derived from verified admin session, not request body (Phase 3)
- [ ] Lookup token hash stored, raw token never persisted (Phase 2)
