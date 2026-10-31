// House-brand products — our own hoodie designs, sold directly (not from a dropship supplier).
//
// These are NOT part of the /api/products supplier feed (api/_lib/products-core.js), because that
// feed only carries reviewed supplier products. The storefront (src/App.jsx, HOUSE_HOODIES) shows
// these products to customers, so the order API must also know about them to validate and price
// orders placed for them — otherwise every house-hoodie order is rejected as "unavailable".
//
// Keep id, price, colors and sizes here in sync with HOUSE_HOODIES in src/App.jsx. Only the fields
// needed for order validation and pricing are listed (no images/descriptions — those stay
// frontend-only).
const HSIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const HOUSE_PRODUCTS = [
  { id: "hoodie-meow", name: "Meow Cat Hoodie", price: 1199, colors: ["Pink"], sizes: HSIZES },
  { id: "hoodie-okay", name: "I'm OK Hoodie", price: 1199, colors: ["Grey", "Pink"], sizes: HSIZES },
  { id: "hoodie-tribal", name: "Tribal Mark Hoodie", price: 1199, colors: ["Black"], sizes: HSIZES },
  { id: "hoodie-moon-palm", name: "Moonlit Palm Hoodie", price: 1199, colors: ["Green"], sizes: HSIZES },
  { id: "hoodie-death-note", name: "Death Note Hoodie", price: 1199, colors: ["Black"], sizes: HSIZES },
  { id: "hoodie-move-forward", name: "Let's Move Forward Hoodie", price: 1199, colors: ["Blush"], sizes: HSIZES },
  { id: "hoodie-musafir", name: "Musafir Hoodie", price: 1199, colors: ["Red"], sizes: HSIZES },
  { id: "hoodie-sunnah", name: "Smile Is Sunnah Hoodie", price: 1199, colors: ["Navy"], sizes: HSIZES },
  { id: "hoodie-butterfly", name: "Butterfly Bloom Hoodie", price: 1199, colors: ["Pink"], sizes: HSIZES },
  { id: "hoodie-kitty", name: "Kitty Heart Hoodie", price: 1199, colors: ["Cream"], sizes: HSIZES },
  { id: "hoodie-paris", name: "Paris Stripe Hoodie", price: 1199, colors: ["White"], sizes: HSIZES },
  { id: "hoodie-meow-mustard", name: "Meow Hoodie · Mustard", price: 1299, colors: ["Mustard"], sizes: HSIZES },
  { id: "hoodie-meow-lavender", name: "Meow Hoodie · Lavender", price: 1299, colors: ["Lavender"], sizes: HSIZES },
  { id: "hoodie-plain-navy", name: "Premium Plain Hoodie · Navy", price: 1099, colors: ["Navy"], sizes: HSIZES },
  { id: "hoodie-plain-grey", name: "Premium Plain Hoodie · Grey", price: 1099, colors: ["Grey melange"], sizes: HSIZES },
  { id: "hoodie-plain-maroon", name: "Premium Plain Hoodie · Maroon", price: 1099, colors: ["Maroon"], sizes: HSIZES },
];
