import test from "node:test";
import assert from "node:assert/strict";
import { productsResponse } from "../api/_lib/products-core.js";

const approvedId = "22fb3fe4-4c41-470f-b0e0-79c3e1bb95f8";
const product = {
  id: approvedId,
  name: "Black Paisley Hoodie & Dropsoulder Combo",
  suggestedPrice: 1200,
  inStock: true,
  images: ["https://example.test/hoodie.jpg"],
  variants: [{ size: "L" }],
};

test("supplier configuration stays isolated across overlapping requests", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, options = {}) => {
    const key = options.headers?.["x-api-key"];
    seen.push({ url: String(url), key });
    await new Promise(resolve => setTimeout(resolve, key === "key-A" ? 20 : 5));
    return new Response(JSON.stringify({ data: key === "key-A" ? [product] : [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const [a, b] = await Promise.all([
      productsResponse({ method: "GET", url: "https://shop.test/api/products", env: {
        BUSINESSKORO_API_KEY: "key-A", BUSINESSKORO_API_URL: "https://supplier-a.test/products",
      } }),
      productsResponse({ method: "GET", url: "https://shop.test/api/products", env: {
        BUSINESSKORO_API_KEY: "key-B", BUSINESSKORO_API_URL: "https://supplier-b.test/products",
      } }),
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(a.body.products.length, 1);
    assert.equal(b.body.products.length, 0);
    assert.ok(seen.some(x => x.url === "https://supplier-a.test/products" && x.key === "key-A"));
    assert.ok(seen.some(x => x.url === "https://supplier-b.test/products" && x.key === "key-B"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("non-GET methods are rejected", async () => {
  const result = await productsResponse({ method: "POST", url: "https://shop.test/api/products", env: {} });
  assert.equal(result.status, 405);
  assert.equal(result.headers.Allow, "GET, HEAD");
});

test("unknown query parameters cannot bypass the normal feed route", async () => {
  const result = await productsResponse({ method: "GET", url: "https://shop.test/api/products?bypass=1", env: {} });
  assert.equal(result.status, 308);
  assert.equal(result.headers.Location, "/api/products");
});

test("protected review report classifies risky renamed approved products as held", async () => {
  const originalFetch = globalThis.fetch;
  const riskyNames = ["Vintage Sword Display", "Premium Wine Gift Set", "Replica Designer Earbuds"];
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: riskyNames.map((name, index) => ({
      ...product,
      id: approvedId,
      name,
      suggestedPrice: 1200 + index,
    })),
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const token = "test-debug-token-123456789";
    const result = await productsResponse({
      method: "GET",
      url: `https://shop.test/api/products?debug=${token}`,
      env: { BUSINESSKORO_API_KEY: "test-key", PRODUCTS_DEBUG_TOKEN: token },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.review.held.length, riskyNames.length);
    assert.equal(result.body.review.published, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HEAD requests return feed headers without contacting suppliers", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("HEAD must not fetch supplier data");
  };
  try {
    const result = await productsResponse({
      method: "HEAD",
      url: "https://shop.test/api/products",
      env: { BUSINESSKORO_API_KEY: "test-key" },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body, null);
    assert.match(result.headers["Cache-Control"], /s-maxage=3600/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Business Koro products with unavailable or unknown stock are not published", async () => {
  const originalFetch = globalThis.fetch;
  const stockRecords = [
    { ...product, inStock: true },
    { ...product, id: "out-of-stock-id", inStock: false },
    { ...product, id: "unknown-stock-id", inStock: undefined },
    { ...product, id: "null-stock-id", inStock: null },
  ];
  globalThis.fetch = async () => new Response(JSON.stringify({ data: stockRecords }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
  try {
    const token = "stock-check-debug-token-123456";
    const result = await productsResponse({
      method: "GET",
      url: `https://shop.test/api/products?debug=${token}`,
      env: { BUSINESSKORO_API_KEY: "test-key", PRODUCTS_DEBUG_TOKEN: token },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.businessKoro.usableCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one supplier outage does not take down the other supplier's feed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).startsWith("https://businesskoro-down.test/")) {
      throw new Error("Business Koro unavailable");
    }
    return new Response(JSON.stringify({ products: [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const result = await productsResponse({
      method: "GET",
      url: "https://shop.test/api/products",
      env: {
        DROPSHIP_API_KEY: "mohasagor-key",
        DROPSHIP_SECRET_KEY: "mohasagor-secret",
        MOHASAGOR_API_URL: "https://mohasagor.test/products",
        BUSINESSKORO_API_KEY: "businesskoro-key",
        BUSINESSKORO_API_URL: "https://businesskoro-down.test/products",
      },
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.products, []);
    assert.equal(result.body.suppliers.mohasagor.ok, true);
    assert.equal(result.body.suppliers.businessKoro.ok, false);
    assert.match(result.body.suppliers.businessKoro.error, /unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shared supplier call budget is never exceeded", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return new Response(JSON.stringify({ products: [], data: [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const token = "supplier-budget-debug-token-123";
    const result = await productsResponse({
      method: "GET",
      url: `https://shop.test/api/products?debug=${token}`,
      env: {
        DROPSHIP_API_KEY: "mohasagor-key",
        DROPSHIP_SECRET_KEY: "mohasagor-secret",
        MOHASAGOR_API_URL: "https://mohasagor.test/products",
        BUSINESSKORO_API_KEY: "businesskoro-key",
        BUSINESSKORO_API_URL: "https://businesskoro.test/products",
        SUPPLIER_CALL_LIMIT: "1",
        PRODUCTS_DEBUG_TOKEN: token,
      },
    });
    assert.equal(result.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(result.body.supplierCalls.limit, 1);
    assert.equal(result.body.supplierCalls.used, 1);
    assert.ok(result.body.mohasagor.error || result.body.businessKoro.error);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Business Koro pricing never falls below its customer-pays-delivery minimum", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: [{
      ...product,
      minimumSellingPrice: { customerPaysDelivery: 1500 },
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await productsResponse({
      method: "GET",
      url: "https://shop.test/api/products",
      env: { BUSINESSKORO_API_KEY: "test-key" },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.products.length, 1);
    assert.equal(result.body.products[0].price, 1500);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("debug reports stay disabled without a sufficiently long matching token", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("A rejected debug request must not call suppliers");
  };
  try {
    const result = await productsResponse({
      method: "GET",
      url: "https://shop.test/api/products?debug=guess",
      env: {
        BUSINESSKORO_API_KEY: "test-key",
        PRODUCTS_DEBUG_TOKEN: "guess",
      },
    });
    assert.equal(result.status, 308);
    assert.equal(result.headers.Location, "/api/products");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
