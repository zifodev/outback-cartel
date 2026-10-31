import { useState, useRef, useEffect, useCallback, lazy, Suspense, Component } from "react";
import HoodieRail from "./HoodieRail.jsx";

// the 3D showroom loads on its own, so the shop itself appears straight away
const Showroom = lazy(() => import("./Showroom.jsx"));

// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  STORE_NAME: "Outback Cartel",
  WHATSAPP: "8801881816245",
  WHATSAPP_DISPLAY: "01881816245",
  // Online payment will be added later from server code only.
};

// ─────────────────────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────────────────────
const CATS = [
  { key: "all", label: "All items", icon: "🏠", color: "#B3301B" },
  { key: "hoodies", label: "Hoodies", icon: "🧥", color: "#B3301B" },
  { key: "mens", label: "Men's fashion", icon: "👔", color: "#1D4ED8" },
  { key: "womens", label: "Women's fashion", icon: "👗", color: "#BE185D" },
  { key: "winter", label: "Winter collection", icon: "❄️", color: "#0F766E" },
  { key: "kids", label: "Kids zone", icon: "🧸", color: "#B45309" },
  { key: "electronics", label: "Gadgets & electronics", icon: "📱", color: "#0369A1" },
  { key: "home", label: "Home & lifestyle", icon: "🏡", color: "#15803D" },
  { key: "watches", label: "Watches", icon: "⌚", color: "#0E7490" },
  { key: "giftsfood", label: "Gifts & food", icon: "🎁", color: "#7E22CE" },
];

// ─────────────────────────────────────────────────────────────
//  DEFAULT PRODUCTS
// ─────────────────────────────────────────────────────────────
// Demo products removed — the shop now shows your own products (added in the admin panel)
// plus supplier products loaded from /api/products.
const DEFAULT_PRODUCTS = [];
const isDemoProduct = p => typeof p.id === "number" && p.id >= 1 && p.id <= 40; // ids of the old demo items
const hasPicture = p => typeof p.img === "string" && p.img.trim() !== ""; // products without a picture are not shown
// Our own hoodies — always shown in the "Hoodies" section and the hero rack.
// EDIT PRICES HERE (৳). old = optional strike-through "was" price.
const HSIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const HOUSE_HOODIES = [
  { id: "hoodie-meow", house: true, cat: "hoodies", name: "Meow Cat Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/meow-front.jpg", images: ["hoodies/gallery/meow-front.jpg", "hoodies/gallery/meow-back.jpg", "hoodies/gallery/meow-side.jpg", "hoodies/gallery/meow-side-l.jpg", "hoodies/gallery/meow-closeup.jpg"], colors: ["Pink"], sizes: HSIZES },
  { id: "hoodie-okay", house: true, cat: "hoodies", name: "I'm OK Hoodie", price: 1199, old: null, icon: "🧥", badge: "Hot", img: "hoodies/gallery/okay-front.jpg", images: ["hoodies/gallery/okay-front.jpg", "hoodies/gallery/okay-back.jpg", "hoodies/gallery/okay-side.jpg", "hoodies/gallery/okay-side-l.jpg", "hoodies/gallery/okay-closeup.jpg", "hoodies/okay-pink.png"], colors: ["Grey", "Pink"], sizes: HSIZES },
  { id: "hoodie-tribal", house: true, cat: "hoodies", name: "Tribal Mark Hoodie", price: 1199, old: null, icon: "🧥", badge: null, img: "hoodies/gallery/tribal-front.jpg", images: ["hoodies/gallery/tribal-front.jpg", "hoodies/gallery/tribal-back.jpg", "hoodies/gallery/tribal-side.jpg", "hoodies/gallery/tribal-side-l.jpg", "hoodies/gallery/tribal-closeup.jpg"], colors: ["Black"], sizes: HSIZES },
  // prices set by the owner on 30 Oct 2026 (৳1,099–1,299). Price 0 would show "Coming soon".
  { id: "hoodie-moon-palm", house: true, cat: "hoodies", name: "Moonlit Palm Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/moon-palm-front.jpg", images: ["hoodies/gallery/moon-palm-front.jpg", "hoodies/gallery/moon-palm-back.jpg", "hoodies/gallery/moon-palm-side.jpg", "hoodies/gallery/moon-palm-side-l.jpg", "hoodies/gallery/moon-palm-closeup.jpg"], colors: ["Green"], sizes: HSIZES },
  { id: "hoodie-death-note", house: true, cat: "hoodies", name: "Death Note Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/death-note-front.jpg", images: ["hoodies/gallery/death-note-front.jpg", "hoodies/gallery/death-note-back.jpg", "hoodies/gallery/death-note-side.jpg", "hoodies/gallery/death-note-side-l.jpg", "hoodies/gallery/death-note-closeup.jpg"], colors: ["Black"], sizes: HSIZES },
  { id: "hoodie-move-forward", house: true, cat: "hoodies", name: "Let's Move Forward Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/move-forward-front.jpg", images: ["hoodies/gallery/move-forward-front.jpg", "hoodies/gallery/move-forward-back.jpg", "hoodies/gallery/move-forward-side.jpg", "hoodies/gallery/move-forward-side-l.jpg", "hoodies/gallery/move-forward-closeup.jpg"], colors: ["Blush"], sizes: HSIZES },
  { id: "hoodie-musafir", house: true, cat: "hoodies", name: "Musafir Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/musafir-front.jpg", images: ["hoodies/gallery/musafir-front.jpg", "hoodies/gallery/musafir-back.jpg", "hoodies/gallery/musafir-side.jpg", "hoodies/gallery/musafir-side-l.jpg", "hoodies/gallery/musafir-closeup.jpg"], colors: ["Red"], sizes: HSIZES },
  { id: "hoodie-sunnah", house: true, cat: "hoodies", name: "Smile Is Sunnah Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/sunnah-front.jpg", images: ["hoodies/gallery/sunnah-front.jpg", "hoodies/gallery/sunnah-back.jpg", "hoodies/gallery/sunnah-side.jpg", "hoodies/gallery/sunnah-side-l.jpg", "hoodies/gallery/sunnah-closeup.jpg"], colors: ["Navy"], sizes: HSIZES },
  { id: "hoodie-butterfly", house: true, cat: "hoodies", name: "Butterfly Bloom Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/butterfly-front.jpg", images: ["hoodies/gallery/butterfly-front.jpg", "hoodies/gallery/butterfly-back.jpg", "hoodies/gallery/butterfly-side.jpg", "hoodies/gallery/butterfly-side-l.jpg", "hoodies/gallery/butterfly-closeup.jpg"], colors: ["Pink"], sizes: HSIZES },
  { id: "hoodie-kitty", house: true, cat: "hoodies", name: "Kitty Heart Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/kitty-front.jpg", images: ["hoodies/gallery/kitty-front.jpg", "hoodies/gallery/kitty-back.jpg", "hoodies/gallery/kitty-side.jpg", "hoodies/gallery/kitty-side-l.jpg", "hoodies/gallery/kitty-closeup.jpg"], colors: ["Cream"], sizes: HSIZES },
  { id: "hoodie-paris", house: true, cat: "hoodies", name: "Paris Stripe Hoodie", price: 1199, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/paris-front.jpg", images: ["hoodies/gallery/paris-front.jpg", "hoodies/gallery/paris-back.jpg", "hoodies/gallery/paris-three-q.jpg", "hoodies/gallery/paris-side.jpg", "hoodies/gallery/paris-side-l.jpg", "hoodies/gallery/paris-closeup.jpg"], colors: ["White"], sizes: HSIZES },
  { id: "hoodie-meow-mustard", house: true, cat: "hoodies", name: "Meow Hoodie \u00b7 Mustard", price: 1299, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/meow-mustard-front.jpg", images: ["hoodies/gallery/meow-mustard-front.jpg", "hoodies/gallery/meow-mustard-back.jpg", "hoodies/gallery/meow-mustard-three-q.jpg", "hoodies/gallery/meow-mustard-side.jpg", "hoodies/gallery/meow-mustard-side-l.jpg", "hoodies/gallery/meow-mustard-closeup.jpg"], colors: ["Mustard"], sizes: HSIZES },
  { id: "hoodie-meow-lavender", house: true, cat: "hoodies", name: "Meow Hoodie \u00b7 Lavender", price: 1299, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/meow-lavender-front.jpg", images: ["hoodies/gallery/meow-lavender-front.jpg", "hoodies/gallery/meow-lavender-back.jpg", "hoodies/gallery/meow-lavender-three-q.jpg", "hoodies/gallery/meow-lavender-side.jpg", "hoodies/gallery/meow-lavender-side-l.jpg", "hoodies/gallery/meow-lavender-closeup.jpg"], colors: ["Lavender"], sizes: HSIZES },
  { id: "hoodie-plain-navy", house: true, cat: "hoodies", name: "Premium Plain Hoodie \u00b7 Navy", price: 1099, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/plain-navy-front.jpg", images: ["hoodies/gallery/plain-navy-front.jpg", "hoodies/gallery/plain-navy-back.jpg", "hoodies/gallery/plain-navy-three-q.jpg", "hoodies/gallery/plain-navy-side.jpg", "hoodies/gallery/plain-navy-side-l.jpg", "hoodies/gallery/plain-navy-closeup.jpg"], colors: ["Navy"], sizes: HSIZES },
  { id: "hoodie-plain-grey", house: true, cat: "hoodies", name: "Premium Plain Hoodie \u00b7 Grey", price: 1099, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/plain-grey-front.jpg", images: ["hoodies/gallery/plain-grey-front.jpg", "hoodies/gallery/plain-grey-back.jpg", "hoodies/gallery/plain-grey-three-q.jpg", "hoodies/gallery/plain-grey-side.jpg", "hoodies/gallery/plain-grey-side-l.jpg", "hoodies/gallery/plain-grey-closeup.jpg"], colors: ["Grey melange"], sizes: HSIZES },
  { id: "hoodie-plain-maroon", house: true, cat: "hoodies", name: "Premium Plain Hoodie \u00b7 Maroon", price: 1099, old: null, icon: "🧥", badge: "New", img: "hoodies/gallery/plain-maroon-front.jpg", images: ["hoodies/gallery/plain-maroon-front.jpg", "hoodies/gallery/plain-maroon-back.jpg", "hoodies/gallery/plain-maroon-three-q.jpg", "hoodies/gallery/plain-maroon-side.jpg", "hoodies/gallery/plain-maroon-side-l.jpg", "hoodies/gallery/plain-maroon-closeup.jpg"], colors: ["Maroon"], sizes: HSIZES },
];

// ─────────────────────────────────────────────────────────────
//  THEME
// ─────────────────────────────────────────────────────────────
// flagship-store palette — values live in src/theme.css as CSS variables
const C = {
  primary: "var(--earth)",     // signal red fills (white text on top)
  hot: "var(--earth-text)",    // signal red as text
  dark: "var(--star)",         // main text colour
  deep: "var(--deep)",         // graphite, for dark fills
  accent: "var(--gold)",       // gold highlights
  green: "var(--gum)",         // success fills
  okText: "var(--ok)",         // success text
  bg: "var(--inset)", card: "var(--surface)", border: "var(--line)", muted: "var(--muted)",
};

const fmt = n => "৳" + Number(n).toLocaleString();
const genOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ─────────────────────────────────────────────────────────────
//  STORAGE
// ─────────────────────────────────────────────────────────────
const ls = {
  get: k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del: k => { try { localStorage.removeItem(k); } catch { } },
};

// ─────────────────────────────────────────────────────────────
//  SHARED UI
// ─────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return <div className="oc-toast" role="status">{msg}</div>;
}

function Btn({ children, onClick, style = {}, variant = "primary", disabled = false }) {
  return <button className="oc-btn" data-v={variant} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", error, style = {} }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label className="oc-label">{label}</label>}
      <input className="oc-field" data-err={error ? "true" : "false"} value={value} onChange={onChange} placeholder={placeholder} type={type} aria-label={label || placeholder} style={style} />
      {error && <span style={{ color: C.hot, fontSize: 12, display: "block", marginTop: 4 }}>{error}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  EMAILJS CONFIG — Real OTP emails
// ─────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID = "service_cn10t29";
const EMAILJS_TEMPLATE_ID = "template_u78jccs";
const EMAILJS_PUBLIC_KEY = "E0vzUC5hOdSLjLmVw";

async function sendEmailOTP({ toEmail, toName, otpCode }) {
  // Use EmailJS REST API directly — no SDK needed, no CORS issues
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_name: toName || "Customer",
        email: toEmail,
        passcode: otpCode,
        time: new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString("en-BD"),
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "EmailJS error");
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
//  ── AUTH MODAL (Sign up / Login with OTP) ──
// ─────────────────────────────────────────────────────────────
function AuthModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState("choose"); // choose|signup|login|otp|forgot|reset
  const [method, setMethod] = useState("email");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [pw, setPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [isForgotFlow, setIsForgotFlow] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [genOtp, setGenOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [timerOn, setTimerOn] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  // Timer countdown
  const startTimer = () => {
    setTimer(60); setTimerOn(true);
    const id = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(id); setTimerOn(false); return 0; } return t - 1; });
    }, 1000);
  };

  const sendOTP = async (isResend = false, isForgot = false) => {
    const err = {};
    if ((step === "signup" || isResend) && !isForgot) {
      if (!name.trim()) err.name = "Required";
    }
    if (!contact.trim()) err.contact = "Required";
    if (contact && !/\S+@\S+\.\S+/.test(contact)) err.contact = "Enter a valid email address";
    if (!pw.trim() && !isForgot) err.pw = "Required";

    // Check duplicate email on signup
    if (step === "signup" && !isForgot) {
      const existing = ls.get("oc_account");
      if (existing && existing.contact === contact.trim()) {
        err.contact = "This email is already registered. Please login instead.";
      }
    }

    if (Object.keys(err).length) { setErrors(err); return; }

    setLoading(true);
    const code = genOTP();
    setGenOtp(code);

    try {
      await sendEmailOTP({ toEmail: contact, toName: name || "Customer", otpCode: code });
      setLoading(false);
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      startTimer();
    } catch (e) {
      setLoading(false);
      setErrors({ contact: "Failed to send email. Please check the address and try again." });
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (!val && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const verifyOTP = () => {
    const entered = otp.join("");
    if (entered.length < 6) { setErrors({ otp: "Enter all 6 digits" }); return; }
    if (entered !== genOtp) { setErrors({ otp: "Incorrect OTP. Try again." }); return; }

    if (isForgotFlow) {
      // Go to reset password step
      setStep("reset");
      setErrors({});
      return;
    }

    // Normal signup/login success
    const existing = ls.get("oc_account");
    const acc = step === "login" && existing?.contact === contact
      ? { ...existing }
      : { name: name || "Customer", contact, method: "email", joined: new Date().toLocaleDateString("en-BD"), orders: [], avatar: "" };
    ls.set("oc_account", acc);
    onSuccess(acc);
    resetAll();
  };

  const resetPassword = () => {
    if (!newPw.trim() || newPw.length < 6) { setErrors({ newPw: "Password must be at least 6 characters" }); return; }
    const existing = ls.get("oc_account") || {};
    const updated = { ...existing, contact, pw: newPw };
    ls.set("oc_account", updated);
    onSuccess(updated);
    resetAll();
  };

  const resetAll = () => {
    setStep("choose"); setName(""); setContact(""); setPw(""); setNewPw("");
    setOtp(["", "", "", "", "", ""]); setErrors({}); setIsForgotFlow(false);
  };

  if (!open) return null;

  // ── STEP: Choose method — Email only ──
  if (step === "choose") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Welcome 👋" sub="Sign in or create your account" onClose={() => { onClose(); resetAll(); }} />
      <div style={{ padding: "24px 24px 28px" }}>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 18, background: "var(--tint-gold)", padding: "10px 14px", borderRadius: 8, border: `1px solid var(--line-gold)`, lineHeight: 1.6 }}>
          💡 <strong>Account is optional.</strong> You can shop without one. An account keeps your name and contact details on this device.
        </p>
        <button onClick={() => { setMethod("email"); setStep("signup"); }}
          style={{ width: "100%", border: `2px solid ${C.border}`, borderRadius: 14, padding: "20px", background: "var(--surface)", cursor: "pointer", textAlign: "center", transition: "all .2s", fontFamily: "inherit", marginBottom: 14 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "var(--tint-earth)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "var(--surface)"; }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Continue with Email</div>
          <div style={{ fontSize: 12, color: C.muted }}>We'll send a 6-digit OTP to your email</div>
        </button>
        <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
          Already have an account? <span onClick={() => setStep("login")} style={{ color: C.hot, fontWeight: 700, cursor: "pointer" }}>Login →</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <span onClick={() => { onClose(); resetAll(); }} style={{ fontSize: 12, color: C.muted, cursor: "pointer", textDecoration: "underline" }}>Continue without account</span>
        </div>
      </div>
    </Overlay>
  );

  // ── STEP: Sign up ──
  if (step === "signup") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Create Account 📧" sub="Sign up with your email address" onClose={() => { onClose(); resetAll(); }} back={() => setStep("choose")} />
      <div style={{ padding: "22px 24px 24px" }}>
        <Input label="Full Name" value={name} onChange={e => { setName(e.target.value); setErrors({}); }} placeholder="Your full name" error={errors.name} />
        <Input label="Email Address" value={contact} onChange={e => { setContact(e.target.value); setErrors({}); }} placeholder="you@email.com" type="email" error={errors.contact} />
        <Input label="Password" value={pw} onChange={e => { setPw(e.target.value); setErrors({}); }} placeholder="Create a password" type="password" error={errors.pw} />
        <OTPInfoBanner method="email" contact={contact} />
        <Btn onClick={() => sendOTP()} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }} disabled={loading}>
          {loading ? "⏳ Sending OTP to your email…" : "Send OTP →"}
        </Btn>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>
          Already have an account? <span onClick={() => { setStep("login"); setErrors({}); }} style={{ color: C.hot, fontWeight: 700, cursor: "pointer" }}>Login</span>
        </p>
      </div>
    </Overlay>
  );

  // ── STEP: Login ──
  if (step === "login") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Login 🔑" sub="Welcome back!" onClose={() => { onClose(); resetAll(); }} back={() => setStep("choose")} />
      <div style={{ padding: "22px 24px 24px" }}>
        <Input label="Email Address" value={contact} onChange={e => { setContact(e.target.value); setErrors({}); }}
          placeholder="you@email.com" type="email" error={errors.contact} />
        <Input label="Password" value={pw} onChange={e => { setPw(e.target.value); setErrors({}); }} placeholder="Your password" type="password" error={errors.pw} />
        <div style={{ textAlign: "right", marginTop: -8, marginBottom: 14 }}>
          <span onClick={() => { setIsForgotFlow(true); setStep("forgot"); setErrors({}); }} style={{ fontSize: 12, color: C.hot, fontWeight: 600, cursor: "pointer" }}>Forgot password?</span>
        </div>
        <OTPInfoBanner method="email" contact={contact} isLogin />
        <Btn onClick={() => sendOTP()} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }} disabled={loading}>
          {loading ? "⏳ Sending OTP…" : "Send OTP to Verify →"}
        </Btn>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>
          No account? <span onClick={() => { setStep("signup"); setErrors({}); }} style={{ color: C.hot, fontWeight: 700, cursor: "pointer" }}>Sign Up</span>
        </p>
      </div>
    </Overlay>
  );

  // ── STEP: Forgot Password ──
  if (step === "forgot") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Reset Password 🔒" sub="Enter your email to receive a reset code" onClose={() => { onClose(); resetAll(); }} back={() => { setStep("login"); setIsForgotFlow(false); setErrors({}); }} />
      <div style={{ padding: "22px 24px 24px" }}>
        <div style={{ background: "var(--tint-blue)", border: "1px solid var(--line-blue)", borderRadius: 9, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--info)", lineHeight: 1.6 }}>
          🔐 Enter the email address linked to your account. We'll send you a 6-digit code to reset your password.
        </div>
        <Input label="Email Address" value={contact} onChange={e => { setContact(e.target.value); setErrors({}); }}
          placeholder="you@email.com" type="email" error={errors.contact} />
        <Btn onClick={() => { const err = {}; if (!contact.trim()) err.contact = "Required"; if (contact && !/\S+@\S+\.\S+/.test(contact)) err.contact = "Enter a valid email"; if (Object.keys(err).length) { setErrors(err); return; } sendOTP(false, true); }} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }} disabled={loading}>
          {loading ? "⏳ Sending reset code…" : "Send Reset Code →"}
        </Btn>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>
          Remembered your password? <span onClick={() => { setStep("login"); setIsForgotFlow(false); setErrors({}); }} style={{ color: C.hot, fontWeight: 700, cursor: "pointer" }}>Login</span>
        </p>
      </div>
    </Overlay>
  );

  // ── STEP: Reset Password (after OTP verified) ──
  if (step === "reset") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="New Password 🔑" sub="Choose a strong new password" onClose={() => { onClose(); resetAll(); }} />
      <div style={{ padding: "22px 24px 24px" }}>
        <div style={{ background: "var(--tint-gum)", border: "1px solid var(--line-gum)", borderRadius: 9, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--ok)" }}>
          ✅ Identity verified! Now set your new password for <strong>{contact}</strong>
        </div>
        <Input label="New Password" value={newPw} onChange={e => { setNewPw(e.target.value); setErrors({}); }} placeholder="Minimum 6 characters" type="password" error={errors.newPw} />
        <Btn onClick={resetPassword} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }}>
          🔑 Set New Password & Login →
        </Btn>
      </div>
    </Overlay>
  );

  // ── STEP: OTP Entry ──
  if (step === "otp") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Verify OTP 🔐" sub={`Enter the 6-digit code sent to your ${method}`} onClose={() => { onClose(); resetAll(); }} back={() => { setStep(step === "otp" ? "signup" : "login"); setErrors({}); }} />
      <div style={{ padding: "22px 24px 28px", textAlign: "center" }}>

        {/* Destination display */}
        <div style={{ background: "var(--tint-blue)", border: "1px solid var(--line-blue)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--info)" }}>
          📧 Code sent to: <strong>{contact}</strong><br />
          <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>Check your inbox (and spam folder just in case)</span>
        </div>

        {/* 6-box OTP input */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }}>
          {otp.map((d, i) => (
            <input key={i} ref={el => otpRefs.current[i] = el} value={d} onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
              maxLength={1} inputMode="numeric"
              style={{ width: 46, height: 54, border: `2px solid ${errors.otp ? C.primary : d ? C.primary : C.border}`, borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: 800, outline: "none", fontFamily: "inherit", color: C.dark, background: d ? "var(--tint-earth)" : "var(--surface)", transition: "border-color .15s" }} />
          ))}
        </div>
        {errors.otp && <p style={{ color: C.hot, fontSize: 12, marginBottom: 10 }}>⚠️ {errors.otp}</p>}

        {/* Timer */}
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>
          {timerOn ? `Resend OTP in ${timer}s` : <span onClick={() => sendOTP(true)} style={{ color: C.hot, cursor: "pointer", fontWeight: 700 }}>Resend OTP →</span>}
        </p>

        <Btn onClick={verifyOTP} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }}>
          ✅ Verify & Continue
        </Btn>
      </div>
    </Overlay>
  );

  return null;
}

function OTPInfoBanner({ method, contact, isLogin = false }) {
  return (
    <div style={{ background: "var(--tint-blue)", border: "1px solid var(--line-blue)", borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--info)", lineHeight: 1.6 }}>
      🔐 We'll send a <strong>6-digit OTP</strong> to your {method === "email" ? "email" : "phone"} to verify your account.
      {isLogin && " This confirms it's really you."}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div className="oc-overlay">
      <div className="oc-modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, sub, onClose, back }) {
  return (
    <div className="oc-modalhead">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {back && <button className="oc-round" onClick={back} aria-label="Back">←</button>}
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontStretch: "112%" }}>{title}</div>
            {sub && <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", marginTop: 3 }}>{sub}</div>}
          </div>
        </div>
        <button className="oc-round" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ── USER DASHBOARD ──
// ─────────────────────────────────────────────────────────────
function UserDashboard({ account, onClose, onUpdate, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [editContact, setEditContact] = useState(account.contact || "");
  const [saveMsg, setSaveMsg] = useState("");
  const fileRef = useRef();

  const ORDERS = account.orders?.length > 0 ? account.orders : [];

  const STATUS_COLORS = { delivered: "#2E7D52", on_the_way: C.primary, processing: C.accent, confirmed: "#0369A1" };
  const STATUS_LABELS = { delivered: "Delivered ✅", on_the_way: "Out for Delivery 🚚", processing: "Processing 📦", confirmed: "Confirmed ✔️" };
  const TRACK_STEPS = ["Confirmed", "Processing", "Out for Delivery", "Delivered"];

  const saveProfile = () => {
    if (!editName.trim()) return;
    const updated = { ...account, name: editName.trim(), contact: editContact.trim() };
    ls.set("oc_account", updated);
    onUpdate(updated);
    setEditing(false);
    setSaveMsg("Profile updated! ✅");
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const handleAvatar = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const updated = { ...account, avatar: ev.target.result };
      ls.set("oc_account", updated);
      onUpdate(updated);
    };
    reader.readAsDataURL(file);
  };

  const TABS = [
    { key: "overview", icon: "🏠", label: "Overview" },
    { key: "orders", icon: "📦", label: "Orders" },
    { key: "track", icon: "🚚", label: "Track" },
    { key: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "96vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)", overflow: "hidden" }}>

        {/* Dashboard Header */}
        <div style={{ background: "var(--grad-deep)", padding: "22px 22px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Avatar */}
              <div style={{ position: "relative" }}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", background: account.avatar ? "transparent" : C.primary, border: "3px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {account.avatar
                    ? <img src={account.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{account.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <button onClick={() => fileRef.current.click()}
                  style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: C.accent, border: "2px solid var(--surface)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{account.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{account.contact}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 1 }}>Member since {account.joined}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", padding: "10px 4px 12px", fontFamily: "inherit", color: tab === t.key ? "#fff" : "rgba(255,255,255,.45)", borderBottom: tab === t.key ? "3px solid var(--surface)" : "3px solid transparent", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { icon: "📦", value: ORDERS.length, label: "Total Orders", color: C.hot },
                  { icon: "✅", value: ORDERS.filter(o => o.status === "delivered").length, label: "Delivered", color: C.okText },
                  { icon: "🚚", value: ORDERS.filter(o => o.status !== "delivered").length, label: "Active", color: C.accent },
                ].map(s => (
                  <div key={s.label} style={{ background: C.bg, borderRadius: 12, padding: "14px 10px", textAlign: "center", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: C.primary, borderRadius: 4, display: "inline-block" }} /> Recent Orders
              </div>

              {ORDERS.length === 0 ? (
                <div style={{ background: C.bg, borderRadius: 12, padding: "28px 20px", textAlign: "center", border: `1px solid ${C.border}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🛍️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 6 }}>No orders yet</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Your orders will appear here once you place one.</div>
                  <button onClick={onClose} style={{ background: C.primary, color: "#fff", border: "none", padding: "9px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Start Shopping →</button>
                </div>
              ) : (
                <>
                  {ORDERS.slice(0, 2).map(o => (
                    <div key={o.id} style={{ background: C.bg, borderRadius: 12, padding: "13px 14px", marginBottom: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{o.id}</span>
                        <span style={{ background: STATUS_COLORS[o.status] || C.muted, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50 }}>{STATUS_LABELS[o.status]}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>{o.date} · {o.items.length} item{o.items.length > 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.hot }}>{fmt(o.total)}</div>
                    </div>
                  ))}
                  <button onClick={() => setTab("orders")} style={{ width: "100%", background: "none", border: `2px dashed ${C.border}`, borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>View all orders →</button>
                </>
              )}

              {/* Quick actions */}
              <div style={{ fontSize: 13, fontWeight: 700, margin: "18px 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: C.primary, borderRadius: 4, display: "inline-block" }} /> Quick Actions
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { icon: "🚚", label: "Track Order", action: () => setTab("track") },
                  { icon: "👤", label: "Edit Profile", action: () => setTab("profile") },
                  { icon: "💬", label: "WhatsApp Support", action: () => window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20I%20need%20help.`, "_blank") },
                  { icon: "🚪", label: "Logout", action: onLogout, danger: true },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    style={{ background: a.danger ? "var(--tint-earth)" : "var(--surface)", border: `1px solid ${a.danger ? "var(--line-earth)" : C.border}`, borderRadius: 12, padding: "14px 12px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "all .2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    <div style={{ fontSize: 24, marginBottom: 5 }}>{a.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: a.danger ? "var(--danger)" : C.dark }}>{a.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ORDER HISTORY ── */}
          {tab === "orders" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: C.primary, borderRadius: 4, display: "inline-block" }} /> Order History ({ORDERS.length})
              </div>
              {ORDERS.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6 }}>No orders yet</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Orders are placed through WhatsApp for now, so they don't appear here yet.</div>
                  <button onClick={onClose} style={{ background: C.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Browse Products →</button>
                </div>
              ) : ORDERS.map(o => (
                <div key={o.id} style={{ background: "var(--surface)", borderRadius: 14, padding: "16px", marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>{o.id}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>📅 {o.date}</div>
                    </div>
                    <span style={{ background: STATUS_COLORS[o.status] || C.muted, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{STATUS_LABELS[o.status]}</span>
                  </div>
                  <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                    {o.items.map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: i < o.items.length - 1 ? 4 : 0 }}>📦 {item}</div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.hot }}>{fmt(o.total)}</span>
                    <button onClick={() => setTab("track")}
                      style={{ background: "var(--tint-blue)", color: "var(--info)", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🚚 Track</button>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 0 }}>
                    {TRACK_STEPS.map((s, i) => (
                      <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < o.steps ? C.green : i === o.steps - 1 ? C.primary : "var(--track)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                          {i < o.steps ? "✓" : i + 1}
                        </div>
                        {i < 3 && <div style={{ flex: 1, height: 2, background: i < o.steps - 1 ? C.green : "var(--track)" }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    {TRACK_STEPS.map(s => <span key={s} style={{ fontSize: 9, color: C.muted, flex: 1, textAlign: "center" }}>{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TRACK ORDER ── */}
          {tab === "track" && <TrackNotice />}

          {/* ── EDIT PROFILE ── */}
          {tab === "profile" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: C.primary, borderRadius: 4, display: "inline-block" }} /> Edit Profile
              </div>

              {/* Profile picture */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <div style={{ width: 90, height: 90, borderRadius: "50%", background: account.avatar ? "transparent" : C.primary, border: `4px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {account.avatar
                      ? <img src={account.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>{account.name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <button onClick={() => fileRef.current.click()}
                    style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: C.primary, border: "3px solid var(--surface)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>✏️</button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
                </div>
                <p style={{ fontSize: 12, color: C.muted }}>Tap the pencil to change your photo</p>
              </div>

              {/* Form */}
              {saveMsg && <div style={{ background: "var(--tint-gum)", border: "1px solid var(--line-gum)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--ok)", marginBottom: 14 }}>{saveMsg}</div>}

              <div style={{ background: C.bg, borderRadius: 12, padding: "16px", border: `1px solid ${C.border}`, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Account Info</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Verification</span>
                  <span style={{ background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 50 }}>✅ Verified via OTP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{account.method === "email" ? "Email" : "Phone"}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{account.contact}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Member Since</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{account.joined}</span>
                </div>
              </div>

              {editing ? (
                <div>
                  <Input label="Full Name" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name" />
                  <Input label={account.method === "email" ? "Email" : "Phone"} value={editContact} onChange={e => setEditContact(e.target.value)} placeholder={account.method === "email" ? "you@email.com" : "01XXXXXXXXX"} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="ghost" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</Btn>
                    <Btn onClick={saveProfile} style={{ flex: 2 }}>💾 Save Changes</Btn>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>Display Name</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{account.name}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{account.method === "email" ? "Email" : "Phone"}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{account.contact}</span>
                    </div>
                  </div>
                  <Btn onClick={() => setEditing(true)} style={{ width: "100%", padding: 13, borderRadius: 12 }}>✏️ Edit Profile</Btn>
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <button onClick={onLogout}
                  style={{ width: "100%", background: "var(--tint-earth)", border: "2px solid var(--line-earth)", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, color: "var(--danger)", cursor: "pointer", fontFamily: "inherit" }}>
                  🚪 Logout from Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PRODUCT DETAIL PAGE
// ─────────────────────────────────────────────────────────────
// ── REAL customer reviews only. Add them here as customers send them, keyed by product id:
//    "hoodie-okay": [{ name: "Customer name", rating: 5, date: "2026-11-02", text: "What they said" }],
//    A product with no reviews shows "No reviews yet" and a button to send one on WhatsApp.
const REVIEWS = {};

// ── Hoodie details (fabric, care and size chart), shown in the Description tab of every hoodie
const HOODIE_INFO = {
  points: ["300+ GSM, 100% cotton premium fabric", "Cotton fleece, brushed soft on the inside", "Export-quality stitching", "Rubber or DTF print", "Fabric and print colour guarantee", "Washable and durable"],
  specs: [["Material", "Cotton fleece (inside brushed)"], ["Fabric weight", "300+ GSM"], ["Print", "Rubber or DTF"], ["Care", "Machine washable"]],
  sizes: [["M", 40, 28, 23], ["L", 42, 29, 23.5], ["XL", 44, 30, 24], ["XXL", 46, 31, 24.5]],
};

function StarRating({ rating, size = 14 }) {
  return (
    <span style={{ color: C.accent, fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= rating ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

function ProductDetailPage({ product, onAdd, onBuyNow, onBack }) {
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [addedMsg, setAddedMsg] = useState(false);
  const [picSel, setPicSel] = useState({ id: null, k: 0 }); // which gallery photo is shown (resets per product)
  const pic = picSel.id === product.id ? picSel.k : 0;
  const setPic = k => setPicSel({ id: product.id, k });
  const pics = Array.isArray(product.images) && product.images.length ? product.images : (product.img ? [product.img] : []);
  const priced = product.price > 0;
  const cc = CATS.find(c => c.key === product.cat)?.color || C.primary;
  const disc = product.old ? Math.round((1 - product.price / product.old) * 100) : 0;
  const reviews = REVIEWS[product.id] || [];
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const isHoodie = product.cat === "hoodies";
  const waReview = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(`Review for ${product.name}: ⭐ _/5 — `)}`;

  const handleAdd = () => {
    onAdd(product, qty);
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2000);
  };

  return (
    <div style={{ background: "var(--night)", minHeight: "100vh" }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
          <span onClick={onBack} style={{ cursor: "pointer", color: C.hot, fontWeight: 600 }}>← Back</span>
          <span>/</span>
          <span onClick={onBack} style={{ cursor: "pointer" }}>Shop</span>
          <span>/</span>
          <span style={{ color: C.dark, fontWeight: 500 }}>{product.name.substring(0, 30)}{product.name.length > 30 ? "…" : ""}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 40px" }}>
        {/* Main product section */}
        <div className="oc-pdp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>

          {/* Image */}
          <div style={{ background: "var(--surface)", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
            <div style={{ height: 380, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,color-mix(in srgb, ${cc} 8%, transparent),color-mix(in srgb, ${cc} 2%, transparent))`, position: "relative" }}>
              {product.badge && (
                <span style={{ position: "absolute", top: 16, left: 16, background: product.badge === "Hot" ? C.accent : product.badge === "New" ? C.green : C.primary, color: product.badge === "Hot" ? "#1C1C1C" : "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{product.badge}</span>
              )}
              {disc > 0 && (
                <span style={{ position: "absolute", top: 16, right: 16, background: C.primary, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>-{disc}% OFF</span>
              )}
              {pics.length
                ? <img src={pics[Math.min(pic, pics.length - 1)]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                : <span style={{ fontSize: 120 }}>{product.icon || "📦"}</span>
              }
            </div>
            {pics.length > 1 && (
              <div style={{ display: "flex", gap: 8, padding: 12, overflowX: "auto", borderTop: `1px solid ${C.border}` }}>
                {pics.map((u, k) => (
                  <button key={u} onClick={() => setPic(k)} aria-label={`Photo ${k + 1}`} style={{ flex: "none", width: 62, height: 62, padding: 0, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "var(--surface)", border: `2px solid ${k === pic ? C.primary : C.border}` }}>
                    <img src={u} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, color: cc, fontWeight: 600, marginBottom: 8 }}>
                {CATS.find(c => c.key === product.cat)?.label}
              </div>
              <h1 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 800, fontStretch: "112%", color: C.dark, lineHeight: 1.12, margin: "0 0 12px" }}>{product.name}</h1>

              {/* Rating (real reviews only) */}
              {avgRating ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <StarRating rating={Math.round(parseFloat(avgRating))} size={16} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{avgRating}</span>
                  <button onClick={() => setActiveTab("reviews")} style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</button>
                </div>
              ) : (
                <button onClick={() => setActiveTab("reviews")} style={{ background: "none", border: "none", padding: 0, marginBottom: 14, fontSize: 12, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>No reviews yet</button>
              )}

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: priced ? 30 : 22, fontWeight: 900, color: C.hot }}>{priced ? fmt(product.price) : "Price coming soon"}</span>
                {product.old && <span style={{ fontSize: 16, color: C.muted, textDecoration: "line-through" }}>{fmt(product.old)}</span>}
              </div>
              {product.old && <div style={{ fontSize: 13, color: C.okText, fontWeight: 600, marginBottom: 14 }}>You save {fmt(product.old - product.price)} ({disc}% off)</div>}
            </div>

            {/* Features */}
            <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
              {[["🚚", "Delivery across Bangladesh", "Delivery fee depends on your area; timing is confirmed when your order is confirmed."], ["ℹ️", "Returns", "Contact us before ordering to confirm the applicable return conditions."], ["💵", "Cash on Delivery", "Pay when your order arrives"], ["💬", "Order confirmation", "We confirm product availability with you on WhatsApp."]].map(([ic, t, d]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, lastChild: { marginBottom: 0 } }}>
                  <span style={{ fontSize: 16 }}>{ic}</span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{t}</span>
                    <span style={{ fontSize: 12, color: C.muted }}> — {d}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Qty + Buttons */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Quantity:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: `2px solid ${C.border}`, borderRadius: 10, padding: "4px 10px" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.dark, fontWeight: 700, width: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ fontSize: 15, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(99, q + 1))} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.dark, fontWeight: 700, width: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                {priced && <span style={{ fontSize: 12, color: C.muted }}>Total: <strong style={{ color: C.hot }}>{fmt(product.price * qty)}</strong></span>}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleAdd} disabled={!priced}
                  style={{ opacity: priced ? 1 : .45, cursor: priced ? "pointer" : "not-allowed", flex: 1, background: addedMsg ? "var(--gum)" : "transparent", color: addedMsg ? "#fff" : C.dark, border: `2px solid ${addedMsg ? C.green : C.primary}`, borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s" }}>
                  {addedMsg ? "✅ Added!" : "🛒 Add to Cart"}
                </button>
                <button onClick={() => { onAdd(product, qty); onBuyNow(); }} disabled={!priced}
                  style={{ opacity: priced ? 1 : .45, cursor: priced ? "pointer" : "not-allowed", flex: 1, background: C.primary, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
                  ⚡ Buy Now
                </button>
              </div>

              <a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20I%20want%20to%20order:%20${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 10, background: "#25D366", color: "#05210F", textDecoration: "none", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, boxSizing: "border-box" }}>
                💬 Order via WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Tabs: Description / How to order / Reviews */}
        <div style={{ background: "var(--surface)", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
          <div role="tablist" style={{ display: "flex", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            {[["description", "📋 Description"], ["how", "🛒 How to Order"], ["reviews", `⭐ Reviews${reviews.length ? ` (${reviews.length})` : ""}`]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={activeTab === k} onClick={() => setActiveTab(k)}
                style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: "14px 6px", fontSize: "clamp(12px, 3.3vw, 14px)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", color: activeTab === k ? C.hot : C.muted, borderBottom: `3px solid ${activeTab === k ? C.primary : "transparent"}`, transition: "all .2s" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {activeTab === "description" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: C.dark }}>{product.name}</h3>
                {isHoodie ? (
                  <>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "8px 18px" }}>
                      {HOODIE_INFO.points.map(t => (
                        <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
                          <span style={{ flex: "none", width: 20, height: 20, borderRadius: "50%", background: `color-mix(in srgb, ${C.primary} 8%, transparent)`, color: C.hot, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>✓</span>{t}
                        </li>
                      ))}
                    </ul>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 22 }}>
                      {HOODIE_INFO.specs.map(([k, v]) => (
                        <div key={k} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .4, marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px", color: C.dark }}>📏 Size chart</h4>
                    <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px" }}>Measurements in inches · expected deviation under 3%</p>
                    <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: C.deep, color: "#fff" }}>
                            {["Size", "Chest", "Length", "Sleeve"].map(h => <th key={h} style={{ padding: "10px clamp(8px, 2.5vw, 14px)", textAlign: "left", fontSize: 12, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase" }}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {HOODIE_INFO.sizes.map((r, i) => (
                            <tr key={r[0]} style={{ background: i % 2 ? C.bg : "var(--surface)", borderTop: `1px solid ${C.border}` }}>
                              <td style={{ padding: "10px clamp(8px, 2.5vw, 14px)", fontWeight: 800, color: C.hot }}>{r[0]}</td>
                              {r.slice(1).map((v, k) => <td key={k} style={{ padding: "10px clamp(8px, 2.5vw, 14px)", color: C.dark }}>{v}"</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: "10px 0 20px" }}>Tip: measure a hoodie you already own (armpit to armpit × 2 for chest) and pick the closest size.</p>
                  </>
                ) : Array.isArray(product.details) && product.details.length ? (
                  <ul style={{ margin: "0 0 18px", paddingLeft: 20, color: "var(--text-2)", fontSize: 14, lineHeight: 1.8 }}>
                    {product.details.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                ) : (
                  <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, marginBottom: 16 }}>
                    {product.name} is a quality product from Outback Cartel, checked before dispatch so you receive exactly what you ordered.
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                  {[["Category", CATS.find(c => c.key === product.cat)?.label || product.cat], ["Condition", product.condition || "See product details"], ["Delivery", "Nationwide Bangladesh"], ["Returns", "Ask us to confirm the applicable conditions"], ["Payment", "Cash on delivery"]].map(([k, v]) => (
                    <div key={k} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .4, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "how" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", color: C.dark }}>How to order</h3>
                <p style={{ fontSize: 13, color: C.muted, margin: "0 0 18px" }}>Five quick steps. No account needed.</p>
                <ol style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "grid", gap: 12 }}>
                  {[
                    ["Choose your size" + (product.colors && product.colors.length > 1 ? " and colour" : ""), isHoodie ? "Check the size chart in the Description tab. You pick your size before you send the order." : "Check the details in the Description tab."],
                    ["Add to cart or Buy Now", `Add as many items as you like. Delivery is free on orders of ${fmt(FREE_DELIVERY_FROM)} or more.`],
                    ["Send your order on WhatsApp", "Checkout types your order into a WhatsApp message. Press Send there, and we reply to confirm it."],
                    ["Pay cash on delivery", "You pay when your order arrives."],
                    ["Delivery", `After we confirm your order on WhatsApp, we deliver it: ${DELIVERY_ZONES.map(z => `${z.name} ${z.days}`).join(", ")}.`],
                  ].map(([t, d], i) => (
                    <li key={t} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                      <span style={{ flex: "none", width: 32, height: 32, borderRadius: "50%", background: C.primary, color: "#fff", fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.dark, marginBottom: 2 }}>{t}</div>
                        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{d}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", background: C.bg, fontSize: 12, fontWeight: 800, color: C.dark, padding: "10px 14px" }}><span>Location</span><span>Time</span><span>Charge</span></div>
                  {DELIVERY_ZONES.map(z => [z.name, z.days, fmt(z.fee)]).map(([a, b, c]) => (
                    <div key={a} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", fontSize: 13, color: "var(--text-2)", padding: "10px 14px", borderTop: `1px solid ${C.border}` }}><span>{a}</span><span>{b}</span><span>{c}</span></div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 16 }}>
                  {[["⏱️", "Changed your mind?", "Cancel within 2 hours, before dispatch"], ["⏱️", "Changed your mind?", "Cancel within 2 hours, before dispatch"], ["🔄", "Easy returns", "Returns — contact us for conditions if it isn't right"]].map(([ic, t, d]) => (
                    <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <span style={{ fontSize: 20 }}>{ic}</span>
                      <div><div style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>{t}</div><div style={{ fontSize: 12, color: C.muted }}>{d}</div></div>
                    </div>
                  ))}
                </div>
                <a href={`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(`Hi! I want to order: ${product.name}`)}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: "var(--tint-gum)", border: "1px solid var(--line-gum)", borderRadius: 12, padding: "14px 16px", color: C.dark }}>
                  <span style={{ fontSize: 26 }}>💬</span>
                  <span><strong style={{ display: "block", fontSize: 14 }}>Prefer WhatsApp?</strong><span style={{ fontSize: 13, color: "var(--text-2)" }}>Text us on {CONFIG.WHATSAPP_DISPLAY} with the product name and your size (text only).</span></span>
                </a>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                {reviews.length ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "16px 20px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 44, fontWeight: 900, color: C.hot, lineHeight: 1 }}>{avgRating}</div>
                        <StarRating rating={Math.round(parseFloat(avgRating))} size={18} />
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {[5, 4, 3, 2, 1].map(star => {
                          const pct = Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100);
                          return (
                            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: C.muted, width: 12 }}>{star}</span>
                              <span style={{ color: C.accent, fontSize: 11 }}>★</span>
                              <div style={{ flex: 1, height: 6, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, color: C.muted, width: 26 }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {reviews.map((r, i) => (
                      <div key={i} style={{ padding: "16px 0", borderBottom: i < reviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{r.name[0]}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: C.muted }}>{r.date}</div>
                            </div>
                          </div>
                          <StarRating rating={r.rating} size={13} />
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 0 46px" }}>{r.text}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "26px 10px 10px" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>⭐</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 6 }}>No reviews yet</div>
                    <p style={{ fontSize: 13, color: C.muted, margin: "0 auto 16px", maxWidth: 380, lineHeight: 1.6 }}>Bought this? Tell us what you think. Your review will appear here after we've checked it.</p>
                  </div>
                )}
                <div style={{ textAlign: "center", marginTop: reviews.length ? 18 : 0 }}>
                  <a href={waReview} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.deep, color: "#fff", textDecoration: "none", padding: "11px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700 }}>✍️ Write a review on WhatsApp</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PRODUCT CARD
// ─────────────────────────────────────────────────────────────
function ProductCard({ p, onAdd, onView }) {
  const disc = p.old && p.price > 0 ? Math.round((1 - p.price / p.old) * 100) : 0;
  const catLabel = CATS.find(c => c.key === p.cat)?.label;
  const priced = p.price > 0;
  return (
    <article className="ocp-card">
      {(p.badge || disc > 0) && (
        <div className="ocp-tags">
          {p.badge ? <span className="ocp-badge" data-k={p.badge}>{p.badge}</span> : <span />}
          {disc > 0 && <span className="ocp-off">−{disc}%</span>}
        </div>
      )}
      {/* Clickable image area → product page */}
      <button className="ocp-img" onClick={() => onView(p)} aria-label={`View ${p.name}`}>
        {p.img ? <img src={p.img} alt="" loading="lazy" decoding="async" onError={e => e.target.style.display = "none"} /> : <span className="ocp-ph">{p.icon || "📦"}</span>}
      </button>
      <div className="ocp-body">
        <button className="ocp-link" onClick={() => onView(p)}>
          {catLabel && <div className="ocp-cat">{catLabel}</div>}
          <div className="ocp-title">{p.name}</div>
          <div className="ocp-price">
            {priced ? <b>{fmt(p.price)}</b> : <em>Price coming soon</em>}
            {priced && p.old && <s>{fmt(p.old)}</s>}
          </div>
        </button>
        {/* Action buttons */}
        <div className="ocp-btns">
          <button className="ocp-add" onClick={() => priced ? onAdd(p) : onView(p)} style={{ opacity: priced ? 1 : .5 }}>Add to cart</button>
          <button className="ocp-view" onClick={() => onView(p)}>View</button>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
//  CART SIDEBAR
// ─────────────────────────────────────────────────────────────
// Delivery fee and time by area: the ONE place these numbers live. Checkout, the FAQ, the product
// page, the help chat and the shop strip all read this table, so they can no longer disagree.
const DELIVERY_ZONES = [
  { k: "inside", name: "Inside Dhaka", days: "Timing confirmed on order", fee: 60 },
  { k: "sub", name: "Dhaka Sub Area", days: "Timing confirmed on order", fee: 100 },
  { k: "outside", name: "Outside Dhaka", days: "Timing confirmed on order", fee: 120 },
];
const FREE_DELIVERY_FROM = 999; // a subtotal of this much or more gets free delivery
const zoneLabel = z => `${z.name} (${z.days}) — ${fmt(z.fee)}`;

function CartSidebar({ cart, open, onClose, onQty, onRemove, onCheckout }) {
  const sub = cart.reduce((s, c) => s + c.price * c.qty, 0), total = sub;
  return (
    <>{open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(4,3,16,.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 640 }} />}
      <div style={{ position: "fixed", top: 0, right: open ? 0 : -440, bottom: 0, width: "100%", maxWidth: 420, background: "var(--surface)", zIndex: 641, borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", boxShadow: "-6px 0 30px rgba(0,0,0,.15)", transition: "right .32s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>🛒 Cart ({cart.reduce((s, c) => s + c.qty, 0)})</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {cart.length === 0 ? <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}><div style={{ fontSize: 52, marginBottom: 12 }}>🛒</div><p>Your cart is empty!</p></div>
            : cart.map(item => (
              <div key={item.cartKey || item.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 58, height: 58, borderRadius: 12, background: "var(--dawn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>{item.img ? <img src={item.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>{item.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.hot }}>{fmt(item.price * item.qty)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                    <button onClick={() => onQty(item.cartKey || item.id, -1)} style={{ width: 24, height: 24, border: `2px solid ${C.border}`, background: "var(--surface)", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => onQty(item.cartKey || item.id, 1)} style={{ width: 24, height: 24, border: `2px solid ${C.border}`, background: "var(--surface)", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
                <button onClick={() => onRemove(item.cartKey || item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, alignSelf: "flex-start", padding: 4 }}>🗑</button>
              </div>
            ))}
        </div>
        {cart.length > 0 && <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 6 }}><span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(sub)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 10 }}><span>Delivery</span><span style={{ color: sub >= FREE_DELIVERY_FROM ? C.okText : "inherit", fontWeight: 600 }}>{sub >= FREE_DELIVERY_FROM ? "FREE ✅" : "Calculated at checkout"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, paddingTop: 10, borderTop: `1px solid ${C.border}`, marginBottom: 14 }}><span>{sub < FREE_DELIVERY_FROM ? "Total (before delivery)" : "Total"}</span><span style={{ color: C.hot }}>{fmt(total)}</span></div>
          <Btn onClick={onCheckout} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }}>Checkout →</Btn>
          {sub < FREE_DELIVERY_FROM && <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 7 }}>Add {fmt(FREE_DELIVERY_FROM - sub)} more for free delivery!</p>}
        </div>}
      </div></>
  );
}

// ─────────────────────────────────────────────────────────────
//  CHECKOUT — real order submission (cash on delivery)
// ─────────────────────────────────────────────────────────────
// Orders are POSTed to /api/orders, validated server-side against the trusted
// catalogue, and persisted to the database. The customer receives a reference
// number and can contact WhatsApp support with questions.
const DISTRICTS = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Mymensingh", "Rangpur", "Comilla", "Gazipur", "Narayanganj", "Cox's Bazar", "Jessore", "Bogura", "Other"];
const sizeChoices = i => (Array.isArray(i.sizes) ? i.sizes.filter(Boolean) : []);
const colourChoices = i => (Array.isArray(i.colors) ? i.colors.filter(Boolean) : []);

/** Generate a simple idempotency key: timestamp + random suffix */
function makeIdempotencyKey() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 14);
  return `oc-${ts}-${rand}`.padEnd(16, "0");
}

function CheckoutModal({ cart, open, onClose, onClearCart, account }) {
  const [form, setForm] = useState({ name: account?.name || "", phone: account?.method === "phone" ? account?.contact || "" : "", district: "", zone: "", area: "", address: "" });
  const [picks, setPicks] = useState({});    // size / colour chosen here, per cart line
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form");  // "form" → "submitting" → "confirmed" | "error"
  const [orderResult, setOrderResult] = useState(null); // server response on success
  const [submitError, setSubmitError] = useState("");
  const sub = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const zone = DELIVERY_ZONES.find(z => z.k === form.zone) || null;
  const free = sub >= FREE_DELIVERY_FROM;
  const del = free ? 0 : (zone ? zone.fee : 0), total = sub + del;
  const delText = free ? "FREE" : zone ? fmt(del) : "choose your area";
  const totalText = free || zone ? fmt(total) : `${fmt(sub)} + delivery`;
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };
  const pick = (id, k, v) => { setPicks(p => ({ ...p, [id]: { ...p[id], [k]: v } })); setErrors(e => ({ ...e, [`${k}-${id}`]: "" })); };
  const validate = () => {
    const e = {};
    if (!cart.length) e.cart = "Your cart is empty. Add a product before checkout.";
    cart.forEach(i => {
      if (!Number.isSafeInteger(Number(i.qty)) || Number(i.qty) < 1 || Number(i.qty) > 99 ||
          !Number.isFinite(Number(i.price)) || Number(i.price) < 0 || !String(i.name || "").trim()) {
        e.cart = "A cart item needs refreshing. Please remove it and add it again.";
      }
    });
    if (!form.zone) e.zone = "Choose your delivery area";
    cart.forEach(i => {
      const lineKey = i.cartKey || i.id;
      if (sizeChoices(i).length && !picks[lineKey]?.size) e[`size-${lineKey}`] = "Choose a size";
      if (colourChoices(i).length > 1 && !picks[lineKey]?.color) e[`color-${lineKey}`] = "Choose a colour";
    });
    if (!form.name.trim()) e.name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.district) e.district = "Required";
    if (!form.address.trim()) e.address = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const close = () => { setStep("form"); setSubmitError(""); setOrderResult(null); onClose(); };

  const submitOrder = async () => {
    if (!validate()) return;
    setStep("submitting");
    setSubmitError("");
    try {
      const items = cart.map(i => {
        const lineKey = i.cartKey || i.id, p = picks[lineKey] || {}, colours = colourChoices(i);
        const colour = p.color || (colours.length === 1 ? colours[0] : null);
        const size = p.size || null;
        // Build variantId the same way the server catalogue does
        let variantId = null;
        if (size && colour) variantId = `${size}-${colour}`.toLowerCase();
        else if (colour) variantId = String(colour).toLowerCase();
        else if (size) variantId = String(size).toLowerCase();
        return { productId: i.id, variantId, quantity: i.qty };
      });
      const payload = {
        customer: { name: form.name.trim(), phone: form.phone.trim(), district: form.district, area: form.area.trim(), address: form.address.trim() },
        deliveryZone: form.zone,
        items,
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": makeIdempotencyKey() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOrderResult(data);
        setStep("confirmed");
      } else {
        setSubmitError(data.error || `Something went wrong (${res.status}). Please try again.`);
        setStep("error");
      }
    } catch (e) {
      setSubmitError("Could not connect to the server. Check your internet and try again.");
      setStep("error");
    }
  };

  const iS = k => ({ width: "100%", border: `2px solid ${errors[k] ? C.primary : C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", color: C.dark, background: "var(--surface)" });
  const label = { fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6, marginBottom: 10 };
  const err = k => errors[k] && <span style={{ color: C.hot, fontSize: 11 }}>{errors[k]}</span>;
  if (!open) return null;
  const frame = body => (<div style={{ position: "fixed", inset: 0, background: "rgba(4,3,16,.72)", zIndex: 660, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div role="dialog" aria-modal="true" aria-label="Checkout" style={{ background: "var(--surface)", borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.28)" }}>{body}</div></div>);

  // order confirmed
  if (step === "confirmed" && orderResult) return frame(<div style={{ padding: "30px 24px 24px", textAlign: "center" }}>
    <div style={{ fontSize: 46, marginBottom: 8 }} aria-hidden="true">✅</div>
    <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: C.dark }}>Order placed!</h2>
    <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 6px" }}>Your order reference:</p>
    <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: C.hot, letterSpacing: 1, margin: "0 0 14px", background: C.bg, borderRadius: 10, padding: "12px 16px", border: `1px solid ${C.border}` }}>{orderResult.publicReference}</div>
    <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 6px" }}>Total: <strong>{fmt(orderResult.totalBdt)}</strong> — Cash on delivery</p>
    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: "0 0 18px" }}>We'll review your order and confirm it soon. Questions? WhatsApp us on {CONFIG.WHATSAPP_DISPLAY} with your reference number.</p>
    <Btn onClick={() => { onClearCart(); setPicks({}); close(); }} style={{ width: "100%", padding: 13, borderRadius: 12, marginBottom: 8 }}>Done</Btn>
  </div>);

  // submitting
  if (step === "submitting") return frame(<div style={{ padding: "50px 24px", textAlign: "center" }}>
    <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite" }}>⏳</div>
    <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Placing your order…</p>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
  </div>);

  // error after submit
  if (step === "error") return frame(<div style={{ padding: "30px 24px 24px", textAlign: "center" }}>
    <div style={{ fontSize: 46, marginBottom: 8 }} aria-hidden="true">⚠️</div>
    <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: C.dark }}>Order could not be placed</h2>
    <p style={{ fontSize: 13, color: C.hot, lineHeight: 1.7, margin: "0 0 14px" }}>{submitError}</p>
    <Btn onClick={() => setStep("form")} style={{ width: "100%", padding: 13, borderRadius: 12, marginBottom: 8 }}>Try again</Btn>
    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: "6px 0 0" }}>Or WhatsApp us at {CONFIG.WHATSAPP_DISPLAY} to place your order.</p>
  </div>);

  return frame(<>
    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--surface)", zIndex: 1, borderRadius: "18px 18px 0 0" }}><span style={{ fontSize: 16, fontWeight: 800 }}>🧾 Checkout</span><button onClick={close} aria-label="Close checkout" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>✕</button></div>
    <div style={{ padding: "18px 22px" }}>
      <div style={label}>📦 Your order</div>
      <div style={{ background: C.bg, borderRadius: 10, padding: "6px 12px 10px", marginBottom: 16, border: `1px solid ${C.border}` }}>
        {cart.map(i => { const sizes = sizeChoices(i), colours = colourChoices(i); return (
          <div key={i.cartKey || i.id} style={{ padding: "8px 0", borderBottom: `1px dashed ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}><span>{i.icon} {i.name} × {i.qty}</span><span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(i.price * i.qty)}</span></div>
            {(sizes.length > 0 || colours.length > 1) && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {sizes.length > 0 && <select aria-label={`Size for ${i.name}`} value={picks[i.cartKey || i.id]?.size || ""} onChange={e => pick(i.cartKey || i.id, "size", e.target.value)} style={{ ...iS(`size-${i.cartKey || i.id}`), width: "auto", padding: "7px 10px", fontSize: 12, cursor: "pointer" }}><option value="">Size *</option>{sizes.map(s => <option key={s} value={s}>{s}</option>)}</select>}
              {colours.length > 1 && <select aria-label={`Colour for ${i.name}`} value={picks[i.cartKey || i.id]?.color || ""} onChange={e => pick(i.cartKey || i.id, "color", e.target.value)} style={{ ...iS(`color-${i.cartKey || i.id}`), width: "auto", padding: "7px 10px", fontSize: 12, cursor: "pointer" }}><option value="">Colour *</option>{colours.map(c => <option key={c} value={c}>{c}</option>)}</select>}
            </div>}
            {err(`size-${i.cartKey || i.id}`)}{err(`color-${i.cartKey || i.id}`)}
          </div>); })}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, paddingTop: 8 }}><span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(sub)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, paddingTop: 4 }}><span>Delivery</span><span style={{ color: free ? C.okText : "inherit", fontWeight: 600 }}>{free || zone ? delText : "Choose your area below"}</span></div>
      </div>

      {err("cart")}
      <div style={label}>🚚 Delivery area</div>
      <div style={{ marginBottom: 16 }}><select value={form.zone} onChange={e => set("zone", e.target.value)} aria-label="Delivery area" style={{ ...iS("zone"), cursor: "pointer" }}><option value="">Choose your delivery area *</option>{DELIVERY_ZONES.map(z => <option key={z.k} value={z.k}>{zoneLabel(z)}</option>)}</select>{err("zone")}{free && <div style={{ fontSize: 11, color: C.okText, marginTop: 4 }}>Free delivery: your order is {fmt(FREE_DELIVERY_FROM)} or more.</div>}</div>

      <div style={label}>👤 Your details</div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ marginBottom: 11 }}><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name *" aria-label="Full name" autoComplete="name" style={iS("name")} />{err("name")}</div>
        <div style={{ marginBottom: 11 }}><input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone *" aria-label="Phone" type="tel" autoComplete="tel" style={iS("phone")} />{err("phone")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
          <div><select value={form.district} onChange={e => set("district", e.target.value)} aria-label="District" style={{ ...iS("district"), cursor: "pointer" }}><option value="">District *</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select>{err("district")}</div>
          <div><input value={form.area} onChange={e => set("area", e.target.value)} placeholder="Area" aria-label="Area" style={iS("area")} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address *" aria-label="Full address" autoComplete="street-address" style={iS("address")} />{err("address")}</div>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 22 }} aria-hidden="true">💵</span><div><div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Cash on delivery</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Pay when your order arrives. Online payment isn't available yet.</div></div></div>
    </div>
    <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, background: C.bg, borderRadius: "0 0 18px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, marginBottom: 12 }}><span>Total</span><span style={{ color: C.hot }}>{totalText}</span></div>
      <Btn onClick={submitOrder} style={{ width: "100%", padding: 15, fontSize: 15, borderRadius: 12 }}>Place order — {totalText}</Btn>
      <p style={{ fontSize: 11.5, color: C.muted, textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>Cash on delivery. We'll confirm your order and delivery timing.</p>
    </div>
  </>);
}

// ─────────────────────────────────────────────────────────────
//  SIDE DRAWER
// ─────────────────────────────────────────────────────────────
function SideDrawer({ open, onClose, activeCat, onCat, onNav, account, onAccountOpen, onLogout }) {
  return (
    <>{open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 400 }} />}
      <div style={{ position: "fixed", top: 0, left: open ? 0 : -320, bottom: 0, width: 290, background: "var(--surface)", zIndex: 401, display: "flex", flexDirection: "column", boxShadow: "6px 0 32px rgba(0,0,0,.18)", transition: "left .3s cubic-bezier(.4,0,.2,1)", overflowY: "auto" }}>
        <div style={{ background: "var(--grad-deep)", padding: "20px 18px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontStretch: "125%", fontWeight: 800, fontSize: 18, letterSpacing: ".02em", textTransform: "uppercase", color: "#fff", lineHeight: 1 }}>Outback Cartel</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          {account ? (
            <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: account.avatar ? "transparent" : C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, overflow: "hidden", border: "2px solid rgba(255,255,255,.3)" }}>
                {account.avatar ? <img src={account.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{account.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.contact}</div></div>
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "rgba(255,255,255,.8)", fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => { onClose(); onAccountOpen(); }} style={{ width: "100%", background: "rgba(255,255,255,.1)", border: "2px dashed rgba(255,255,255,.2)", borderRadius: 12, padding: "11px 14px", color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>👤</span>
              <div style={{ textAlign: "left" }}><div style={{ fontSize: 13, fontWeight: 700 }}>Sign in / Sign up</div><div style={{ fontSize: 11, opacity: .6 }}>Optional — shop without account</div></div>
            </button>
          )}
        </div>
        <div style={{ padding: "10px 0", flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, padding: "8px 18px 8px" }}>Categories</div>
          {CATS.map(c => (
            <button key={c.key} onClick={() => { onCat(c.key); onClose(); }} style={{ width: "100%", background: activeCat === c.key ? `color-mix(in srgb, ${c.color} 7%, transparent)` : "transparent", border: "none", borderLeft: activeCat === c.key ? `3px solid ${c.color}` : "3px solid transparent", padding: "11px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", color: activeCat === c.key ? c.color : C.dark }}
              onMouseEnter={e => { if (activeCat !== c.key) e.currentTarget.style.background = "var(--inset)"; }} onMouseLeave={e => { if (activeCat !== c.key) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{c.icon}</span>
              <span style={{ fontSize: 13, fontWeight: activeCat === c.key ? 700 : 500 }}>{c.label}</span>
            </button>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, padding: "0 18px 8px" }}>Help</div>
          {[["🏕️", "About Us", "about"], ["📦", "Track Order", "track"], ["🔄", "Return Policy", "returns"], ["❓", "FAQ", "faq"]].map(([ic, l, p]) => (
            <button key={p} onClick={() => { onNav(p); onClose(); }} style={{ width: "100%", background: "transparent", border: "none", padding: "10px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", color: C.dark, fontSize: 13 }} onMouseEnter={e => e.currentTarget.style.background = "var(--inset)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><span style={{ fontSize: 17 }}>{ic}</span>{l}</button>
          ))}
          <a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", textDecoration: "none", color: "#25D366", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 17 }}>💬</span> WhatsApp Us</a>
        </div>
      </div></>
  );
}

// ─────────────────────────────────────────────────────────────
//  INFO PAGES
// ─────────────────────────────────────────────────────────────
function PageHero({ icon, title, subtitle }) { return <div className="oc-pagehero"><span className="ic" aria-hidden="true">{icon}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>; }
function ICard({ children, style = {} }) { return <div style={{ background: "var(--surface)", borderRadius: 18, padding: "22px", boxShadow: "inset 0 0 0 1px var(--line)", marginBottom: 14, color: C.dark, ...style }}>{children}</div>; }
function ITitle({ children }) { return <h2 style={{ fontSize: 19, fontWeight: 800, fontStretch: "112%", color: C.dark, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 16, height: 2, background: "var(--earth)", borderRadius: 2, display: "inline-block" }} />{children}</h2>; }

function AboutPage() { return <div><PageHero icon="🏕️" title="About Outback Cartel" subtitle="Born in Bangladesh, built for Bangladesh." /><div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}><ICard><ITitle>Our Story</ITitle><p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.85 }}>Outback Cartel started with one idea: <strong>Bangladeshi shoppers deserve better.</strong> We curate electronics, beauty tech, travel gear, smart bags, gaming lifestyle products and more — all carefully selected for quality and value.</p></ICard><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{[["🎯", "Mission", "Quality products at fair prices for all Bangladeshis."], ["🤝", "Honesty", "No hidden fees, no fake reviews."]].map(([icon, t, d]) => <ICard key={t} style={{ marginBottom: 0 }}><div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{t}</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{d}</div></ICard>)}</div></div></div>; }

// Honest stand-in until orders are saved on the server: there is no order record to look up yet.
function TrackNotice() { return <ICard style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }} aria-hidden="true">💬</div><div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Order tracking isn't on the website yet</div><p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 14px" }}>For now, orders are placed by WhatsApp message, so there is no order number to look up here. Message us on WhatsApp for an update on your order.</p><a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#25D366", color: "#05210F", textDecoration: "none", padding: "10px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700 }}>💬 WhatsApp {CONFIG.WHATSAPP_DISPLAY}</a></ICard>; }

function TrackPage() { return <div><PageHero icon="📦" title="Track Your Order" subtitle="Online order tracking is not available yet." /><div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}><TrackNotice /></div></div>; }

function ReturnsPage() { const ok = ["Damaged or broken on arrival", "Wrong item delivered", "Defective on arrival", "Missing parts"], no = ["After 7 days", "Used or altered items", "Change of mind"]; return <div><PageHero icon="🔄" title="Return Policy" subtitle="Returns — contact us for conditions." /><div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}><div style={{ background: `linear-gradient(135deg,${C.green},#1a5c35)`, borderRadius: 14, padding: "20px 22px", marginBottom: 14, color: "#fff", display: "flex", alignItems: "center", gap: 14 }}><span style={{ fontSize: 40 }}>✅</span><div><div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>Returns — contact us for conditions</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.8)" }}>Please contact us to confirm the applicable return conditions.</div></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}><ICard style={{ marginBottom: 0 }}><ITitle>✅ Eligible</ITitle>{ok.map(e => <div key={e} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ color: C.okText, fontWeight: 700 }}>✓</span>{e}</div>)}</ICard><ICard style={{ marginBottom: 0 }}><ITitle>❌ Not Eligible</ITitle>{no.map(e => <div key={e} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ color: C.hot, fontWeight: 700 }}>✕</span>{e}</div>)}</ICard></div><ICard style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>💬</div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Start a return on WhatsApp</div><a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20Return%20request.%20Order:%20`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#25D366", color: "#05210F", textDecoration: "none", padding: "11px 24px", borderRadius: 50, fontSize: 14, fontWeight: 700 }}>💬 Start Return</a></ICard></div></div>; }

function FAQPage() { const [open, setOpen] = useState(null); const faqs = [{ cat: "🛒 Ordering", items: [{ q: "How do I place an order?", a: "Add items to your cart and open checkout. For now, checkout types your order into a WhatsApp message: we receive it only when you press Send in WhatsApp, and we reply there to confirm it." }, { q: "Can I order by WhatsApp?", a: `Yes! Text us on ${CONFIG.WHATSAPP_DISPLAY}. (Text only — no calls.)` }, { q: "Is there a minimum order?", a: `No minimum. Orders of ${fmt(FREE_DELIVERY_FROM)} or more get free delivery; below that, the fee for your area is shown at checkout.` }, { q: "Can I cancel after placing?", a: "Yes, within 2 hours before dispatch. WhatsApp us immediately." }] }, { cat: "🚚 Delivery", items: [{ q: "How long does delivery take?", a: DELIVERY_ZONES.map(z => `${z.name}: ${z.days}`).join(". ") + "." }, { q: "Do you deliver everywhere?", a: "Yes — all 64 districts of Bangladesh." }, { q: "What if I'm not home?", a: "Courier tries twice. After 2 attempts package returns — contact us to reschedule." }] }, { cat: "💳 Payment", items: [{ q: "What payment methods?", a: "Cash on delivery: you pay when your order arrives. Online payment isn't available yet." }, { q: "Cash on Delivery available?", a: "Yes. For now it's the only way to pay." }] }, { cat: "📦 Products", items: [{ q: "Are products authentic?", a: "Sourced from verified suppliers. If it doesn't match, return for a full refund." }, { q: "Damaged product — what do I do?", a: "Take photos and WhatsApp us within 24 hours. We replace or refund fast." }, { q: "Out of stock — can I pre-order?", a: "Yes! WhatsApp us the product name and we'll source it." }] }]; return <div><PageHero icon="❓" title="FAQ" subtitle="Quick answers." /><div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>{faqs.map((sec, si) => <div key={sec.cat} style={{ marginBottom: 24 }}><h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 4, height: 18, background: C.primary, borderRadius: 4, display: "inline-block" }} />{sec.cat}</h2>{sec.items.map((item, ii) => { const k = `${si}-${ii}`, isO = open === k; return <div key={ii} style={{ background: "var(--surface)", borderRadius: 11, marginBottom: 7, border: `1px solid ${isO ? C.primary : C.border}`, overflow: "hidden" }}><button onClick={() => setOpen(isO ? null : k)} style={{ width: "100%", background: "none", border: "none", padding: "14px 18px", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" }}><span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.q}</span><span style={{ fontSize: 18, color: isO ? C.hot : C.muted, transform: isO ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span></button>{isO && <div style={{ padding: "0 18px 14px", fontSize: 13, color: "var(--text-2)", lineHeight: 1.75, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>{item.a}</div>}</div>; })} </div>)}<ICard style={{ textAlign: "center", background: "var(--grad-deep)", border: "none" }}><div style={{ color: "#fff" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div><div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Still have a question?</div><a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#25D366", color: "#05210F", textDecoration: "none", padding: "11px 24px", borderRadius: 50, fontSize: 14, fontWeight: 700 }}>💬 {CONFIG.WHATSAPP_DISPLAY}</a></div></ICard></div></div>; }

// ─────────────────────────────────────────────────────────────
//  ADMIN — switched off
// ─────────────────────────────────────────────────────────────
// The old admin screen checked a password inside the browser, where anyone could read it, and saved
// edits only in that one browser. It is removed until staff sign-in is checked on the server
// (Phase 1, Task 2). The old code is in git history (commit d8b3737) if it is ever needed.

// ─────────────────────────────────────────────────────────────
//  AI CHATBOT — Smart built-in engine (no backend needed)
// ─────────────────────────────────────────────────────────────

// Knowledge base with intent matching
const KB = [
  // Greetings
  { tags: ["hi", "hello", "hey", "helo", "hlw", "hii", "salam", "assalam", "নমস্কার", "হ্যালো", "হ্যালো", "কেমন"], reply: "Hi there! 👋 Welcome to **Outback Cartel**! I'm Carla, your shopping assistant.\n\nHow can I help you today? 😊" },
  { tags: ["how are you", "how r u", "whats up", "what's up", "kemon", "কেমন আছো", "কেমন আছেন"], reply: "I'm doing great, thanks for asking! 😄 I'm here to help you shop at **Outback Cartel**. What can I do for you?" },
  { tags: ["good morning", "morning", "good evening", "evening", "good night", "night"], reply: "Good day! 🌟 Welcome to Outback Cartel. How can I assist you today?" },
  { tags: ["thanks", "thank you", "thank", "ধন্যবাদ", "thx", "ty"], reply: "You're welcome! 😊 Is there anything else I can help you with?" },
  { tags: ["ok", "okay", "alright", "sure", "got it", "fine"], reply: "Great! 👍 Let me know if you need anything else." },
  { tags: ["bye", "goodbye", "see you", "tata", "later"], reply: "Goodbye! 👋 Thanks for shopping at Outback Cartel. Come back soon! 🛍️" },

  // Payment
  { tags: ["payment", "pay", "bkash", "nagad", "rocket", "card", "cash", "cod", "deliver on", "দেওয়া", "পেমেন্ট", "পেমেন্ট করব", "কীভাবে পেমেন্ট"], reply: "💵 For now we take **cash on delivery** only: you pay when your order arrives.\n\nOnline payment is not available yet." },

  // Delivery
  { tags: ["delivery", "deliver", "shipping", "ship", "কতদিন", "কতদিনে", "কবে পাব", "পৌঁছাবে", "দিন"], reply: "🚚 Delivery times:\n\n" + DELIVERY_ZONES.map(z => `• **${z.name}**: ${z.days}`).join("\n") + "\n\nWe deliver to all **64 districts** of Bangladesh! 🇧🇩" },
  { tags: ["free delivery", "free shipping", "free", "মুফত", "বিনামূল্যে", "ফ্রি ডেলিভারি"], reply: `🎉 **Free delivery** on orders of ${fmt(FREE_DELIVERY_FROM)} or more!\n\nBelow that, delivery costs ${DELIVERY_ZONES.map(z => `${fmt(z.fee)} (${z.name})`).join(", ")}. So add a bit more to your cart and save! 😉` },
  { tags: ["delivery charge", "delivery cost", "shipping cost", "ডেলিভারি চার্জ", "খরচ"], reply: `📦 For orders below ${fmt(FREE_DELIVERY_FROM)}, delivery is ${DELIVERY_ZONES.map(z => `**${fmt(z.fee)}** ${z.name}`).join(", ")}.\n\nOrders of ${fmt(FREE_DELIVERY_FROM)} or more get **FREE delivery** 🎉` },

  // Return & Refund
  { tags: ["return", "refund", "ফেরত", "রিটার্ন", "money back", "ফেরত দেওয়া"], reply: "🔄 We have a **return policy — contact us for current conditions**!\n\nEligible for return if:\n✅ Item is damaged or defective\n✅ Wrong item delivered\n✅ Missing parts\n\nJust WhatsApp us within 7 days with photos 📸\n👉 01881816245" },

  // Tracking
  { tags: ["track", "tracking", "order status", "where is", "কোথায়", "ট্র্যাক", "অর্ডার কোথায়"], reply: `📦 Order tracking is not on the website yet. Orders are placed by WhatsApp message for now, so message us there for an update: **${CONFIG.WHATSAPP_DISPLAY}** 💬` },

  // How to order
  { tags: ["how to order", "place order", "how order", "order kori", "অর্ডার করব", "কিভাবে অর্ডার", "order দেব"], reply: `🛒 How to order:\n\n1️⃣ Add items to your cart\n2️⃣ Open **Checkout** and choose your delivery area\n3️⃣ Tap **Open WhatsApp**: your order is typed in for you\n4️⃣ Press **Send** in WhatsApp\n5️⃣ We reply there to confirm it. You pay cash on delivery ✅\n\nNeed help? WhatsApp: **${CONFIG.WHATSAPP_DISPLAY}**` },

  // Cancel order
  { tags: ["cancel", "cancel order", "অর্ডার বাতিল", "বাতিল করব"], reply: "⚠️ You can cancel your order within **2 hours** of placing it — before it's dispatched.\n\nJust WhatsApp us immediately at **01881816245** with your order details 📲" },

  // Products — Electronics
  { tags: ["phone", "mobile", "samsung", "realme", "iphone", "smartphone", "ফোন", "মোবাইল"], reply: "📱 We have great smartphones!\n\nCheck the **Electronics** category for all phones 🔍" },
  { tags: ["earbuds", "headphone", "earphone", "jbl", "speaker", "হেডফোন"], reply: "🎧 We've got amazing audio gear!\n\nCheck **Electronics** or **Gaming Lifestyle** for more! 🎵" },
  { tags: ["power bank", "charger", "charging", "চার্জার", "পাওয়ার ব্যাংক"], reply: "🔋 Great accessories available!\n\nFind them in **Phone Accessories** 🔌" },

  // Products — Smartwatches
  { tags: ["watch", "smartwatch", "apple watch", "samsung watch", "ঘড়ি", "স্মার্টওয়াচ"], reply: "⌚ We have awesome smartwatches!\n\nSee all in **Smartwatches** category! 😍" },

  // Products — Gaming
  { tags: ["gaming", "game", "ps5", "controller", "keyboard", "mouse", "গেমিং"], reply: "🎮 Gamers, we've got you!\n\nExplore **Gaming Lifestyle** for more! 🕹️" },

  // Products — Beauty
  { tags: ["beauty", "skincare", "face wash", "serum", "makeup", "মেকআপ", "স্কিনকেয়ার", "সৌন্দর্য"], reply: "💄 We have amazing beauty products!\n\nCheck **Beauty & Health** and **Beauty Tech** categories! ✨" },
  { tags: ["led mask", "facial", "steamer", "cleansing brush", "beauty tech", "বিউটি টেক"], reply: "✨ Our Beauty Tech collection is 🔥\n\nSee all in **Beauty Tech** category! 💆" },

  // Products — Bags & Travel
  { tags: ["bag", "backpack", "laptop bag", "travel bag", "ব্যাগ", "ব্যাকপ্যাক"], reply: "🎒 Smart bags & backpacks!\n\nExplore **Smart Bags & Backpacks** 💼" },
  { tags: ["travel", "travelling", "trip", "journey", "ট্রাভেল", "ভ্রমণ"], reply: "🧳 Travel in style with our kits!\n\nSee **Travel Kits** category! ✈️" },

  // Products — Home Office
  { tags: ["office", "desk", "monitor stand", "lamp", "lumbar", "home office", "অফিস"], reply: "🖥️ Level up your home office!\n\nSee **Home Office Aesthetics**! 💡" },

  // Products — Clothing
  { tags: ["panjabi", "saree", "clothes", "shirt", "shoes", "fashion", "পোশাক", "পাঞ্জাবি", "শাড়ি"], reply: "👗 Style yourself with Outback Cartel!\n\nExplore **Clothing & Fashion** 👘" },

  // WhatsApp
  { tags: ["whatsapp", "contact", "support", "help", "সাহায্য", "যোগাযোগ", "কথা বলতে"], reply: "💬 Reach us on WhatsApp anytime!\n\n📱 **01881816245**\n\n⚠️ Text only — no calls please.\nWe usually reply within **30 minutes**! ⚡" },

  // About
  { tags: ["about", "who are you", "outback cartel", "তোমরা কে", "আপনারা কে", "store"], reply: "🏕️ **Outback Cartel** is Bangladesh's trusted online dropshipping store!\n\nWe sell:\n📱 Electronics · Phone Accessories\n✨ Beauty Tech · Smartwatches\n🎮 Gaming · Travel · Smart Bags\n👗 Clothing · Home & Living\n\n🔒 Secure payments · Fast delivery · Returns — contact us for conditions" },

  // Price / discount
  { tags: ["price", "cost", "দাম", "কত", "কতটাকা", "discount", "offer", "ছাড়"], reply: "💰 We offer competitive prices across all categories!\n\nYou can find sale items with **Hot 🔥**, **New ✨**, and **Sale** badges on the product cards.\n\nFor specific product prices, browse our categories or WhatsApp us: **01881816245**" },

  // Bengali general
  { tags: ["কি", "কী", "কিভাবে", "কীভাবে", "বলুন", "জানতে চাই", "আমি"], reply: "আমি Carla! 😊 Outback Cartel-এর AI সহকারী।\n\nআমি আপনাকে এই বিষয়গুলোতে সাহায্য করতে পারি:\n• 🛍️ পণ্য ও ক্যাটাগরি\n• 🚚 ডেলিভারি তথ্য\n• 💳 পেমেন্ট পদ্ধতি\n• 🔄 রিটার্ন পলিসি\n\nকী জানতে চান? 👇" },
  { tags: ["অর্ডার", "পণ্য", "কিনতে", "কিনব", "শপিং"], reply: "🛒 Outback Cartel-এ স্বাগতম!\n\nআমাদের কাছে আছে:\n📱 ইলেকট্রনিক্স · বিউটি টেক\n⌚ স্মার্টওয়াচ · গেমিং\n🧳 ট্রাভেল · স্মার্ট ব্যাগ\n\nঅর্ডার করতে সাহায্য লাগলে জিজ্ঞেস করুন! 😊" },
];

// Smart reply engine
function getCarlaReply(input) {
  const lower = input.toLowerCase().trim();

  // Try to match against knowledge base
  for (const entry of KB) {
    for (const tag of entry.tags) {
      if (lower.includes(tag.toLowerCase())) return entry.reply;
    }
  }

  // Fuzzy fallbacks
  if (lower.length <= 3) return "Hey! 👋 Could you tell me a bit more about what you need? I'm here to help!";
  if (lower.includes("?")) return "Great question! 🤔 Could you be a bit more specific so I can give you the best answer?\n\nOr WhatsApp us at **01881816245** for instant help 💬";

  // Default intelligent fallback
  return `Thanks for reaching out! 😊 I'm not 100% sure about that one.\n\nYou can:\n• Browse our categories on the shop\n• WhatsApp us at **01881816245** for instant help\n• Check our FAQ page for common questions\n\nWe're always happy to help! 🛍️`;
}

function AIChatbot({ products }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! 👋 I'm **Carla**, your Outback Cartel shopping assistant. How can I help you today?\n\nYou can ask me about:\n• 🛍️ Products & categories\n• 🚚 Delivery\n• 💳 Payment & returns\n• 🛒 How to order" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const QUICK = [
    "What payment methods do you accept?",
    "How long does delivery take?",
    "What's your return policy?",
    "Do you have smartwatches?",
    "How do I track my order?",
    "Free delivery conditions?",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowQuick(false);

    const userMsg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Simulate a short typing delay for realism
    await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

    const reply = getCarlaReply(msg);
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    if (!open) setUnread(u => u + 1);
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Hi again! 👋 How can I help you today?" }]);
    setShowQuick(true);
  };

  // Render markdown-lite: bold, newlines, bullet points
  const renderText = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating chat button */}
      <button className="oc-chatbtn" onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 600,
          width: 58, height: 58, borderRadius: "50%",
          background: "var(--grad-earth)",
          border: "none", cursor: "pointer", boxShadow: "0 6px 24px rgba(226,65,43,.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, transition: "transform .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        title="Chat with Carla, the shop assistant" aria-label={open ? "Close chat" : "Chat with Carla, the shop assistant"}
      >
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" /><path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" strokeWidth="2.6" strokeLinecap="round" /></svg>}
        {!open && unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: C.accent, color: "#1C1C1C", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)" }}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 20, zIndex: 600,
          width: "min(370px, calc(100vw - 32px))",
          height: "min(520px, calc(100vh - 120px))",
          background: "var(--surface)", borderRadius: 20,
          boxShadow: "0 16px 48px rgba(0,0,0,.22)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: `1px solid ${C.border}`,
          animation: "chatSlideUp .25s ease",
        }}>

          {/* Header */}
          <div style={{ background: "var(--grad-deep)", padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, border: "2px solid rgba(255,255,255,.25)" }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Carla — Quick answers</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Online · Outback Cartel</span>
                </div>
              </div>
              <button onClick={clearChat} title="Clear chat" style={{ background: "rgba(255,255,255,.12)", border: "none", color: "rgba(255,255,255,.7)", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "rgba(255,255,255,.7)", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", background: "var(--inset)" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10, alignItems: "flex-end", gap: 7 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginBottom: 2 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "80%",
                  background: m.role === "user" ? C.primary : "var(--surface)",
                  color: m.role === "user" ? "#fff" : C.dark,
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                  padding: "10px 13px", fontSize: 13, lineHeight: 1.55,
                  boxShadow: m.role === "user" ? "none" : "0 1px 4px rgba(0,0,0,.08)",
                  border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                }}>
                  {renderText(m.content)}
                </div>
              </div>
            ))}

            {/* Quick reply chips */}
            {showQuick && messages.length <= 2 && (
              <div style={{ marginTop: 4, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 7, textAlign: "center" }}>Quick questions 👇</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
                  {QUICK.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      style={{ background: "var(--surface)", border: `1.5px solid ${C.border}`, borderRadius: 50, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: C.dark, fontFamily: "inherit", transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.hot; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dark; }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 7, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
                <div style={{ background: "var(--surface)", borderRadius: "4px 18px 18px 18px", padding: "12px 16px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.muted, display: "inline-block", animation: `dotBounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* WhatsApp nudge */}
          <div style={{ background: "var(--tint-gum)", borderTop: `1px solid var(--line-gum)`, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontSize: 11, color: "var(--ok)" }}>Prefer human help?</span>
            <a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20I%20need%20help%20from%20Outback%20Cartel.`} target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", background: "#25D366", color: "#05210F", textDecoration: "none", padding: "4px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
              WhatsApp us →
            </a>
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0, background: "var(--surface)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask Carla anything…"
              disabled={loading}
              style={{ flex: 1, border: `2px solid ${C.border}`, borderRadius: 50, padding: "9px 16px", fontSize: 13, outline: "none", fontFamily: "inherit", color: C.dark, background: loading ? "var(--inset)" : "var(--surface)", transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width: 40, height: 40, borderRadius: "50%", background: input.trim() && !loading ? C.primary : "var(--track)", color: input.trim() && !loading ? "#fff" : C.muted, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  SHOP PAGE
// ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 48; // products shown before "Show more"

const Icon = ({ children, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Icon>;
const PersonIcon = () => <Icon size={17}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.4-4 4.4-6 8-6s6.6 2 8 6" /></Icon>;
const BagIcon = () => <Icon size={18}><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></Icon>;

const hasWebGL = () => {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
  catch { return false; }
};
class ShowroomBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("Showroom error", err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
// the 3D showroom, or the 2D rack on devices that can't draw 3D
function ShowroomSlot({ fallback, ...props }) {
  const [failed, setFailed] = useState(() => !hasWebGL());
  const fail = useCallback(() => setFailed(true), []);
  if (failed) return fallback;
  return (
    <ShowroomBoundary fallback={fallback}>
      <Suspense fallback={<section className="sr sr-wait" aria-label="The showroom"><div className="sr-sticky"><div className="sr-loading"><span>Opening the store</span><i /></div></div></section>}>
        <Showroom {...props} onFail={fail} />
      </Suspense>
    </ShowroomBoundary>
  );
}

function ShopPage({ products, onAdd, onView, onBuyNow, activeCat, onCatChange, search, setSearch }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => { setVisible(PAGE_SIZE); }, [activeCat, search]);
  const filtered = products.filter(p => (activeCat === "all" || p.cat === activeCat) && (!search || p.name.toLowerCase().includes(search.toLowerCase())));
  const cat = CATS.find(c => c.key === activeCat) || CATS[0];
  const railHoodies = products.filter(p => p.cat === "hoodies" && !p.house && p.img && p.price > 0).slice(0, 60);
  const scrollTo = id => setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  const left = filtered.length - visible;
  return (
    <div>
      <ShowroomSlot hoodies={HOUSE_HOODIES} onAdd={onAdd} onBuyNow={onBuyNow}
        onDetails={id => { const p = products.find(x => x.id === id); if (p) onView(p); }}
        onShopAll={() => scrollTo("oc-shop")}
        fallback={<div id="oc-rack" style={{ scrollMarginTop: 64 }}><HoodieRail key={railHoodies.length} extra={railHoodies} onAdd={onAdd} onBrowse={() => { onCatChange("hoodies"); scrollTo("oc-shop"); }} /></div>} />
      <div id="oc-shop" className="oc-shop">
        <div className="oc-trust">
          <span><b>Fast delivery</b>{DELIVERY_ZONES.filter(z => z.k !== "sub").map(z => `${z.name} ${z.days}`).join(", ")}</span>
          <span><b>Returns — contact us for conditions</b>If it isn't right, send it back</span>
          <span><b>WhatsApp support</b>{CONFIG.WHATSAPP_DISPLAY}, text only</span>
        </div>
        <div className="oc-chips" role="toolbar" aria-label="Categories">
          {CATS.map(c => <button key={c.key} className="oc-chip" aria-pressed={activeCat === c.key} onClick={() => onCatChange(c.key)}>{c.label}</button>)}
        </div>
        <div className="oc-find">
          <SearchIcon />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${cat.key === "all" ? "all products" : cat.label.toLowerCase()}`} aria-label="Search products" />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search">✕</button>}
        </div>
        <div className="oc-sec">
          <h2>{cat.label}</h2>
          <i aria-hidden="true" />
          <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="oc-empty">{search ? <>Nothing matches “{search}”. Try a shorter word or another category.</> : <>Nothing in {cat.label.toLowerCase()} yet. New stock lands often — check back soon.</>}</div>
        ) : (
          <>
            <div className="ocp-grid">{filtered.slice(0, visible).map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onView={onView} />)}</div>
            {left > 0 && <div className="oc-more"><Btn variant="ghost" onClick={() => setVisible(v => v + PAGE_SIZE)} style={{ padding: "12px 30px", borderRadius: 999 }}>{left <= PAGE_SIZE ? `Show ${left} more` : `Show ${PAGE_SIZE} more of ${left}`}</Btn></div>}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────
export default function OutbackCartel() {
  const [products, setProducts] = useState(() => {
    const saved = ls.get("oc_products") || DEFAULT_PRODUCTS;
    const clean = saved.filter(p => !isDemoProduct(p) && hasPicture(p) && !p.house);
    if (clean.length !== saved.length) ls.set("oc_products", clean); // also clears old copies saved in this browser
    return [...HOUSE_HOODIES, ...clean];
  });
  const [page, setPage] = useState("shop");
  const [activeCat, setActiveCat] = useState("all");
  const [selectedProd, setSelectedProd] = useState(null); // product detail page
  const [cart, setCart] = useState(() => {
    const saved = ls.get("oc_cart");
    if (!Array.isArray(saved)) return [];
    return saved.filter(item =>
      item && typeof item === "object" &&
      (typeof item.id === "string" || typeof item.id === "number") &&
      typeof item.name === "string" &&
      Number.isFinite(Number(item.price)) && Number(item.price) >= 0
    ).slice(0, 100).map((item, index) => ({
      ...item,
      cartKey: typeof item.cartKey === "string" && item.cartKey
        ? item.cartKey
        : `restored-${String(item.id)}-${index}`,
      qty: Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1))),
      price: Number(item.price),
    }));
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [account, setAccount] = useState(() => ls.get("oc_account"));
  const [shopQ, setShopQ] = useState("");     // the shop's search box
  const [headerQ, setHeaderQ] = useState(""); // the header's search box

  // Supplier products (dropshipping.com.bd) loaded through our own server function /api/products,
  // so the API key and secret key never reach the browser.
  useEffect(() => {
    // Browser persistence improves convenience; it is never an authority for price or stock.
    ls.set("oc_cart", cart);
  }, [cart]);

  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d || !Array.isArray(d.products)) return;
        setProducts(prev => [...HOUSE_HOODIES, ...prev.filter(p => !p.remote && !p.house), ...d.products.filter(hasPicture)]);
      })
      .catch(() => { /* supplier offline: keep showing our own products */ });
    return () => { alive = false; };
  }, []);
  const toast_ = msg => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const nav = (p, cat) => { setPage(p); setSelectedProd(null); if (cat) setActiveCat(cat); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const addToCart = (p, quantity = 1) => {
    const amount = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    // Keep each add as its own line so customers can choose different sizes/colours
    // for the same product during checkout.
    const cartKey = `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCart(prev => [...prev, { ...p, cartKey, qty: amount }]);
    toast_(`✅ ${amount} × ${p.name.substring(0, 26)}… added!`);
  };
  const runSearch = () => {
    setShopQ(headerQ.trim()); setActiveCat("all"); setPage("shop"); setSelectedProd(null);
    setTimeout(() => { const el = document.getElementById("oc-shop"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
  };
  const viewProduct = p => { setSelectedProd(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const changeQty = (key, d) => setCart(prev => prev.map(c => (c.cartKey || c.id) === key ? { ...c, qty: Math.min(99, c.qty + d) } : c).filter(c => c.qty > 0));
  const removeItem = key => setCart(prev => prev.filter(c => (c.cartKey || c.id) !== key));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleLogout = () => { setAccount(null); ls.del("oc_account"); setShowDash(false); toast_("👋 Logged out"); };
  const handleAccountClick = () => account ? setShowDash(true) : setShowAuth(true);

  const pageContent = () => {
    // Product detail page takes priority
    if (selectedProd) return (
      <ProductDetailPage
        product={selectedProd}
        onAdd={addToCart}
        onBuyNow={() => { setSelectedProd(null); setCartOpen(false); setCheckoutOpen(true); }}
        onBack={() => setSelectedProd(null)}
      />
    );
    if (page === "about") return <AboutPage />;
    if (page === "track") return <TrackPage />;
    if (page === "returns") return <ReturnsPage />;
    if (page === "faq") return <FAQPage />;
    return <ShopPage products={products} onAdd={addToCart} onView={viewProduct} activeCat={activeCat} onCatChange={cat => { setActiveCat(cat); setPage("shop"); }} search={shopQ} setSearch={setShopQ}
      onBuyNow={() => { setSelectedProd(null); setCartOpen(false); setCheckoutOpen(true); }} />;
  };

  return (
    <>
      {/* TOP BAR */}
      <div className="oc-top">
        <span>Free delivery on orders over ৳999</span>
        <a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp {CONFIG.WHATSAPP_DISPLAY} (text only)</a>
      </div>

      {/* HEADER */}
      <header className="oc-head">
        <div className="oc-head-in">
          <button className="oc-burger" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><span /><span /><span /></button>
          <button className="oc-mark" onClick={() => nav("shop")} aria-label="Outback Cartel, home">Outback Cartel</button>
          <form className="oc-search" role="search" onSubmit={e => { e.preventDefault(); runSearch(); }}>
            <input value={headerQ} onChange={e => setHeaderQ(e.target.value)} placeholder="Search hoodies, gadgets, gifts" aria-label="Search products" />
            <button type="submit" aria-label="Search"><SearchIcon /></button>
          </form>
          <button className="oc-iconbtn" onClick={handleAccountClick} aria-label={account ? "Your account" : "Sign in"}>
            <span className="oc-avatar" data-on={account ? "true" : "false"}>
              {account?.avatar ? <img src={account.avatar} alt="" /> : account ? account.name.charAt(0).toUpperCase() : <PersonIcon />}
            </span>
            <span className="oc-acc-name">{account ? account.name.split(" ")[0].substring(0, 10) : "Sign in"}</span>
          </button>
          <button className="oc-cartbtn" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} item${cartCount !== 1 ? "s" : ""}`}>
            <BagIcon /><span className="oc-cart-word">Cart</span><b>{cartCount}</b>
          </button>
        </div>
        {page !== "shop" && (
          <nav className="oc-subnav" aria-label="Pages">
            <div className="oc-subnav-in">
              {[["shop", "Shop"], ["about", "About"], ["track", "Track order"], ["returns", "Returns"], ["faq", "FAQ"]].map(([k, l]) => <button key={k} onClick={() => nav(k)} aria-current={page === k ? "page" : undefined}>{l}</button>)}
            </div>
          </nav>
        )}
      </header>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} activeCat={activeCat}
        onCat={cat => { setActiveCat(cat); setPage("shop"); }} onNav={nav}
        account={account} onAccountOpen={() => setShowAuth(true)} onLogout={handleLogout} />

      <main style={{ background: "var(--night)", minHeight: "100vh", color: C.dark }}>
        {pageContent()}
      </main>

      {/* FOOTER */}
      <footer className="oc-foot">
        <div className="oc-foot-in">
          <div className="oc-foot-grid">
            <div>
              <div className="oc-foot-mark">Outback Cartel</div>
              <p>Hoodies, fashion, winter wear, kids, gadgets and home goods — checked before dispatch and delivered to all 64 districts of Bangladesh.</p>
              <a className="oc-foot-wa" href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp {CONFIG.WHATSAPP_DISPLAY}</a>
              <div style={{ fontSize: 13, marginTop: 8 }}>Text messages only, no calls</div>
            </div>
            <div>
              <h4>Help</h4>
              {[["about", "About us"], ["track", "Track an order"], ["returns", "Returns"], ["faq", "FAQ"]].map(([k, l]) => <button key={k} className="oc-foot-link" onClick={() => nav(k)}>{l}</button>)}
            </div>
            <div>
              <h4>Pay with</h4>
              <div className="oc-pay">{[["Cash on delivery", "#2BC48A"]].map(([l, c]) => <span key={l}><i style={{ background: c }} />{l}</span>)}</div>
            </div>
          </div>
          <div className="oc-foot-base"><span>© 2026 Outback Cartel</span><span>Made in Bangladesh 🇧🇩</span></div>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)}
        onSuccess={acc => { setAccount(acc); setShowAuth(false); toast_(`🎉 Welcome, ${acc.name}!`); setTimeout(() => setShowDash(true), 400); }} />

      {showDash && account && <UserDashboard account={account} onClose={() => setShowDash(false)}
        onUpdate={acc => setAccount(acc)} onLogout={handleLogout} />}

      <CartSidebar cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onQty={changeQty} onRemove={removeItem}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />

      <CheckoutModal cart={cart} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} account={account}
        onClearCart={() => { setCart([]); toast_("🛒 Order placed! Cart emptied."); }} />

      {/* AI CHATBOT */}
      <AIChatbot products={products} />

      {toast && <Toast msg={toast} />}
    </>
  );
}
