import { useState } from "react";

// ─────────────────────────────────────────────────────────────
//  COVER PAGE — clothing rail ("hanger") version, with photos.
//  Photos live in public/hoodies/. EDIT HERE: names, notes, PRICES (৳).
//  While price is 0 the card shows "Price coming soon" and the
//  Add to cart button stays disabled.
// ─────────────────────────────────────────────────────────────
const ITEMS = [
  { id: 101, name: "Bow Print Hoodie", img: "hoodies/bow.jpg", price: 0, note: "Pink fleece hoodie with a black bow graphic." },
  { id: 102, name: "Meow Cat Hoodie", img: "hoodies/meow.jpg", price: 0, note: "Pink fleece hoodie with a peeking cat print." },
  { id: 103, name: "I'm OK Hoodie (Grey)", img: "hoodies/okay-grey.jpg", price: 0, note: "Heather grey hoodie with a cartoon print." },
  { id: 104, name: "I'm OK Hoodie (Pink)", img: "hoodies/okay-pink.png", price: 0, note: "Soft pink hoodie with a cartoon print." },
  { id: 105, name: "Tribal Mark Hoodie", img: "hoodies/tribal.png", price: 0, note: "Black hoodie with a white tribal-style graphic." },
  { id: 106, name: "Beware of Chicken Hoodie", img: "hoodies/chicken.png", price: 0, note: "Black hoodie with a bold lettered print." },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const fmtBDT = n => "৳" + Number(n).toLocaleString();

function Hanger() {
  return (
    <svg width="90" height="34" viewBox="0 0 90 34" aria-hidden="true" style={{ display: "block", margin: "0 auto" }}>
      <path d="M45 2v8M45 10C40 11 36 13 30 17L8 28M45 10C50 11 54 13 60 17L82 28" stroke="#2B2A27" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Inter:wght@400;500;600&display=swap');
.oc-cover{min-height:100vh;background:#ECE9E2;color:#1A1A18;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
.oc-cover *{box-sizing:border-box}
.oc-cover button{font-family:inherit;cursor:pointer}
.oc-cover button:focus-visible{outline:2px solid #1A1A18;outline-offset:3px}
.oc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:28px 48px 0}
.oc-brand{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.oc-wordmark{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;letter-spacing:.12em;text-transform:uppercase}
.oc-tag{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#5A574F}
.oc-cart{display:flex;align-items:center;gap:10px;background:#fff;border:0;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:600;color:#1A1A18}
.oc-main{flex:1;display:flex;gap:32px;padding:28px 48px 0;align-items:flex-start}
.oc-left{flex:1;min-width:0}
.oc-title{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:56px;letter-spacing:-.02em;line-height:1;margin:0}
.oc-hint{font-size:14px;color:#5A574F;margin:12px 0 0}
.oc-rail{position:relative;margin-top:34px}
.oc-rail:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:#2B2A27;border-radius:2px}
.oc-row{display:flex;gap:12px;overflow-x:auto;padding:12px 0 8px}
.oc-item{flex:none;width:210px;border:0;background:transparent;padding:0;text-align:left;opacity:.92;transition:transform .15s}
.oc-item img{display:block;width:210px;height:210px;object-fit:cover;border-radius:14px;box-shadow:0 12px 30px rgba(26,26,24,.18)}
.oc-item span{display:block;margin-top:10px;font-size:13px;font-weight:500;color:#3B3934}
.oc-item[aria-pressed="true"]{transform:translateY(-8px);opacity:1}
.oc-item[aria-pressed="true"] img{outline:3px solid #1A1A18;outline-offset:3px}
.oc-card{flex:none;width:300px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 14px 40px rgba(26,26,24,.12);display:flex;flex-direction:column;gap:14px}
.oc-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#5A574F}
.oc-name{font-family:'Bricolage Grotesque',sans-serif;font-weight:600;font-size:24px;line-height:1.15}
.oc-price{font-size:18px;font-weight:600}
.oc-note{font-size:13px;color:#5A574F}
.oc-sizeh{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.oc-sizes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.oc-size{height:44px;border-radius:10px;font-size:13px;font-weight:600;background:#fff;color:#1A1A18;border:1px solid #BDB8AC}
.oc-size[aria-pressed="true"]{background:#1A1A18;color:#fff;border-color:#1A1A18}
.oc-add{height:48px;border:0;border-radius:12px;font-size:14px;font-weight:600;background:#1A1A18;color:#fff}
.oc-add:disabled{background:#E3DFD4;color:#4A4740;cursor:not-allowed}
.oc-add.done{background:#1F6B3A}
.oc-floor{margin-top:auto;background:#DCD8CD;border-top:2px solid #C9C4B7;padding:28px 48px 36px;display:flex;justify-content:center}
.oc-nav{display:flex;gap:4px;background:#fff;border-radius:999px;padding:6px;box-shadow:0 6px 20px rgba(26,26,24,.08);flex-wrap:wrap;justify-content:center}
.oc-nav button{height:40px;padding:0 20px;border:0;border-radius:999px;font-size:13px;font-weight:600;background:transparent;color:#3B3934}
.oc-nav button.on{background:#1A1A18;color:#fff}
@media (max-width:900px){
  .oc-head{padding:20px 18px 0}
  .oc-wordmark{font-size:22px}
  .oc-main{flex-direction:column;padding:22px 18px 0;gap:22px}
  .oc-title{font-size:40px}
  .oc-card{width:100%}
  .oc-floor{padding:22px 18px 28px}
}
`;

export default function CoverPage({ cartCount, onAdd, onEnter, onOpenCart, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);
  const sel = ITEMS[idx];
  const hasPrice = sel.price > 0;

  const pick = i => { setIdx(i); setSize(null); setAdded(false); };
  const add = () => {
    if (!size || !hasPrice) return;
    onAdd({ id: `${sel.id}-${size}`, name: `${sel.name} (${size})`, cat: "clothing", price: sel.price, old: 0, icon: "🧥", badge: null, img: sel.img });
    setAdded(true);
  };

  return (
    <div className="oc-cover">
      <style>{CSS}</style>

      <header className="oc-head">
        <div className="oc-brand">
          <span className="oc-wordmark">Outback Cartel</span>
          <span className="oc-tag">Virtual store</span>
        </div>
        <button className="oc-cart" onClick={onOpenCart} aria-label={`Cart, ${cartCount} items`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          Cart · {cartCount}
        </button>
      </header>

      <main className="oc-main">
        <section className="oc-left">
          <h1 className="oc-title">Hoodies</h1>
          <p className="oc-hint">Six graphic hoodies. Scroll sideways for more, then pick one to choose a size.</p>
          <div className="oc-rail">
            <div className="oc-row">
              {ITEMS.map((it, i) => (
                <button key={it.id} className="oc-item" onClick={() => pick(i)} aria-pressed={i === idx} aria-label={it.name}>
                  <Hanger /><img src={it.img} alt="" /><span>{it.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="oc-card" aria-live="polite">
          <div className="oc-eyebrow">Hoodies · {idx + 1} of {ITEMS.length}</div>
          <div className="oc-name">{sel.name}</div>
          <div className="oc-price">{hasPrice ? fmtBDT(sel.price) : "Price coming soon"}</div>
          <div className="oc-note">{sel.note}</div>
          <div className="oc-sizeh">Select size</div>
          <div className="oc-sizes">
            {SIZES.map(s => (
              <button key={s} className="oc-size" aria-pressed={s === size} onClick={() => { setSize(s); setAdded(false); }}>{s}</button>
            ))}
          </div>
          <button className={"oc-add" + (added ? " done" : "")} onClick={add} disabled={!hasPrice || !size}>
            {!hasPrice ? "Coming soon" : added ? "Added to cart ✓" : size ? "Add to cart" : "Choose a size"}
          </button>
        </aside>
      </main>

      <footer className="oc-floor">
        <nav className="oc-nav" aria-label="Store">
          <button className="on" aria-current="page">Hoodies</button>
          <button onClick={onEnter}>Shop all products →</button>
          <button onClick={() => onNavigate("about")}>About</button>
          <button onClick={() => onNavigate("faq")}>FAQ</button>
        </nav>
      </footer>
    </div>
  );
}
