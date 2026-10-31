# Customer and admin experience integration plan

Status: plan only. The current checkout is WhatsApp-based and must remain functional until the server-side order API is fully operational.

## Current state

### Checkout flow (WhatsApp)
- `CheckoutModal` in `App.jsx` (~line 1176) collects delivery zone, optional name/phone/address.
- Builds a WhatsApp message with cart contents and customer details.
- Opens `wa.me/8801881816245` with the pre-filled message.
- Customer must press Send in WhatsApp. Staff confirms manually.
- The website shows a clear "temporary WhatsApp ordering" notice.
- No data is saved on the server. Cart is in localStorage.

### Order tracking
- Does not exist. The chatbot responds: "Order tracking is not on the website yet."

### Admin
- No admin dashboard. No authenticated admin access.
- The existing account/OTP UI is explicitly called out as "not a secure server-side admin identity system" in the architecture doc.

### What's honest and working
- WhatsApp checkout is clearly labelled as temporary.
- Delivery zones and fees are displayed correctly.
- COD is the only payment method — honestly presented.
- "No reviews yet" states are shown truthfully.
- Chatbot answers redirect to WhatsApp for order-related questions.

## Integration plan

### Phase A: Dual checkout (WhatsApp + API validation)

**When**: After Phase 1 endpoint (`POST /api/orders`) is deployed to Vercel.

Changes to `CheckoutModal`:
1. Before opening WhatsApp, call `POST /api/orders` with the cart data.
2. If validation succeeds (200): show server-computed totals to the customer, then open WhatsApp as before.
3. If validation fails (400/404/422): show the error message inline. Do NOT open WhatsApp with invalid data.
4. This catches pricing mismatches, out-of-stock variants, and constraint violations before the customer even sends the message.

**What this does NOT do**:
- Does not claim the order is placed or saved.
- Does not show a fake confirmation or tracking number.
- Does not change the WhatsApp flow — the customer still sends the message manually.

**UI changes**:
- Replace "Open WhatsApp to send your order" button text with "Verify & open WhatsApp".
- On success, show: "Prices verified ✅ — subtotal ৳{subtotalBdt}, delivery ৳{deliveryBdt}, total ৳{totalBdt}."
- On error, show the specific validation error with no WhatsApp link.

### Phase B: Real order creation (requires database)

**When**: After Phase 2 of the API plan (database connected, migration applied).

Changes to `CheckoutModal`:
1. Call `POST /api/orders` — now returns `201 Created` with `publicReference` and `lookupToken`.
2. Show the public reference: "Your order reference: OC-A1B2C3D4E5F67890".
3. Store the lookup token in a browser cookie or localStorage for order tracking.
4. Still open WhatsApp with the reference number included in the message, so staff can cross-reference.
5. Show: "Your order has been received. We'll confirm it shortly on WhatsApp."

**What this does NOT do yet**:
- Does not show "confirmed" — the order starts as `pending_review`.
- Does not pretend tracking is live until Phase C.

### Phase C: Customer order tracking

**When**: After Phase 3 of the API plan (auth provider configured).

New component: `OrderTracker`
1. Customer enters their lookup token (stored from checkout) or public reference.
2. Calls `GET /api/orders/:reference` with the lookup token.
3. Shows current status with the state machine steps:
   - `pending_review` → "We're reviewing your order"
   - `confirmed` → "Order confirmed — we're preparing it"
   - `processing` → "Your order is being prepared"
   - `dispatched` → "On its way!"
   - `delivered` → "Delivered"
   - `cancelled` → "Order cancelled"
4. Shows a timeline of status changes from the audit events.

**What this does NOT do**:
- Does not show real-time courier tracking (no courier API).
- Does not display delivery estimates beyond what's in the zone data.

### Phase D: Admin dashboard

**When**: After Phase 3 of the API plan (admin auth configured).

New admin routes (protected):
- `/admin/orders` — list orders by status, newest first.
- `/admin/orders/:id` — order detail with customer info, items, audit trail.
- Status transition buttons: "Confirm", "Start processing", "Mark dispatched", "Mark delivered", "Cancel".
- Each transition calls `PATCH /api/admin/orders/:id` with the verified admin session.

**Security requirements**:
- Admin routes must not be accessible without verified admin session.
- The admin dashboard must be a separate protected route, not a toggle on the public site.
- `app.actor_id` is derived from the verified admin identity, never from request input.

## Things that must NOT change

1. **Visual identity**: All existing CSS variables, theme colours, fonts, and layout stay as they are.
2. **WhatsApp as fallback**: Even after the API is live, WhatsApp remains a support channel. The chatbot should update its responses to mention order references.
3. **Honest messaging**: No "Order confirmed" until it's actually confirmed by staff. No tracking UI until tracking is real.
4. **COD only**: The payment method is hardcoded as COD. No payment gateway integration without proper credentials and testing.
5. **3D Showroom**: The Three.js showroom is unrelated to orders and must not be affected.

## Chatbot updates (per phase)

| Phase | "How to order" response | "Track order" response |
|-------|-------------------------|------------------------|
| Current | WhatsApp instructions | "Not on the website yet" |
| A | Same, but mention prices are verified | Same |
| B | Updated with order reference mention | "Message us on WhatsApp with your reference" |
| C | Full flow with reference + tracking | "Enter your reference or check your email" |

## Files that will be modified

| File | Phase | Change |
|------|-------|--------|
| `src/App.jsx` (CheckoutModal) | A | Add API validation call before WhatsApp |
| `src/App.jsx` (CheckoutModal) | B | Full API integration, show reference |
| `src/App.jsx` (chatbot responses) | B, C | Update order/tracking responses |
| `src/App.jsx` (OrderTracker) | C | New component |
| `api/orders.js` | B | Add database persistence |
| New: `api/admin/orders.js` | D | Admin status management |
| New: `src/Admin.jsx` | D | Admin dashboard component |
