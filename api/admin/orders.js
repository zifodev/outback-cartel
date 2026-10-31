// GET  /api/admin/orders — list orders (most recent first)
// POST /api/admin/orders — update order status via RPC
//
// Protected by ADMIN_PASSWORD env var (simple bearer token).
// This file runs as a Vercel serverless function.

import { supabaseGet, supabaseHeaders, supabaseUrl } from "../_lib/supabase.js";
import { canTransitionOrderStatus, getAllowedOrderTransitions } from "../_lib/order-status.js";

export const config = { maxDuration: 15 };

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
};

const err = (res, status, message) => json(res, status, { error: message });

function authenticate(req) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) return false;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7) === password;
  }
  // Also accept X-Admin-Password header for simple fetch usage
  return req.headers["x-admin-password"] === password;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (!authenticate(req)) {
    return err(res, 401, "Unauthorized");
  }

  const env = process.env;

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return err(res, 503, "Database is not configured");
  }

  if (req.method === "GET") {
    return handleList(req, res, env);
  }
  if (req.method === "POST") {
    return handleStatusUpdate(req, res, env);
  }
  res.setHeader("Allow", "GET, POST, OPTIONS");
  return err(res, 405, "Method not allowed");
}

async function handleList(req, res, env) {
  try {
    const orders = await supabaseGet(env, "oc_orders",
      "select=id,public_reference,status,customer_name,phone,district,area,address,delivery_zone,subtotal_bdt,delivery_bdt,total_bdt,payment_method,created_at&order=created_at.desc&limit=100"
    );

    // For each order, fetch its items
    const orderIds = orders.map(o => o.id);
    let items = [];
    if (orderIds.length > 0) {
      const idList = orderIds.map(id => `"${id}"`).join(",");
      items = await supabaseGet(env, "oc_order_items",
        `order_id=in.(${idList})&select=id,order_id,product_id,product_title_snapshot,variant_snapshot,unit_price_bdt,quantity,line_total_bdt`
      );
    }

    // Group items by order
    const itemsByOrder = new Map();
    for (const item of items) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id).push(item);
    }

    const result = orders.map(order => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
      allowedTransitions: getAllowedOrderTransitions(order.status),
    }));

    return json(res, 200, { orders: result });
  } catch (e) {
    console.error("Admin list error:", e.message);
    return err(res, 500, "Could not load orders");
  }
}

async function handleStatusUpdate(req, res, env) {
  const { orderId, newStatus, actorId } = req.body || {};

  if (!orderId || !newStatus) {
    return err(res, 400, "orderId and newStatus are required");
  }

  // Client-side validation before hitting the database
  // (the RPC trigger enforces this too, but a clear 422 is friendlier)
  let orders;
  try {
    orders = await supabaseGet(env, "oc_orders",
      `id=eq.${encodeURIComponent(orderId)}&select=id,status&limit=1`
    );
  } catch (e) {
    console.error("Admin lookup error:", e.message);
    return err(res, 500, "Could not look up order");
  }

  if (!orders?.length) {
    return err(res, 404, "Order not found");
  }

  const current = orders[0];
  if (!canTransitionOrderStatus(current.status, newStatus)) {
    return err(res, 422, `Cannot transition from "${current.status}" to "${newStatus}"`);
  }

  // Call the admin_update_order_status RPC which sets app.actor_id
  // inside the transaction so the status-guard trigger is satisfied.
  const actor = actorId || "admin";
  try {
    const rpcUrl = `${supabaseUrl(env)}/rest/v1/rpc/admin_update_order_status`;
    const headers = supabaseHeaders(env);

    const rpcRes = await fetch(rpcUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_order_id: orderId,
        p_new_status: newStatus,
        p_actor_id: actor,
      }),
    });

    const rpcData = await rpcRes.json().catch(() => null);

    if (!rpcRes.ok) {
      const msg = rpcData?.message || "Status update failed";
      const status = msg.includes("not found") ? 404 : rpcRes.status;
      return err(res, status, msg);
    }

    const updated = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return json(res, 200, {
      ok: true,
      order: updated || { id: orderId, status: newStatus },
    });
  } catch (e) {
    console.error("Admin status update error:", e.message);
    return err(res, 500, "Status update failed");
  }
}
