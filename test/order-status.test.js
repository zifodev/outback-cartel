import test from "node:test";
import assert from "node:assert/strict";
import { ORDER_STATUSES, canTransitionOrderStatus, getAllowedOrderTransitions } from "../api/_lib/order-status.js";

test("defines the complete supported order status set", () => {
  assert.deepEqual(ORDER_STATUSES, [
    "pending_review", "confirmed", "processing", "dispatched", "delivered", "cancelled",
  ]);
});

test("allows only forward lifecycle transitions and documented cancellations", () => {
  const allowed = [
    ["pending_review", "confirmed"],
    ["pending_review", "cancelled"],
    ["confirmed", "processing"],
    ["confirmed", "cancelled"],
    ["processing", "dispatched"],
    ["dispatched", "delivered"],
  ];
  for (const [from, to] of allowed) assert.equal(canTransitionOrderStatus(from, to), true);
});

test("rejects skipped, reversed, repeated and terminal-state transitions", () => {
  const rejected = [
    ["pending_review", "processing"],
    ["confirmed", "pending_review"],
    ["processing", "delivered"],
    ["dispatched", "processing"],
    ["delivered", "cancelled"],
    ["cancelled", "confirmed"],
    ["pending_review", "pending_review"],
    ["unknown", "confirmed"],
  ];
  for (const [from, to] of rejected) assert.equal(canTransitionOrderStatus(from, to), false);
});

test("returns a defensive copy of allowed transitions", () => {
  const transitions = getAllowedOrderTransitions("pending_review");
  transitions.push("delivered");
  assert.deepEqual(getAllowedOrderTransitions("pending_review"), ["confirmed", "cancelled"]);
  assert.deepEqual(getAllowedOrderTransitions("unknown"), []);
});
