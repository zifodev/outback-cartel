// Pure order lifecycle rules shared by future authenticated admin handlers.
// This helper does not authorize a caller or persist a status change.
export const ORDER_STATUSES = Object.freeze([
  "pending_review",
  "confirmed",
  "processing",
  "dispatched",
  "delivered",
  "cancelled",
]);

const TRANSITIONS = Object.freeze({
  pending_review: Object.freeze(["confirmed", "cancelled"]),
  confirmed: Object.freeze(["processing", "cancelled"]),
  processing: Object.freeze(["dispatched"]),
  dispatched: Object.freeze(["delivered"]),
  delivered: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export function canTransitionOrderStatus(from, to) {
  return Object.hasOwn(TRANSITIONS, from) && TRANSITIONS[from].includes(to);
}

export function getAllowedOrderTransitions(from) {
  return Object.hasOwn(TRANSITIONS, from) ? [...TRANSITIONS[from]] : [];
}
