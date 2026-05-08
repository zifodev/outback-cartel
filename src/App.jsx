import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  STORE_NAME: "Outback Cartel",
  WHATSAPP: "8801881816245",
  WHATSAPP_DISPLAY: "01881816245",
  ADMIN_PASSWORD: "outback2024",
  SSL_STORE_ID: "YOUR_STORE_ID",
  SSL_STORE_PASS: "YOUR_STORE_PASSWORD",
  SSL_IS_LIVE: false,
};

// ─────────────────────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────────────────────
const CATS = [
  { key: "all", label: "All Items", icon: "🏠", color: "#C8392B" },
  { key: "electronics", label: "Electronics", icon: "📱", color: "#0369A1" },
  { key: "accessories", label: "Phone Accessories", icon: "🔌", color: "#7C3AED" },
  { key: "beauty", label: "Beauty & Health", icon: "💄", color: "#DB2777" },
  { key: "beautytech", label: "Beauty Tech", icon: "✨", color: "#9333EA" },
  { key: "watches", label: "Smartwatches", icon: "⌚", color: "#0F766E" },
  { key: "gaming", label: "Gaming Lifestyle", icon: "🎮", color: "#4338CA" },
  { key: "travel", label: "Travel Kits", icon: "🧳", color: "#B45309" },
  { key: "bags", label: "Smart Bags & Backpacks", icon: "🎒", color: "#065F46" },
  { key: "homeoffice", label: "Home Office Aesthetics", icon: "🖥️", color: "#1D4ED8" },
  { key: "clothing", label: "Clothing & Fashion", icon: "👗", color: "#BE185D" },
  { key: "home", label: "Home & Living", icon: "🏡", color: "#15803D" },
  { key: "sports", label: "Sports & Fitness", icon: "⚽", color: "#B45309" },
  { key: "toys", label: "Toys & Kids", icon: "🧸", color: "#D97706" },
];

// ─────────────────────────────────────────────────────────────
//  DEFAULT PRODUCTS
// ─────────────────────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
  { id: 1, name: "Samsung Galaxy A35 5G 128GB", cat: "electronics", price: 32999, old: 38000, icon: "📱", badge: "Hot", img: "" },
  { id: 2, name: "JBL Tune 520BT Wireless Earbuds", cat: "electronics", price: 3499, old: 4500, icon: "🎧", badge: "Sale", img: "" },
  { id: 3, name: "Anker Power Bank 20000mAh", cat: "electronics", price: 2799, old: 3500, icon: "🔋", badge: "New", img: "" },
  { id: 4, name: "MagSafe Compatible Phone Case", cat: "accessories", price: 599, old: 900, icon: "📱", badge: "New", img: "" },
  { id: 5, name: "65W GaN Fast Charger Adapter", cat: "accessories", price: 1299, old: 1800, icon: "🔌", badge: "Hot", img: "" },
  { id: 6, name: "Wireless Charging Pad 15W", cat: "accessories", price: 899, old: 1200, icon: "⚡", badge: "Sale", img: "" },
  { id: 7, name: "USB-C Hub 7-in-1 Multiport", cat: "accessories", price: 1799, old: 2400, icon: "🔌", badge: null, img: "" },
  { id: 8, name: "Neutrogena Oil-Free Face Wash 200ml", cat: "beauty", price: 750, old: 950, icon: "🧴", badge: "New", img: "" },
  { id: 9, name: "Vitamin C Serum + SPF Moisturizer", cat: "beauty", price: 1299, old: 1800, icon: "✨", badge: "Sale", img: "" },
  { id: 10, name: "Men's Grooming Kit 8-in-1", cat: "beauty", price: 1450, old: 2000, icon: "🪒", badge: "Hot", img: "" },
  { id: 11, name: "LED Face Mask Therapy Device", cat: "beautytech", price: 3999, old: 5500, icon: "😷", badge: "Hot", img: "" },
  { id: 12, name: "Facial Steamer Nano Ionic", cat: "beautytech", price: 1899, old: 2600, icon: "💨", badge: "New", img: "" },
  { id: 13, name: "Electric Facial Cleansing Brush", cat: "beautytech", price: 999, old: 1400, icon: "🌀", badge: "Sale", img: "" },
  { id: 14, name: "Smart Watch Fitness Tracker Pro", cat: "watches", price: 4999, old: 6500, icon: "⌚", badge: "Hot", img: "" },
  { id: 15, name: "Apple Watch Series 9 (45mm)", cat: "watches", price: 49999, old: 58000, icon: "⌚", badge: "New", img: "" },
  { id: 16, name: "Samsung Galaxy Watch 6 Classic", cat: "watches", price: 34999, old: 42000, icon: "⌚", badge: "Sale", img: "" },
  { id: 17, name: "PS5 DualSense Controller", cat: "gaming", price: 8499, old: 10000, icon: "🎮", badge: "Hot", img: "" },
  { id: 18, name: "Gaming RGB Mouse Pad XL", cat: "gaming", price: 899, old: 1300, icon: "🖱️", badge: "New", img: "" },
  { id: 19, name: "Mechanical Gaming Keyboard RGB", cat: "gaming", price: 3999, old: 5500, icon: "⌨️", badge: "Sale", img: "" },
  { id: 20, name: "Gaming Headset 7.1 Surround", cat: "gaming", price: 2799, old: 3800, icon: "🎧", badge: null, img: "" },
  { id: 21, name: "Travel Organiser Packing Cubes Set", cat: "travel", price: 1299, old: 1800, icon: "🧳", badge: "New", img: "" },
  { id: 22, name: "Portable Neck Pillow Memory Foam", cat: "travel", price: 699, old: 1000, icon: "😴", badge: null, img: "" },
  { id: 23, name: "TSA Approved Toiletry Bag", cat: "travel", price: 549, old: 800, icon: "🪥", badge: "Sale", img: "" },
  { id: 24, name: "Travel Adapter Universal 5-in-1", cat: "travel", price: 899, old: 1200, icon: "🔌", badge: "Hot", img: "" },
  { id: 25, name: "Anti-Theft Backpack USB Charging", cat: "bags", price: 3499, old: 4800, icon: "🎒", badge: "Hot", img: "" },
  { id: 26, name: "Slim Laptop Bag 15.6 inch", cat: "bags", price: 1999, old: 2800, icon: "💼", badge: "New", img: "" },
  { id: 27, name: "Waterproof Crossbody Sling Bag", cat: "bags", price: 1299, old: 1800, icon: "👜", badge: "Sale", img: "" },
  { id: 28, name: "Adjustable Monitor Stand + Drawer", cat: "homeoffice", price: 2499, old: 3200, icon: "🖥️", badge: "New", img: "" },
  { id: 29, name: "Ergonomic Lumbar Support Cushion", cat: "homeoffice", price: 1199, old: 1700, icon: "🪑", badge: null, img: "" },
  { id: 30, name: "Desk Cable Management Organiser", cat: "homeoffice", price: 599, old: 900, icon: "🗂️", badge: "Hot", img: "" },
  { id: 31, name: "LED Desk Lamp with Wireless Charger", cat: "homeoffice", price: 2299, old: 3000, icon: "💡", badge: "Sale", img: "" },
  { id: 32, name: "Men's Cotton Panjabi Eid Edition", cat: "clothing", price: 1299, old: 1800, icon: "👘", badge: "Hot", img: "" },
  { id: 33, name: "Women's Silk Saree Hand-Painted", cat: "clothing", price: 3499, old: 4500, icon: "👗", badge: "New", img: "" },
  { id: 34, name: "Premium Running Shoes Unisex", cat: "clothing", price: 2199, old: 3200, icon: "👟", badge: "Sale", img: "" },
  { id: 35, name: "Stainless Steel Vacuum Flask 1L", cat: "home", price: 649, old: 900, icon: "🍶", badge: "New", img: "" },
  { id: 36, name: "Bamboo Bedsheet Set King Size", cat: "home", price: 2199, old: 3000, icon: "🛏️", badge: null, img: "" },
  { id: 37, name: "Anti-Slip Yoga Mat 6mm", cat: "sports", price: 799, old: 1100, icon: "🧘", badge: "New", img: "" },
  { id: 38, name: "Cricket Bat Kashmir Willow", cat: "sports", price: 1699, old: 2200, icon: "🏏", badge: "Hot", img: "" },
  { id: 39, name: "LEGO Classic Creative Bricks", cat: "toys", price: 2499, old: 3200, icon: "🧱", badge: "New", img: "" },
  { id: 40, name: "RC Car 4WD Monster Truck", cat: "toys", price: 1899, old: 2500, icon: "🚗", badge: "Sale", img: "" },
];

// ─────────────────────────────────────────────────────────────
//  THEME
// ─────────────────────────────────────────────────────────────
const C = {
  primary: "#C8392B", dark: "#1C1C1C", accent: "#E8A020", green: "#2E7D52",
  bg: "#F5F3EF", card: "#FFFFFF", border: "#E8E4DE", muted: "#8A8070",
};

const fmt = n => "৳" + Number(n).toLocaleString();
const uid = () => Date.now() + Math.floor(Math.random() * 9999);
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
  return <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.dark, color: "#fff", padding: "11px 26px", borderRadius: 50, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 28px rgba(0,0,0,.35)", whiteSpace: "nowrap", pointerEvents: "none" }}>{msg}</div>;
}

function Btn({ children, onClick, style = {}, variant = "primary", disabled = false }) {
  const V = { primary: { background: C.primary, color: "#fff" }, dark: { background: C.dark, color: "#fff" }, ghost: { background: "#F0EDE8", color: C.dark }, danger: { background: "#DC2626", color: "#fff" }, green: { background: "#25D366", color: "#fff" } };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = ".85")} onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    style={{ border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", padding: "11px 20px", transition: "opacity .15s", opacity: disabled ? .5 : 1, ...V[variant], ...style }}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", error, style = {} }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "block", color: C.muted, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>}
      <input value={value} onChange={onChange} placeholder={placeholder} type={type}
        style={{ width: "100%", border: `2px solid ${error ? C.primary : C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", color: C.dark, background: "#fff", ...style }} />
      {error && <span style={{ color: C.primary, fontSize: 11 }}>{error}</span>}
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
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 18, background: "#FFF8E7", padding: "10px 14px", borderRadius: 8, border: `1px solid #F5E4B0`, lineHeight: 1.6 }}>
          💡 <strong>Account is optional.</strong> You can shop without one — but an account lets you track orders, save your address, and manage your profile.
        </p>
        <button onClick={() => { setMethod("email"); setStep("signup"); }}
          style={{ width: "100%", border: `2px solid ${C.border}`, borderRadius: 14, padding: "20px", background: "#fff", cursor: "pointer", textAlign: "center", transition: "all .2s", fontFamily: "inherit", marginBottom: 14 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "#FEF2F2"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Continue with Email</div>
          <div style={{ fontSize: 12, color: C.muted }}>We'll send a 6-digit OTP to your email</div>
        </button>
        <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
          Already have an account? <span onClick={() => setStep("login")} style={{ color: C.primary, fontWeight: 700, cursor: "pointer" }}>Login →</span>
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
          Already have an account? <span onClick={() => { setStep("login"); setErrors({}); }} style={{ color: C.primary, fontWeight: 700, cursor: "pointer" }}>Login</span>
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
          <span onClick={() => { setIsForgotFlow(true); setStep("forgot"); setErrors({}); }} style={{ fontSize: 12, color: C.primary, fontWeight: 600, cursor: "pointer" }}>Forgot password?</span>
        </div>
        <OTPInfoBanner method="email" contact={contact} isLogin />
        <Btn onClick={() => sendOTP()} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }} disabled={loading}>
          {loading ? "⏳ Sending OTP…" : "Send OTP to Verify →"}
        </Btn>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>
          No account? <span onClick={() => { setStep("signup"); setErrors({}); }} style={{ color: C.primary, fontWeight: 700, cursor: "pointer" }}>Sign Up</span>
        </p>
      </div>
    </Overlay>
  );

  // ── STEP: Forgot Password ──
  if (step === "forgot") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Reset Password 🔒" sub="Enter your email to receive a reset code" onClose={() => { onClose(); resetAll(); }} back={() => { setStep("login"); setIsForgotFlow(false); setErrors({}); }} />
      <div style={{ padding: "22px 24px 24px" }}>
        <div style={{ background: "#EEF4FF", border: "1px solid #C7D7F7", borderRadius: 9, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#003366", lineHeight: 1.6 }}>
          🔐 Enter the email address linked to your account. We'll send you a 6-digit code to reset your password.
        </div>
        <Input label="Email Address" value={contact} onChange={e => { setContact(e.target.value); setErrors({}); }}
          placeholder="you@email.com" type="email" error={errors.contact} />
        <Btn onClick={() => { const err = {}; if (!contact.trim()) err.contact = "Required"; if (contact && !/\S+@\S+\.\S+/.test(contact)) err.contact = "Enter a valid email"; if (Object.keys(err).length) { setErrors(err); return; } sendOTP(false, true); }} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }} disabled={loading}>
          {loading ? "⏳ Sending reset code…" : "Send Reset Code →"}
        </Btn>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>
          Remembered your password? <span onClick={() => { setStep("login"); setIsForgotFlow(false); setErrors({}); }} style={{ color: C.primary, fontWeight: 700, cursor: "pointer" }}>Login</span>
        </p>
      </div>
    </Overlay>
  );

  // ── STEP: Reset Password (after OTP verified) ──
  if (step === "reset") return (
    <Overlay onClose={onClose}>
      <ModalHeader title="New Password 🔑" sub="Choose a strong new password" onClose={() => { onClose(); resetAll(); }} />
      <div style={{ padding: "22px 24px 24px" }}>
        <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 9, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#1B5E20" }}>
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
        <div style={{ background: "#F0F4FF", border: "1px solid #C7D7F7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#003366" }}>
          📧 Code sent to: <strong>{contact}</strong><br />
          <span style={{ fontSize: 11, color: "#5A6A8A", marginTop: 4, display: "block" }}>Check your inbox (and spam folder just in case)</span>
        </div>

        {/* 6-box OTP input */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }}>
          {otp.map((d, i) => (
            <input key={i} ref={el => otpRefs.current[i] = el} value={d} onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
              maxLength={1} inputMode="numeric"
              style={{ width: 46, height: 54, border: `2px solid ${errors.otp ? C.primary : d ? C.primary : C.border}`, borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: 800, outline: "none", fontFamily: "inherit", color: C.dark, background: d ? "#FEF2F2" : "#fff", transition: "border-color .15s" }} />
          ))}
        </div>
        {errors.otp && <p style={{ color: C.primary, fontSize: 12, marginBottom: 10 }}>⚠️ {errors.otp}</p>}

        {/* Timer */}
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>
          {timerOn ? `Resend OTP in ${timer}s` : <span onClick={() => sendOTP(true)} style={{ color: C.primary, cursor: "pointer", fontWeight: 700 }}>Resend OTP →</span>}
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
    <div style={{ background: "#F0F4FF", border: "1px solid #C7D7F7", borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#003366", lineHeight: 1.6 }}>
      🔐 We'll send a <strong>6-digit OTP</strong> to your {method === "email" ? "email" : "phone"} to verify your account.
      {isLogin && " This confirms it's really you."}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.28)", overflow: "hidden", maxHeight: "95vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, sub, onClose, back }) {
  return (
    <div style={{ background: `linear-gradient(135deg,${C.dark},#2C1810)`, padding: "20px 22px 18px", color: "#fff", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: back ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {back && <button onClick={back} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>}
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{sub}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackErr, setTrackErr] = useState("");
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

  const trackOrder = () => {
    setTrackErr(""); setTrackResult(null);
    if (!trackId.trim()) { setTrackErr("Enter an Order ID"); return; }
    const found = ORDERS.find(o => o.id === trackId.trim());
    if (found) setTrackResult(found);
    else setTrackErr("Order not found. Check your Order ID or WhatsApp us at 01881816245");
  };

  const TABS = [
    { key: "overview", icon: "🏠", label: "Overview" },
    { key: "orders", icon: "📦", label: "Orders" },
    { key: "track", icon: "🚚", label: "Track" },
    { key: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "96vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)", overflow: "hidden" }}>

        {/* Dashboard Header */}
        <div style={{ background: `linear-gradient(135deg,${C.dark},#2C1810)`, padding: "22px 22px 0", flexShrink: 0 }}>
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
                  style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: C.accent, border: "2px solid #fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
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
                style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", padding: "10px 4px 12px", fontFamily: "inherit", color: tab === t.key ? "#fff" : "rgba(255,255,255,.45)", borderBottom: tab === t.key ? "3px solid #fff" : "3px solid transparent", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
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
                  { icon: "📦", value: ORDERS.length, label: "Total Orders", color: C.primary },
                  { icon: "✅", value: ORDERS.filter(o => o.status === "delivered").length, label: "Delivered", color: C.green },
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{fmt(o.total)}</div>
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
                    style={{ background: a.danger ? "#FEF2F2" : "#fff", border: `1px solid ${a.danger ? "#FCA5A5" : C.border}`, borderRadius: 12, padding: "14px 12px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "all .2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    <div style={{ fontSize: 24, marginBottom: 5 }}>{a.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: a.danger ? "#DC2626" : C.dark }}>{a.label}</div>
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
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Once you place an order, it will appear here with live tracking.</div>
                  <button onClick={onClose} style={{ background: C.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Browse Products →</button>
                </div>
              ) : ORDERS.map(o => (
                <div key={o.id} style={{ background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>{o.id}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>📅 {o.date}</div>
                    </div>
                    <span style={{ background: STATUS_COLORS[o.status] || C.muted, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{STATUS_LABELS[o.status]}</span>
                  </div>
                  <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                    {o.items.map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: i < o.items.length - 1 ? 4 : 0 }}>📦 {item}</div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{fmt(o.total)}</span>
                    <button onClick={() => { setTrackId(o.id); setTab("track"); }}
                      style={{ background: "#EEF2FF", color: "#4F46E5", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🚚 Track</button>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 0 }}>
                    {TRACK_STEPS.map((s, i) => (
                      <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < o.steps ? C.green : i === o.steps - 1 ? C.primary : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                          {i < o.steps ? "✓" : i + 1}
                        </div>
                        {i < 3 && <div style={{ flex: 1, height: 2, background: i < o.steps - 1 ? C.green : "#E5E7EB" }} />}
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
          {tab === "track" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: C.primary, borderRadius: 4, display: "inline-block" }} /> Track Your Order
              </div>
              <div style={{ marginBottom: 12 }}>
                <input value={trackId} onChange={e => { setTrackId(e.target.value); setTrackErr(""); }}
                  placeholder="Enter your Order ID (e.g. OC-12345678)"
                  style={{ width: "100%", border: `2px solid ${trackErr ? C.primary : C.border}`, borderRadius: 9, padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
                {trackErr && <p style={{ color: C.primary, fontSize: 11, marginTop: 4 }}>⚠️ {trackErr}</p>}
              </div>
              <Btn onClick={trackOrder} style={{ width: "100%", padding: 13, borderRadius: 12, marginBottom: 16 }}>🔍 Track Order</Btn>

              {/* Quick select from orders — only if user has orders */}
              {ORDERS.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Or pick from your orders:</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {ORDERS.map(o => (
                      <button key={o.id} onClick={() => { setTrackId(o.id); setTrackResult(null); setTrackErr(""); }}
                        style={{ background: trackId === o.id ? "#FEF2F2" : "#fff", border: `2px solid ${trackId === o.id ? C.primary : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: trackId === o.id ? C.primary : C.muted }}>{o.id}</button>
                    ))}
                  </div>
                </>
              )}

              {trackResult && (
                <div style={{ background: "#fff", borderRadius: 14, padding: "18px", border: `1px solid ${C.border}`, boxShadow: "0 2px 10px rgba(0,0,0,.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{trackResult.id}</div>
                    <span style={{ background: STATUS_COLORS[trackResult.status], color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 50 }}>{STATUS_LABELS[trackResult.status]}</span>
                  </div>
                  {/* Step tracker */}
                  <div style={{ position: "relative", marginBottom: 16 }}>
                    <div style={{ position: "absolute", top: 20, left: 20, right: 20, height: 3, background: "#E5E7EB", zIndex: 0 }} />
                    <div style={{ position: "absolute", top: 20, left: 20, height: 3, background: C.green, zIndex: 1, width: `${Math.min(((trackResult.steps - 1) / 3) * 100, 100)}%`, transition: "width .5s" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
                      {["✔️", "📦", "🚚", "🎉"].map((ic, i) => {
                        const done = i < trackResult.steps, active = i === trackResult.steps - 1;
                        return <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: done || active ? (active ? C.primary : C.green) : "#E5E7EB", color: (done || active) ? "#fff" : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 2px 8px rgba(0,0,0,.1)", marginBottom: 6 }}>{ic}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: (done || active) ? C.dark : C.muted }}>{TRACK_STEPS[i]}</div>
                        </div>;
                      })}
                    </div>
                  </div>
                  <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
                    {trackResult.items.map((item, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: i < trackResult.items.length - 1 ? 4 : 0 }}>📦 {item}</div>)}
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginTop: 8 }}>{fmt(trackResult.total)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                    style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: C.primary, border: "3px solid #fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>✏️</button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
                </div>
                <p style={{ fontSize: 12, color: C.muted }}>Tap the pencil to change your photo</p>
              </div>

              {/* Form */}
              {saveMsg && <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1B5E20", marginBottom: 14 }}>{saveMsg}</div>}

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
                  style={{ width: "100%", background: "#FEF2F2", border: "2px solid #FCA5A5", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>
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
const SAMPLE_REVIEWS = [
  { name: "Rafiq Ahmed", rating: 5, date: "2026-04-12", text: "Excellent product! Delivery was super fast to Dhaka. Highly recommended." },
  { name: "Nusrat Jahan", rating: 4, date: "2026-04-20", text: "Good quality, matches the description. Packaging was nice." },
  { name: "Karim Hossain", rating: 5, date: "2026-05-01", text: "Bought as a gift. My friend loved it! Will order again." },
  { name: "Fatema Akter", rating: 4, date: "2026-05-03", text: "Fast delivery. Product is exactly as shown. Happy with purchase." },
];

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
  const cc = CATS.find(c => c.key === product.cat)?.color || C.primary;
  const disc = product.old ? Math.round((1 - product.price / product.old) * 100) : 0;
  const avgRating = (SAMPLE_REVIEWS.reduce((s, r) => s + r.rating, 0) / SAMPLE_REVIEWS.length).toFixed(1);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) onAdd(product);
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2000);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
          <span onClick={onBack} style={{ cursor: "pointer", color: C.primary, fontWeight: 600 }}>← Back</span>
          <span>/</span>
          <span onClick={onBack} style={{ cursor: "pointer" }}>Shop</span>
          <span>/</span>
          <span style={{ color: C.dark, fontWeight: 500 }}>{product.name.substring(0, 30)}{product.name.length > 30 ? "…" : ""}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 40px" }}>
        {/* Main product section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>

          {/* Image */}
          <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
            <div style={{ height: 380, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${cc}14,${cc}06)`, position: "relative" }}>
              {product.badge && (
                <span style={{ position: "absolute", top: 16, left: 16, background: product.badge === "Hot" ? C.accent : product.badge === "New" ? C.green : C.primary, color: product.badge === "Hot" ? "#1C1C1C" : "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{product.badge}</span>
              )}
              {disc > 0 && (
                <span style={{ position: "absolute", top: 16, right: 16, background: C.primary, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>-{disc}% OFF</span>
              )}
              {product.img
                ? <img src={product.img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                : <span style={{ fontSize: 120 }}>{product.icon || "📦"}</span>
              }
            </div>
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: cc, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>
                {CATS.find(c => c.key === product.cat)?.icon} {CATS.find(c => c.key === product.cat)?.label}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.dark, lineHeight: 1.3, margin: "0 0 10px" }}>{product.name}</h1>

              {/* Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <StarRating rating={Math.round(parseFloat(avgRating))} size={16} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{avgRating}</span>
                <span style={{ fontSize: 12, color: C.muted }}>({SAMPLE_REVIEWS.length} reviews)</span>
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: C.primary }}>{fmt(product.price)}</span>
                {product.old && <span style={{ fontSize: 16, color: C.muted, textDecoration: "line-through" }}>{fmt(product.old)}</span>}
              </div>
              {product.old && <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 14 }}>You save {fmt(product.old - product.price)} ({disc}% off)</div>}
            </div>

            {/* Features */}
            <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
              {[["🚚", "Fast Delivery", "Dhaka 1-2 days · Bangladesh 3-5 days"], ["🔄", "Easy Returns", "7-day hassle-free returns"], ["🔒", "Secure Payment", "SSLCommerz · bKash · Nagad · COD"], ["✅", "Quality Check", "Verified before dispatch"]].map(([ic, t, d]) => (
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
                  <button onClick={() => setQty(q => q + 1)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.dark, fontWeight: 700, width: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>Total: <strong style={{ color: C.primary }}>{fmt(product.price * qty)}</strong></span>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleAdd}
                  style={{ flex: 1, background: addedMsg ? "#2E7D52" : "#fff", color: addedMsg ? C.green : C.primary, border: `2px solid ${addedMsg ? C.green : C.primary}`, borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
                  {addedMsg ? "✅ Added!" : "🛒 Add to Cart"}
                </button>
                <button onClick={() => { onAdd(product); onBuyNow(); }}
                  style={{ flex: 1, background: C.primary, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ⚡ Buy Now
                </button>
              </div>

              <a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20I%20want%20to%20order:%20${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 10, background: "#25D366", color: "#fff", textDecoration: "none", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, boxSizing: "border-box" }}>
                💬 Order via WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Tabs: Description / Reviews */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            {[["description", "📋 Description"], ["reviews", "⭐ Reviews"]].map(([k, l]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                style={{ flex: 1, background: "none", border: "none", padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: activeTab === k ? C.primary : C.muted, borderBottom: activeTab === k ? `3px solid ${C.primary}` : "3px solid transparent", transition: "all .2s" }}>{l}</button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {activeTab === "description" && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>About this product</h3>
                <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.8, marginBottom: 16 }}>
                  {product.name} is a premium quality product available exclusively at Outback Cartel. Carefully sourced and quality-checked before dispatch to ensure you receive exactly what you ordered.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["Category", CATS.find(c => c.key === product.cat)?.label || product.cat], ["Condition", "Brand New"], ["Warranty", "As per manufacturer"], ["Delivery", "Nationwide Bangladesh"], ["Return Policy", "7 days"], ["Payment", "bKash · Nagad · Rocket · COD"]].map(([k, v]) => (
                    <div key={k} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .4, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                {/* Rating summary */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "16px 20px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 44, fontWeight: 900, color: C.primary, lineHeight: 1 }}>{avgRating}</div>
                    <StarRating rating={Math.round(parseFloat(avgRating))} size={18} />
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{SAMPLE_REVIEWS.length} reviews</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = SAMPLE_REVIEWS.filter(r => r.rating === star).length;
                      const pct = Math.round((count / SAMPLE_REVIEWS.length) * 100);
                      return (
                        <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: C.muted, width: 12 }}>{star}</span>
                          <span style={{ color: C.accent, fontSize: 11 }}>★</span>
                          <div style={{ flex: 1, height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: C.muted, width: 26 }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review list */}
                {SAMPLE_REVIEWS.map((r, i) => (
                  <div key={i} style={{ padding: "16px 0", borderBottom: i < SAMPLE_REVIEWS.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>{r.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{r.date}</div>
                        </div>
                      </div>
                      <StarRating rating={r.rating} size={13} />
                    </div>
                    <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.7, margin: "0 0 0 46px" }}>{r.text}</p>
                  </div>
                ))}
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
  const [hov, setHov] = useState(false);
  const disc = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  const cc = CATS.find(c => c.key === p.cat)?.color || C.primary;
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.card, borderRadius: 14, overflow: "hidden", boxShadow: hov ? "0 12px 32px rgba(0,0,0,.14)" : "0 2px 12px rgba(0,0,0,.07)", transform: hov ? "translateY(-4px)" : "none", transition: "all .2s", position: "relative", border: `1px solid ${C.border}` }}>
      {p.badge && <span style={{ position: "absolute", top: 10, left: 10, zIndex: 2, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, color: p.badge === "Hot" ? "#1C1C1C" : "#fff", background: p.badge === "New" ? C.green : p.badge === "Hot" ? C.accent : C.primary }}>{p.badge}</span>}
      {disc > 0 && <span style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: C.primary, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50 }}>-{disc}%</span>}
      {/* Clickable image area → product page */}
      <div onClick={() => onView(p)} style={{ height: 170, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${cc}14,${cc}08)`, overflow: "hidden", cursor: "pointer" }}>
        {p.img ? <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} /> : <span style={{ fontSize: 60 }}>{p.icon || "📦"}</span>}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div onClick={() => onView(p)} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 10, color: cc, fontWeight: 700, textTransform: "uppercase", letterSpacing: .6, marginBottom: 4 }}>{CATS.find(c => c.key === p.cat)?.icon} {CATS.find(c => c.key === p.cat)?.label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, lineHeight: 1.3, marginBottom: 8, minHeight: 32, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{fmt(p.price)}</span>
            {p.old && <span style={{ fontSize: 11, color: C.muted, textDecoration: "line-through" }}>{fmt(p.old)}</span>}
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={() => onAdd(p)} style={{ flex: 1, background: "#fff", color: C.primary, border: `2px solid ${C.primary}`, borderRadius: 9, padding: "8px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = C.primary; }}>
            🛒 Cart
          </button>
          <button onClick={() => onView(p)} style={{ flex: 1, background: C.primary, color: "#fff", border: "none", borderRadius: 9, padding: "8px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            View →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CART SIDEBAR
// ─────────────────────────────────────────────────────────────
function CartSidebar({ cart, open, onClose, onQty, onRemove, onCheckout }) {
  const sub = cart.reduce((s, c) => s + c.price * c.qty, 0), del = sub >= 999 ? 0 : 70, total = sub + del;
  return (
    <>{open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500 }} />}
      <div style={{ position: "fixed", top: 0, right: open ? 0 : -440, bottom: 0, width: "100%", maxWidth: 420, background: "#fff", zIndex: 501, display: "flex", flexDirection: "column", boxShadow: "-6px 0 30px rgba(0,0,0,.15)", transition: "right .32s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>🛒 Cart ({cart.reduce((s, c) => s + c.qty, 0)})</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {cart.length === 0 ? <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}><div style={{ fontSize: 52, marginBottom: 12 }}>🛒</div><p>Your cart is empty!</p></div>
            : cart.map(item => (
              <div key={item.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 54, height: 54, borderRadius: 10, background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>{item.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{fmt(item.price * item.qty)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                    <button onClick={() => onQty(item.id, -1)} style={{ width: 24, height: 24, border: `2px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => onQty(item.id, 1)} style={{ width: 24, height: 24, border: `2px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
                <button onClick={() => onRemove(item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, alignSelf: "flex-start", padding: 4 }}>🗑</button>
              </div>
            ))}
        </div>
        {cart.length > 0 && <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 6 }}><span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(sub)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 10 }}><span>Delivery</span><span style={{ color: del === 0 ? C.green : "inherit", fontWeight: 600 }}>{del === 0 ? "FREE ✅" : fmt(del)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, paddingTop: 10, borderTop: `1px solid ${C.border}`, marginBottom: 14 }}><span>Total</span><span style={{ color: C.primary }}>{fmt(total)}</span></div>
          <Btn onClick={onCheckout} style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }}>Checkout →</Btn>
          {sub < 999 && <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 7 }}>Add {fmt(999 - sub)} more for free delivery!</p>}
        </div>}
      </div></>
  );
}

// ─────────────────────────────────────────────────────────────
//  SSLCOMMERZ + CHECKOUT
// ─────────────────────────────────────────────────────────────
async function initiateSSL({ form, cart, total, orderId }) {
  const payload = { store_id: CONFIG.SSL_STORE_ID, store_passwd: CONFIG.SSL_STORE_PASS, total_amount: total, currency: "BDT", tran_id: orderId, success_url: `${window.location.origin}/payment/success`, fail_url: `${window.location.origin}/payment/fail`, cancel_url: `${window.location.origin}/payment/cancel`, ipn_url: `${window.location.origin}/payment/ipn`, cus_name: form.name, cus_email: form.email || "customer@outbackcartel.com", cus_add1: form.address, cus_city: form.district, cus_country: "Bangladesh", cus_phone: form.phone, shipping_method: "Courier", product_name: cart.map(i => i.name).join(", ").substring(0, 200), product_category: "Mixed", product_profile: "general", ship_name: form.name, ship_add1: form.address, ship_city: form.district, ship_country: "Bangladesh" };
  if (CONFIG.SSL_STORE_ID === "YOUR_STORE_ID") return { demo: true, payload };
  try { const res = await fetch("/api/sslcommerz/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await res.json(); if (data.status === "SUCCESS" && data.GatewayPageURL) { window.location.href = data.GatewayPageURL; return { ok: true }; } return { error: data.failedreason || "Failed" }; } catch (e) { return { error: e.message }; }
}

function CheckoutModal({ cart, open, onClose, onSuccess, account }) {
  const [form, setForm] = useState({ name: account?.name || "", email: account?.method === "email" ? account?.contact || "" : "", phone: account?.method === "phone" ? account?.contact || "" : "", district: "", area: "", address: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoPL, setDemoPL] = useState(null);
  const sub = cart.reduce((s, c) => s + c.price * c.qty, 0), del = sub >= 999 ? 0 : 70, total = sub + del;
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };
  const validate = () => { const e = {}; if (!form.name.trim()) e.name = "Required"; if (!form.phone.trim()) e.phone = "Required"; if (!form.district) e.district = "Required"; if (!form.address.trim()) e.address = "Required"; setErrors(e); return Object.keys(e).length === 0; };
  const pay = async () => { if (!validate()) return; setLoading(true); const id = "OC-" + Date.now().toString().slice(-8); const r = await initiateSSL({ form, cart, total, orderId: id }); setLoading(false); if (r.demo) { setDemoPL(r.payload); setDemoMode(true); } else if (r.ok) { onSuccess(id); } else { alert("Error: " + r.error); } };
  const iS = k => ({ width: "100%", border: `2px solid ${errors[k] ? C.primary : C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", color: C.dark, background: "#fff" });
  if (!open) return null;
  if (demoMode) return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}><div style={{ background: "#003366", color: "#fff", padding: "18px 22px", borderRadius: "18px 18px 0 0" }}><div style={{ fontSize: 15, fontWeight: 800 }}>🏦 SSLCommerz Demo</div></div><div style={{ padding: "20px 22px" }}><div style={{ background: "#FFF8E7", border: `1px solid ${C.accent}`, borderRadius: 9, padding: 12, marginBottom: 14, fontSize: 12 }}><strong>⚠️</strong> Replace YOUR_STORE_ID in CONFIG to go live.</div><div style={{ background: "#1C1C1C", borderRadius: 10, padding: 14, overflowX: "auto", marginBottom: 14 }}><pre style={{ margin: 0, fontSize: 11, color: "#7EE787", lineHeight: 1.6, fontFamily: "monospace" }}>{JSON.stringify(demoPL, null, 2)}</pre></div><div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setDemoMode(false)} style={{ flex: 1 }}>← Back</Btn><Btn onClick={() => { setDemoMode(false); onSuccess("OC-DEMO"); }} style={{ flex: 2 }}>✅ Simulate Success</Btn></div></div></div></div>);
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.28)" }}>
    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "18px 18px 0 0" }}><span style={{ fontSize: 16, fontWeight: 800 }}>🧾 Checkout</span><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>✕</button></div>
    <div style={{ padding: "18px 22px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6, marginBottom: 12 }}>📦 Delivery Info</div>
      <div style={{ marginBottom: 11 }}><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full Name *" style={iS("name")} />{errors.name && <span style={{ color: C.primary, fontSize: 11 }}>{errors.name}</span>}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
        <div><input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone *" type="tel" style={iS("phone")} />{errors.phone && <span style={{ color: C.primary, fontSize: 11 }}>{errors.phone}</span>}</div>
        <div><input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email (opt)" style={iS("email")} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
        <div><select value={form.district} onChange={e => set("district", e.target.value)} style={{ ...iS("district"), cursor: "pointer" }}><option value="">District *</option>{["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Mymensingh", "Rangpur", "Comilla", "Gazipur", "Narayanganj", "Cox's Bazar", "Jessore", "Bogura", "Other"].map(d => <option key={d}>{d}</option>)}</select>{errors.district && <span style={{ color: C.primary, fontSize: 11 }}>{errors.district}</span>}</div>
        <div><input value={form.area} onChange={e => set("area", e.target.value)} placeholder="Area" style={iS("area")} /></div>
      </div>
      <div style={{ marginBottom: 14 }}><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full Address *" style={iS("address")} />{errors.address && <span style={{ color: C.primary, fontSize: 11 }}>{errors.address}</span>}</div>
      <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 12, border: `1px solid ${C.border}` }}>
        {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}><span>{i.icon} {i.name.substring(0, 24)}{i.name.length > 24 ? "…" : ""}×{i.qty}</span><span style={{ fontWeight: 700 }}>{fmt(i.price * i.qty)}</span></div>)}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, marginTop: 7, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}><span>Delivery</span><span style={{ color: del === 0 ? C.green : "inherit", fontWeight: 600 }}>{del === 0 ? "FREE" : fmt(del)}</span></div>
      </div>
      <div style={{ background: "#EEF4FF", border: "1px solid #C7D7F7", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 22 }}>🔒</span><div><div style={{ fontSize: 12, fontWeight: 700, color: "#003366" }}>Secured by SSLCommerz</div><div style={{ fontSize: 11, color: "#5A6A8A" }}>bKash · Nagad · Rocket · Cards · COD</div></div></div>
    </div>
    <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, background: C.bg, borderRadius: "0 0 18px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, marginBottom: 12 }}><span>Total</span><span style={{ color: C.primary }}>{fmt(total)}</span></div>
      <Btn onClick={pay} style={{ width: "100%", padding: 15, fontSize: 15, borderRadius: 12, opacity: loading ? .7 : 1 }}>{loading ? "⏳ Connecting…" : "💳 Pay via SSLCommerz"}</Btn>
    </div>
  </div></div>);
}

// ─────────────────────────────────────────────────────────────
//  SIDE DRAWER
// ─────────────────────────────────────────────────────────────
function SideDrawer({ open, onClose, activeCat, onCat, onNav, account, onAccountOpen, onLogout }) {
  return (
    <>{open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 400 }} />}
      <div style={{ position: "fixed", top: 0, left: open ? 0 : -320, bottom: 0, width: 290, background: "#fff", zIndex: 401, display: "flex", flexDirection: "column", boxShadow: "6px 0 32px rgba(0,0,0,.18)", transition: "left .3s cubic-bezier(.4,0,.2,1)", overflowY: "auto" }}>
        <div style={{ background: `linear-gradient(135deg,${C.dark},#2C1810)`, padding: "20px 18px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div><div style={{ fontSize: 16, fontWeight: 900, color: C.accent, letterSpacing: 1, textTransform: "uppercase" }}>Outback</div><div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: 3, textTransform: "uppercase" }}>Cartel</div></div>
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
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", padding: "6px 18px 8px" }}>Browse Categories</div>
          {CATS.map(c => (
            <button key={c.key} onClick={() => { onCat(c.key); onClose(); }} style={{ width: "100%", background: activeCat === c.key ? `${c.color}12` : "transparent", border: "none", borderLeft: activeCat === c.key ? `3px solid ${c.color}` : "3px solid transparent", padding: "11px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", color: activeCat === c.key ? c.color : C.dark }}
              onMouseEnter={e => { if (activeCat !== c.key) e.currentTarget.style.background = "#F5F3EF"; }} onMouseLeave={e => { if (activeCat !== c.key) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{c.icon}</span>
              <span style={{ fontSize: 13, fontWeight: activeCat === c.key ? 700 : 500 }}>{c.label}</span>
            </button>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", padding: "0 18px 8px" }}>Quick Links</div>
          {[["🏕️", "About Us", "about"], ["📦", "Track Order", "track"], ["🔄", "Return Policy", "returns"], ["❓", "FAQ", "faq"]].map(([ic, l, p]) => (
            <button key={p} onClick={() => { onNav(p); onClose(); }} style={{ width: "100%", background: "transparent", border: "none", padding: "10px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", color: C.dark, fontSize: 13 }} onMouseEnter={e => e.currentTarget.style.background = "#F5F3EF"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><span style={{ fontSize: 17 }}>{ic}</span>{l}</button>
          ))}
          <a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", textDecoration: "none", color: "#25D366", fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 17 }}>💬</span> WhatsApp Us</a>
        </div>
      </div></>
  );
}

// ─────────────────────────────────────────────────────────────
//  INFO PAGES
// ─────────────────────────────────────────────────────────────
function PageHero({ icon, title, subtitle }) { return <div style={{ background: `linear-gradient(135deg,${C.dark},#2C1810)`, color: "#fff", padding: "44px 20px", textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 10 }}>{icon}</div><h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>{title}</h1>{subtitle && <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", maxWidth: 480, margin: "0 auto" }}>{subtitle}</p>}</div>; }
function ICard({ children, style = {} }) { return <div style={{ background: "#fff", borderRadius: 14, padding: "22px", border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,.06)", marginBottom: 14, ...style }}>{children}</div>; }
function ITitle({ children }) { return <h2 style={{ fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 4, height: 20, background: C.primary, borderRadius: 4, display: "inline-block" }} />{children}</h2>; }

function AboutPage() { return <div><PageHero icon="🏕️" title="About Outback Cartel" subtitle="Born in Bangladesh, built for Bangladesh." /><div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}><ICard><ITitle>Our Story</ITitle><p style={{ fontSize: 14, color: "#444", lineHeight: 1.85 }}>Outback Cartel started with one idea: <strong>Bangladeshi shoppers deserve better.</strong> We curate electronics, beauty tech, travel gear, smart bags, gaming lifestyle products and more — all carefully selected for quality and value.</p></ICard><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>{[["5,000+", "Customers"], ["500+", "Products"], ["64", "Districts"], ["4.8★", "Rating"]].map(([v, l]) => <div key={l} style={{ background: "#fff", borderRadius: 12, padding: "18px 12px", textAlign: "center", border: `1px solid ${C.border}` }}><div style={{ fontSize: 22, fontWeight: 900, color: C.primary }}>{v}</div><div style={{ fontSize: 11, color: C.muted }}>{l}</div></div>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{[["🎯", "Mission", "Quality products at fair prices for all Bangladeshis."], ["🔒", "Security", "SSLCommerz keeps your payment safe."], ["🚀", "Speed", "Dhaka 1-2d, Bangladesh-wide 3-5d."], ["🤝", "Honesty", "No hidden fees, no fake reviews."]].map(([icon, t, d]) => <ICard key={t} style={{ marginBottom: 0 }}><div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{t}</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{d}</div></ICard>)}</div></div></div>; }

function TrackPage() { const [oid, setOid] = useState(""), [ph, setPh] = useState(""), [res, setRes] = useState(null), [loading, setLoading] = useState(false), [err, setErr] = useState(""); const DEMO = [{ id: "OC-12345678", phone: "01881816245", steps: 4 }, { id: "OC-87654321", phone: "01881816245", steps: 3 }, { id: "OC-11111111", phone: "01881816245", steps: 2 }]; const STEPS = [{ icon: "✔️", label: "Confirmed" }, { icon: "📦", label: "Processing" }, { icon: "🚚", label: "On the Way" }, { icon: "🎉", label: "Delivered" }]; const track = () => { setErr(""); setRes(null); if (!oid.trim() || !ph.trim()) { setErr("Enter Order ID and phone."); return; } setLoading(true); setTimeout(() => { setLoading(false); const f = DEMO.find(d => d.id === oid.trim() && d.phone === ph.trim()); f ? setRes(f) : setErr("Order not found. Check Order ID and phone."); }, 1000); }; return <div><PageHero icon="📦" title="Track Your Order" subtitle="Enter your Order ID and phone number." /><div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}><ICard><ITitle>Order Lookup</ITitle><input value={oid} onChange={e => setOid(e.target.value)} placeholder="Order ID (e.g. OC-12345678)" style={{ width: "100%", border: `2px solid ${C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 10 }} /><input value={ph} onChange={e => setPh(e.target.value)} placeholder="Phone (01XXXXXXXXX)" type="tel" style={{ width: "100%", border: `2px solid ${C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 12 }} />{err && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>⚠️ {err}</div>}<Btn onClick={track} style={{ width: "100%", padding: 13, borderRadius: 12 }}>{loading ? "🔍 Searching…" : "🔍 Track Order"}</Btn></ICard>{res && <ICard><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{res.id}</div><span style={{ background: res.steps === 4 ? C.green : C.primary, color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 50 }}>{STEPS[res.steps - 1].label}</span></div><div style={{ position: "relative" }}><div style={{ position: "absolute", top: 21, left: 22, right: 22, height: 3, background: "#E5E7EB", zIndex: 0 }} /><div style={{ position: "absolute", top: 21, left: 22, height: 3, background: C.green, zIndex: 1, width: `${Math.min(((res.steps - 1) / 3) * 100, 100)}%` }} /><div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>{STEPS.map((s, i) => { const done = i < res.steps, active = i === res.steps - 1; return <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: done || active ? (active ? C.primary : C.green) : "#E5E7EB", color: (done || active) ? "#fff" : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,.1)", marginBottom: 8 }}>{s.icon}</div><div style={{ fontSize: 11, fontWeight: 700, textAlign: "center", color: (done || active) ? C.dark : C.muted }}>{s.label}</div></div>; })}</div></div></ICard>}<ICard style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>💬</div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Can't find your order?</div><a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#25D366", color: "#fff", textDecoration: "none", padding: "10px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700 }}>💬 WhatsApp Us</a></ICard></div></div>; }

function ReturnsPage() { const ok = ["Damaged or broken on arrival", "Wrong item delivered", "Defective on arrival", "Missing parts"], no = ["After 7 days", "Used or altered items", "Change of mind"]; return <div><PageHero icon="🔄" title="Return Policy" subtitle="7-day hassle-free returns." /><div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}><div style={{ background: `linear-gradient(135deg,${C.green},#1a5c35)`, borderRadius: 14, padding: "20px 22px", marginBottom: 14, color: "#fff", display: "flex", alignItems: "center", gap: 14 }}><span style={{ fontSize: 40 }}>✅</span><div><div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>7-Day Easy Returns</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.8)" }}>Hassle-free, no arguments.</div></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}><ICard style={{ marginBottom: 0 }}><ITitle>✅ Eligible</ITitle>{ok.map(e => <div key={e} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ color: C.green, fontWeight: 700 }}>✓</span>{e}</div>)}</ICard><ICard style={{ marginBottom: 0 }}><ITitle>❌ Not Eligible</ITitle>{no.map(e => <div key={e} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ color: C.primary, fontWeight: 700 }}>✕</span>{e}</div>)}</ICard></div><ICard style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>💬</div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Start a return on WhatsApp</div><a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20Return%20request.%20Order:%20`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#25D366", color: "#fff", textDecoration: "none", padding: "11px 24px", borderRadius: 50, fontSize: 14, fontWeight: 700 }}>💬 Start Return</a></ICard></div></div>; }

function FAQPage() { const [open, setOpen] = useState(null); const faqs = [{ cat: "🛒 Ordering", items: [{ q: "How do I place an order?", a: "Browse, add to cart, checkout. You'll get an Order ID instantly." }, { q: "Can I order by WhatsApp?", a: `Yes! Text us on ${CONFIG.WHATSAPP_DISPLAY}. (Text only — no calls.)` }, { q: "Is there a minimum order?", a: "No minimum. Free delivery above ৳999, else ৳70 charge." }, { q: "Can I cancel after placing?", a: "Yes, within 2 hours before dispatch. WhatsApp us immediately." }] }, { cat: "🚚 Delivery", items: [{ q: "How long does delivery take?", a: "Dhaka: 1–2 days. Outside Dhaka: 3–5 days." }, { q: "Do you deliver everywhere?", a: "Yes — all 64 districts of Bangladesh." }, { q: "What if I'm not home?", a: "Courier tries twice. After 2 attempts package returns — contact us to reschedule." }] }, { cat: "💳 Payment", items: [{ q: "What payment methods?", a: "bKash, Nagad, Rocket, Visa/MC, Net Banking, Cash on Delivery — via SSLCommerz." }, { q: "Is my payment safe?", a: "100%. SSLCommerz with full SSL encryption." }, { q: "Cash on Delivery available?", a: "Yes! Select COD at checkout." }] }, { cat: "📦 Products", items: [{ q: "Are products authentic?", a: "Sourced from verified suppliers. If it doesn't match, return for a full refund." }, { q: "Damaged product — what do I do?", a: "Take photos and WhatsApp us within 24 hours. We replace or refund fast." }, { q: "Out of stock — can I pre-order?", a: "Yes! WhatsApp us the product name and we'll source it." }] }]; return <div><PageHero icon="❓" title="FAQ" subtitle="Quick answers." /><div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>{faqs.map((sec, si) => <div key={sec.cat} style={{ marginBottom: 24 }}><h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 4, height: 18, background: C.primary, borderRadius: 4, display: "inline-block" }} />{sec.cat}</h2>{sec.items.map((item, ii) => { const k = `${si}-${ii}`, isO = open === k; return <div key={ii} style={{ background: "#fff", borderRadius: 11, marginBottom: 7, border: `1px solid ${isO ? C.primary : C.border}`, overflow: "hidden" }}><button onClick={() => setOpen(isO ? null : k)} style={{ width: "100%", background: "none", border: "none", padding: "14px 18px", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" }}><span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.q}</span><span style={{ fontSize: 18, color: isO ? C.primary : C.muted, transform: isO ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span></button>{isO && <div style={{ padding: "0 18px 14px", fontSize: 13, color: "#4B5563", lineHeight: 1.75, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>{item.a}</div>}</div>; })} </div>)}<ICard style={{ textAlign: "center", background: `linear-gradient(135deg,${C.dark},#2C1810)`, border: "none" }}><div style={{ color: "#fff" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div><div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Still have a question?</div><a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#25D366", color: "#fff", textDecoration: "none", padding: "11px 24px", borderRadius: 50, fontSize: 14, fontWeight: 700 }}>💬 {CONFIG.WHATSAPP_DISPLAY}</a></div></ICard></div></div>; }

// ─────────────────────────────────────────────────────────────
//  ADMIN LOGIN + PANEL
// ─────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onCancel }) { const [pw, setPw] = useState(""), [err, setErr] = useState(false); const go = () => { if (pw === CONFIG.ADMIN_PASSWORD) { onLogin(); } else { setErr(true); setTimeout(() => setErr(false), 1600); } }; return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ background: "#fff", borderRadius: 18, padding: "34px 28px", width: "100%", maxWidth: 320, textAlign: "center" }}><div style={{ fontSize: 44, marginBottom: 10 }}>🔐</div><h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Admin Login</h2><input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="Password" style={{ width: "100%", border: `2px solid ${err ? C.primary : C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 15, outline: "none", fontFamily: "inherit", textAlign: "center", letterSpacing: 2, marginBottom: 10 }} />{err && <p style={{ color: C.primary, fontSize: 12, marginBottom: 8 }}>❌ Wrong password</p>}<div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</Btn><Btn onClick={go} style={{ flex: 1 }}>Login</Btn></div><p style={{ fontSize: 11, color: "#C4C4C4", marginTop: 12 }}>Default: outback2024</p></div></div>; }

const BLANK = { name: "", cat: "electronics", price: "", old: "", icon: "📦", badge: "", img: "" };
const ICONS = ["📱", "🔌", "⚡", "🎧", "🔋", "📺", "💻", "⌚", "🎮", "⌨️", "🖱️", "🧴", "✨", "💄", "🪒", "😷", "💨", "🌀", "🧳", "😴", "🎒", "💼", "👜", "🖥️", "🪑", "🗂️", "💡", "👗", "👘", "👟", "🍶", "🧘", "🏏", "🧱", "🚗", "📦", "🎁"];
function ProductForm({ initial, onSave, onCancel }) { const [f, setF] = useState(initial || BLANK), [errors, setErrors] = useState({}); const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); }; const validate = () => { const e = {}; if (!f.name.trim()) e.name = "Required"; if (!f.price || isNaN(f.price) || Number(f.price) <= 0) e.price = "Enter valid price"; setErrors(e); return Object.keys(e).length === 0; }; const submit = () => { if (validate()) onSave({ ...f, price: Number(f.price), old: f.old ? Number(f.old) : null }); }; const iS = field => ({ width: "100%", border: `2px solid ${errors[field] ? C.primary : C.border}`, borderRadius: 9, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", color: C.dark, background: "#fff" }); return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 910, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }}><div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "18px 18px 0 0" }}><span style={{ fontSize: 16, fontWeight: 800 }}>{initial ? "✏️ Edit" : "➕ Add Product"}</span><button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>✕</button></div><div style={{ padding: "20px 22px" }}><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "block", color: C.muted, textTransform: "uppercase" }}>Name *</label><input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Product name" style={iS("name")} />{errors.name && <span style={{ color: C.primary, fontSize: 11 }}>{errors.name}</span>}</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "block", color: C.muted, textTransform: "uppercase" }}>Category *</label><select value={f.cat} onChange={e => set("cat", e.target.value)} style={{ ...iS("cat"), cursor: "pointer" }}>{CATS.filter(c => c.key !== "all").map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}</select></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}><div><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "block", color: C.muted, textTransform: "uppercase" }}>Sale Price *</label><input value={f.price} onChange={e => set("price", e.target.value)} placeholder="1999" type="number" style={iS("price")} />{errors.price && <span style={{ color: C.primary, fontSize: 11 }}>{errors.price}</span>}</div><div><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "block", color: C.muted, textTransform: "uppercase" }}>Original Price</label><input value={f.old} onChange={e => set("old", e.target.value)} placeholder="2500" type="number" style={iS("old")} /></div></div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 7, display: "block", color: C.muted, textTransform: "uppercase" }}>Badge</label><div style={{ display: "flex", gap: 7 }}>{["", "Hot", "New", "Sale"].map(b => <button key={b} onClick={() => set("badge", b)} style={{ padding: "6px 14px", borderRadius: 50, border: "2px solid", borderColor: f.badge === b ? C.primary : C.border, background: f.badge === b ? C.primary : "#fff", color: f.badge === b ? "#fff" : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{b || "None"}</button>)}</div></div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 7, display: "block", color: C.muted, textTransform: "uppercase" }}>Icon <span style={{ fontSize: 18 }}>{f.icon}</span></label><div style={{ display: "flex", flexWrap: "wrap", gap: 5, background: C.bg, borderRadius: 9, padding: 8, maxHeight: 110, overflowY: "auto" }}>{ICONS.map(ic => <button key={ic} onClick={() => set("icon", ic)} style={{ width: 34, height: 34, fontSize: 18, border: `2px solid ${f.icon === ic ? C.primary : "transparent"}`, borderRadius: 7, cursor: "pointer", background: f.icon === ic ? "#fff" : "transparent" }}>{ic}</button>)}</div></div><div><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "block", color: C.muted, textTransform: "uppercase" }}>Image URL</label><input value={f.img} onChange={e => set("img", e.target.value)} placeholder="https://…" style={iS("img")} />{f.img && <div style={{ marginTop: 7, width: 70, height: 70, borderRadius: 8, overflow: "hidden", border: `2px solid ${C.border}` }}><img src={f.img} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}</div></div><div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, background: C.bg, borderRadius: "0 0 18px 18px" }}><Btn variant="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</Btn><Btn onClick={submit} style={{ flex: 2 }}>{initial ? "💾 Save" : "➕ Add"}</Btn></div></div></div>; }

function AdminPanel({ products, onSave, onLogout }) { const [search, setSearch] = useState(""), [catF, setCatF] = useState("all"), [showForm, setShowForm] = useState(false), [editItem, setEditItem] = useState(null), [deleteId, setDeleteId] = useState(null); const filtered = products.filter(p => (catF === "all" || p.cat === catF) && (!search || p.name.toLowerCase().includes(search.toLowerCase()))); const add = d => { onSave([...products, { ...d, id: uid() }]); setShowForm(false); }; const edit = d => { onSave(products.map(p => p.id === editItem.id ? { ...d, id: p.id } : p)); setEditItem(null); }; const del = id => { onSave(products.filter(p => p.id !== id)); setDeleteId(null); }; return <div style={{ minHeight: "100vh", background: "#F0EDE8", fontFamily: "inherit" }}><div style={{ background: C.dark, color: "#fff", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 18, fontWeight: 900, color: C.accent, letterSpacing: 1, textTransform: "uppercase" }}>OUTBACK<span style={{ color: "#fff" }}> CARTEL</span></span><span style={{ background: "rgba(255,255,255,.1)", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>⚙️ Admin</span></div><Btn variant="ghost" onClick={onLogout} style={{ fontSize: 12, padding: "7px 14px" }}>🚪 Logout</Btn></div><div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 18px" }}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>{[{ l: "Products", v: products.length, icon: "📦", col: C.primary }, { l: "Categories", v: [...new Set(products.map(p => p.cat))].length, icon: "🗂️", col: C.green }, { l: "Avg Price", v: products.length ? fmt(Math.round(products.reduce((s, p) => s + p.price, 0) / products.length)) : "৳0", icon: "💰", col: C.accent }].map(s => <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 10px rgba(0,0,0,.07)", border: `1px solid ${C.border}` }}><span style={{ fontSize: 28 }}>{s.icon}</span><div><div style={{ fontSize: 22, fontWeight: 800, color: s.col }}>{s.v}</div><div style={{ fontSize: 11, color: C.muted }}>{s.l}</div></div></div>)}</div>{CONFIG.SSL_STORE_ID === "YOUR_STORE_ID" && <div style={{ background: "#FFF8E7", border: `2px solid ${C.accent}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 12 }}>⚠️ <strong>SSLCommerz not configured.</strong> <a href="https://dashboard.sslcommerz.com" target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 700 }}>Get credentials →</a></div>}<div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: `1px solid ${C.border}` }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search…" style={{ flex: 1, minWidth: 160, border: `2px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }} /><select value={catF} onChange={e => setCatF(e.target.value)} style={{ border: `2px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>{CATS.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}</select><Btn onClick={() => setShowForm(true)} style={{ whiteSpace: "nowrap", padding: "9px 16px", fontSize: 13 }}>➕ Add</Btn></div><div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}><div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 13, fontWeight: 700 }}>Products ({filtered.length})</span></div>{filtered.length === 0 ? <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}><div style={{ fontSize: 44, marginBottom: 10 }}>📦</div><p style={{ fontSize: 14 }}>No products. <span style={{ color: C.primary, cursor: "pointer", fontWeight: 600 }} onClick={() => setShowForm(true)}>Add first →</span></p></div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: C.bg }}>{["Product", "Cat", "Price", "Old", "Badge", ""].map(h => <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filtered.map((p, i) => <tr key={p.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#FAFAF8" }}><td style={{ padding: "11px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 38, height: 38, borderRadius: 7, background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{p.icon}</div><div style={{ fontSize: 12, fontWeight: 600, maxWidth: 160 }}>{p.name}</div></div></td><td style={{ padding: "11px 14px" }}><span style={{ background: C.bg, color: C.dark, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 50 }}>{CATS.find(c => c.key === p.cat)?.icon} {p.cat}</span></td><td style={{ padding: "11px 14px", fontWeight: 800, color: C.primary, fontSize: 13 }}>{fmt(p.price)}</td><td style={{ padding: "11px 14px", color: C.muted, fontSize: 12, textDecoration: "line-through" }}>{p.old ? fmt(p.old) : "—"}</td><td style={{ padding: "11px 14px" }}>{p.badge ? <span style={{ background: p.badge === "New" ? C.green : p.badge === "Hot" ? C.accent : C.primary, color: p.badge === "Hot" ? "#1C1C1C" : "#fff", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 50 }}>{p.badge}</span> : <span style={{ color: "#C4C4C4", fontSize: 11 }}>—</span>}</td><td style={{ padding: "11px 14px" }}><div style={{ display: "flex", gap: 6 }}><button onClick={() => setEditItem(p)} style={{ background: "#EEF2FF", color: "#4F46E5", border: "none", padding: "6px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✏️</button><button onClick={() => setDeleteId(p.id)} style={{ background: "#FEF2F2", color: "#DC2626", border: "none", padding: "6px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🗑</button></div></td></tr>)}</tbody></table></div>}</div></div>{showForm && <ProductForm onSave={add} onCancel={() => setShowForm(false)} />}{editItem && <ProductForm initial={editItem} onSave={edit} onCancel={() => setEditItem(null)} />}{deleteId && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 910, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ background: "#fff", borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 320, textAlign: "center" }}><div style={{ fontSize: 42, marginBottom: 10 }}>⚠️</div><h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Delete Product?</h3><p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Cannot be undone.</p><div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setDeleteId(null)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="danger" onClick={() => del(deleteId)} style={{ flex: 1 }}>Delete</Btn></div></div></div>}</div>; }

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
  { tags: ["payment", "pay", "bkash", "nagad", "rocket", "card", "cash", "cod", "deliver on", "দেওয়া", "পেমেন্ট", "পেমেন্ট করব", "কীভাবে পেমেন্ট"], reply: "We accept multiple payment methods via **SSLCommerz** 🔒\n\n• 📱 bKash\n• 💳 Nagad\n• 🚀 Rocket\n• 💳 Visa / Mastercard\n• 🏦 Net Banking\n• 💵 Cash on Delivery (COD)\n\nAll payments are 100% secure! ✅" },

  // Delivery
  { tags: ["delivery", "deliver", "shipping", "ship", "কতদিন", "কতদিনে", "কবে পাব", "পৌঁছাবে", "দিন"], reply: "🚚 Delivery times:\n\n• **Dhaka city**: 1–2 business days\n• **Outside Dhaka**: 3–5 business days\n• **Remote areas**: up to 7 days\n\nWe deliver to all **64 districts** of Bangladesh! 🇧🇩" },
  { tags: ["free delivery", "free shipping", "free", "মুফত", "বিনামূল্যে", "ফ্রি ডেলিভারি"], reply: "🎉 **Free delivery** on all orders above ৳999!\n\nOrders below ৳999 have a flat ৳70 delivery charge. So add a bit more to your cart and save! 😉" },
  { tags: ["delivery charge", "delivery cost", "shipping cost", "ডেলিভারি চার্জ", "খরচ"], reply: "📦 Delivery charge is just **৳70** for orders below ৳999.\n\nOrders above ৳999 get **FREE delivery** 🎉 across all of Bangladesh!" },

  // Return & Refund
  { tags: ["return", "refund", "ফেরত", "রিটার্ন", "money back", "ফেরত দেওয়া"], reply: "🔄 We have a **7-day easy return policy**!\n\nEligible for return if:\n✅ Item is damaged or defective\n✅ Wrong item delivered\n✅ Missing parts\n\nJust WhatsApp us within 7 days with photos 📸\n👉 01881816245" },

  // Tracking
  { tags: ["track", "tracking", "order status", "where is", "কোথায়", "ট্র্যাক", "অর্ডার কোথায়"], reply: "📦 To track your order:\n\n1️⃣ Click **Track Order** in the menu\n2️⃣ Enter your **Order ID** + phone number\n3️⃣ See live status!\n\nOr WhatsApp us your Order ID at **01881816245** 💬" },

  // How to order
  { tags: ["how to order", "place order", "how order", "order kori", "অর্ডার করব", "কিভাবে অর্ডার", "order দেব"], reply: "🛒 Ordering is super easy!\n\n1️⃣ Browse & add items to cart\n2️⃣ Click **Checkout**\n3️⃣ Enter delivery address\n4️⃣ Pay via SSLCommerz\n5️⃣ Get your Order ID ✅\n\nNeed help? WhatsApp: **01881816245**" },

  // Cancel order
  { tags: ["cancel", "cancel order", "অর্ডার বাতিল", "বাতিল করব"], reply: "⚠️ You can cancel your order within **2 hours** of placing it — before it's dispatched.\n\nJust WhatsApp us immediately at **01881816245** with your Order ID 📲" },

  // Products — Electronics
  { tags: ["phone", "mobile", "samsung", "realme", "iphone", "smartphone", "ফোন", "মোবাইল"], reply: "📱 We have great smartphones!\n\n• Samsung Galaxy A35 5G — ৳32,999\n• And more coming soon!\n\nCheck the **Electronics** category for all phones 🔍" },
  { tags: ["earbuds", "headphone", "earphone", "jbl", "speaker", "হেডফোন"], reply: "🎧 We've got amazing audio gear!\n\n• JBL Tune 520BT Earbuds — ৳3,499\n• Gaming Headset 7.1 — ৳2,799\n\nCheck **Electronics** or **Gaming Lifestyle** for more! 🎵" },
  { tags: ["power bank", "charger", "charging", "চার্জার", "পাওয়ার ব্যাংক"], reply: "🔋 Great accessories available!\n\n• Anker Power Bank 20000mAh — ৳2,799\n• 65W GaN Fast Charger — ৳1,299\n• Wireless Charging Pad 15W — ৳899\n\nFind them in **Phone Accessories** 🔌" },

  // Products — Smartwatches
  { tags: ["watch", "smartwatch", "apple watch", "samsung watch", "ঘড়ি", "স্মার্টওয়াচ"], reply: "⌚ We have awesome smartwatches!\n\n• Smart Watch Fitness Tracker Pro — ৳4,999\n• Apple Watch Series 9 — ৳49,999\n• Samsung Galaxy Watch 6 — ৳34,999\n\nSee all in **Smartwatches** category! 😍" },

  // Products — Gaming
  { tags: ["gaming", "game", "ps5", "controller", "keyboard", "mouse", "গেমিং"], reply: "🎮 Gamers, we've got you!\n\n• PS5 DualSense Controller — ৳8,499\n• Mechanical Gaming Keyboard — ৳3,999\n• Gaming Headset 7.1 — ৳2,799\n• RGB Mouse Pad XL — ৳899\n\nExplore **Gaming Lifestyle** for more! 🕹️" },

  // Products — Beauty
  { tags: ["beauty", "skincare", "face wash", "serum", "makeup", "মেকআপ", "স্কিনকেয়ার", "সৌন্দর্য"], reply: "💄 We have amazing beauty products!\n\n• Neutrogena Face Wash — ৳750\n• Vitamin C Serum + SPF — ৳1,299\n• Men's Grooming Kit — ৳1,450\n\nCheck **Beauty & Health** and **Beauty Tech** categories! ✨" },
  { tags: ["led mask", "facial", "steamer", "cleansing brush", "beauty tech", "বিউটি টেক"], reply: "✨ Our Beauty Tech collection is 🔥\n\n• LED Face Mask Therapy — ৳3,999\n• Facial Steamer Nano Ionic — ৳1,899\n• Electric Cleansing Brush — ৳999\n\nSee all in **Beauty Tech** category! 💆" },

  // Products — Bags & Travel
  { tags: ["bag", "backpack", "laptop bag", "travel bag", "ব্যাগ", "ব্যাকপ্যাক"], reply: "🎒 Smart bags & backpacks!\n\n• Anti-Theft Backpack USB — ৳3,499\n• Slim Laptop Bag 15.6\" — ৳1,999\n• Waterproof Crossbody Bag — ৳1,299\n\nExplore **Smart Bags & Backpacks** 💼" },
  { tags: ["travel", "travelling", "trip", "journey", "ট্রাভেল", "ভ্রমণ"], reply: "🧳 Travel in style with our kits!\n\n• Travel Packing Cubes Set — ৳1,299\n• Travel Adapter Universal — ৳899\n• Memory Foam Neck Pillow — ৳699\n• TSA Toiletry Bag — ৳549\n\nSee **Travel Kits** category! ✈️" },

  // Products — Home Office
  { tags: ["office", "desk", "monitor stand", "lamp", "lumbar", "home office", "অফিস"], reply: "🖥️ Level up your home office!\n\n• Monitor Stand + Drawer — ৳2,499\n• LED Desk Lamp w/ Wireless Charger — ৳2,299\n• Ergonomic Lumbar Cushion — ৳1,199\n• Cable Management Organiser — ৳599\n\nSee **Home Office Aesthetics**! 💡" },

  // Products — Clothing
  { tags: ["panjabi", "saree", "clothes", "shirt", "shoes", "fashion", "পোশাক", "পাঞ্জাবি", "শাড়ি"], reply: "👗 Style yourself with Outback Cartel!\n\n• Men's Cotton Panjabi (Eid) — ৳1,299\n• Women's Silk Saree — ৳3,499\n• Premium Running Shoes — ৳2,199\n\nExplore **Clothing & Fashion** 👘" },

  // WhatsApp
  { tags: ["whatsapp", "contact", "support", "help", "সাহায্য", "যোগাযোগ", "কথা বলতে"], reply: "💬 Reach us on WhatsApp anytime!\n\n📱 **01881816245**\n\n⚠️ Text only — no calls please.\nWe usually reply within **30 minutes**! ⚡" },

  // About
  { tags: ["about", "who are you", "outback cartel", "তোমরা কে", "আপনারা কে", "store"], reply: "🏕️ **Outback Cartel** is Bangladesh's trusted online dropshipping store!\n\nWe sell:\n📱 Electronics · Phone Accessories\n✨ Beauty Tech · Smartwatches\n🎮 Gaming · Travel · Smart Bags\n👗 Clothing · Home & Living\n\n🔒 Secure payments · Fast delivery · 7-day returns" },

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
    { role: "assistant", content: "Hi! 👋 I'm **Carla**, your Outback Cartel shopping assistant. How can I help you today?\n\nYou can ask me about:\n• 🛍️ Products & categories\n• 🚚 Delivery & tracking\n• 💳 Payments & returns\n• 📦 Your order status" }
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
      <button onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 600,
          width: 58, height: 58, borderRadius: "50%",
          background: `linear-gradient(135deg,${C.primary},#9B1B10)`,
          border: "none", cursor: "pointer", boxShadow: "0 6px 24px rgba(200,57,43,.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, transition: "transform .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        title="Chat with Carla — AI Assistant"
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: C.accent, color: "#1C1C1C", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 20, zIndex: 600,
          width: "min(370px, calc(100vw - 32px))",
          height: "min(520px, calc(100vh - 120px))",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 16px 48px rgba(0,0,0,.22)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: `1px solid ${C.border}`,
          animation: "chatSlideUp .25s ease",
        }}>

          {/* Header */}
          <div style={{ background: `linear-gradient(135deg,${C.dark},#2C1810)`, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, border: "2px solid rgba(255,255,255,.25)" }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Carla — AI Assistant</div>
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
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", background: "#F7F5F2" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10, alignItems: "flex-end", gap: 7 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginBottom: 2 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "80%",
                  background: m.role === "user" ? C.primary : "#fff",
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
                      style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 50, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: C.dark, fontFamily: "inherit", transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
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
                <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px", padding: "12px 16px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
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
          <div style={{ background: "#F0FDF4", borderTop: `1px solid #BBF7D0`, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontSize: 11, color: "#166534" }}>Prefer human help?</span>
            <a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20I%20need%20help%20from%20Outback%20Cartel.`} target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", background: "#25D366", color: "#fff", textDecoration: "none", padding: "4px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
              WhatsApp us →
            </a>
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0, background: "#fff" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask Carla anything…"
              disabled={loading}
              style={{ flex: 1, border: `2px solid ${C.border}`, borderRadius: 50, padding: "9px 16px", fontSize: 13, outline: "none", fontFamily: "inherit", color: C.dark, background: loading ? "#f9f9f9" : "#fff", transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width: 40, height: 40, borderRadius: "50%", background: input.trim() && !loading ? C.primary : "#E5E7EB", color: input.trim() && !loading ? "#fff" : C.muted, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
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
function ShopPage({ products, onAdd, onView, activeCat, onCatChange }) { const [search, setSearch] = useState(""); const filtered = products.filter(p => (activeCat === "all" || p.cat === activeCat) && (!search || p.name.toLowerCase().includes(search.toLowerCase()))); const cat = CATS.find(c => c.key === activeCat) || CATS[0]; return <div><div style={{ background: `linear-gradient(135deg,${C.dark},#2C1810)`, color: "#fff", padding: "46px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", top: -50, left: -50, width: 200, height: 200, background: "rgba(200,57,43,.12)", borderRadius: "50%" }} /><div style={{ position: "absolute", bottom: -70, right: -30, width: 240, height: 240, background: "rgba(232,160,32,.08)", borderRadius: "50%" }} /><div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}><span style={{ display: "inline-block", background: C.primary, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 50, marginBottom: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>🔥 Premium Store</span><h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 12, letterSpacing: -1 }}>Quality Products,<br /><span style={{ color: C.accent }}>Delivered Fast!</span></h1><p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", marginBottom: 22, lineHeight: 1.7 }}>Electronics · Phone Accessories · Beauty Tech · Smartwatches · Gaming · Travel & more</p><div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}><Btn onClick={() => onCatChange("all")} style={{ padding: "12px 28px", fontSize: 14, borderRadius: 50 }}>Shop Now →</Btn><a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ background: "#25D366", color: "#fff", textDecoration: "none", padding: "12px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>💬 WhatsApp</a></div></div></div><div style={{ background: "#fff", padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}><div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>🔒 Secure:</span>{[["bKash", "#E2136E"], ["Nagad", "#F05A28"], ["Rocket", "#8B2FC9"], ["Visa", "#003366"], ["COD", "#555"]].map(([l, bg]) => <span key={l} style={{ background: bg, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>{l}</span>)}<span style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>Free delivery above ৳999</span></div></div><div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 18px" }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 24 }}>{[["🚚", "Fast Delivery", "Dhaka 1-2d | BD 3-5d"], ["💳", "SSLCommerz", "bKash · Nagad · Cards"], ["🔄", "7-Day Returns", "Hassle free"], ["💬", "WhatsApp", "Text only support"]].map(([icon, t, d]) => <div key={t} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)", border: `1px solid ${C.border}` }}><span style={{ fontSize: 24 }}>{icon}</span><div><div style={{ fontSize: 12, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 10, color: C.muted }}>{d}</div></div></div>)}</div><div style={{ display: "flex", gap: 7, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>{CATS.map(c => <button key={c.key} onClick={() => onCatChange(c.key)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 50, fontSize: 12, fontWeight: 500, border: `2px solid ${activeCat === c.key ? c.color : C.border}`, background: activeCat === c.key ? c.color : "#fff", color: activeCat === c.key ? "#fff" : C.muted, cursor: "pointer", whiteSpace: "nowrap", transition: "all .2s", fontFamily: "inherit", flexShrink: 0 }}>{c.icon} {c.label}</button>)}</div><div style={{ display: "flex", border: `2px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 18 }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search in ${cat.label}…`} style={{ flex: 1, border: "none", outline: "none", padding: "11px 16px", fontSize: 14, fontFamily: "inherit", background: "transparent" }} />{search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", padding: "11px 14px", cursor: "pointer", fontSize: 15, color: C.muted }}>✕</button>}</div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h2 style={{ fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 4, height: 20, background: cat.color || C.primary, borderRadius: 4, display: "inline-block" }} />{cat.icon} {cat.label}</h2><span style={{ fontSize: 12, color: C.muted }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span></div>{filtered.length === 0 ? <div style={{ textAlign: "center", padding: "50px 20px", color: C.muted }}><div style={{ fontSize: 48, marginBottom: 10 }}>🔍</div><p style={{ fontSize: 14 }}>No products found.</p></div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>{filtered.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onView={onView} />)}</div>}</div></div>; }

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────
export default function OutbackCartel() {
  const [products, setProducts] = useState(() => ls.get("oc_products") || DEFAULT_PRODUCTS);
  const [page, setPage] = useState("shop");
  const [activeCat, setActiveCat] = useState("all");
  const [selectedProd, setSelectedProd] = useState(null); // product detail page
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [toast, setToast] = useState("");
  const [view, setView] = useState("site");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [account, setAccount] = useState(() => ls.get("oc_account"));

  const upd = list => { setProducts(list); ls.set("oc_products", list); };
  const toast_ = msg => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const nav = (p, cat) => { setPage(p); setSelectedProd(null); if (cat) setActiveCat(cat); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const addToCart = p => {
    setCart(prev => { const ex = prev.find(c => c.id === p.id); return ex ? prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...p, qty: 1 }]; });
    toast_(`✅ ${p.name.substring(0, 26)}… added!`);
  };
  const viewProduct = p => { setSelectedProd(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const changeQty = (id, d) => setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0));
  const removeItem = id => setCart(prev => prev.filter(c => c.id !== id));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleLogout = () => { setAccount(null); ls.del("oc_account"); setShowDash(false); toast_("👋 Logged out"); };
  const handleAccountClick = () => account ? setShowDash(true) : setShowAuth(true);

  if (view === "admin" && adminAuthed) return <AdminPanel products={products} onSave={upd} onLogout={() => { setView("site"); setAdminAuthed(false); }} />;

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
    return <ShopPage products={products} onAdd={addToCart} activeCat={activeCat} onCatChange={cat => { setActiveCat(cat); setPage("shop"); }} />;
  };

  return (
    <>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}@keyframes chatSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes dotBounce{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>

      {/* TOPBAR */}
      <div style={{ background: C.dark, color: "#fff", textAlign: "center", fontSize: 12, padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        <span>🇧🇩 Free delivery above ৳999</span>
        <span style={{ color: "rgba(255,255,255,.3)" }}>|</span>
        <a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ color: "#25D366", fontWeight: 700, textDecoration: "none" }}>💬 {CONFIG.WHATSAPP_DISPLAY} (text only)</a>
      </div>

      {/* HEADER */}
      <div style={{ background: "#fff", boxShadow: "0 2px 14px rgba(0,0,0,.08)", position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "11px 18px", display: "flex", alignItems: "center", gap: 12 }}>

          {/* ☰ */}
          <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8, display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = "#F5F3EF"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 22, height: 2.5, background: C.dark, borderRadius: 2 }} />)}
          </button>

          {/* Logo */}
          <div onClick={() => nav("shop")} style={{ cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.primary, letterSpacing: 1, textTransform: "uppercase" }}>Outback</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: 3, textTransform: "uppercase" }}>Cartel</div>
          </div>

          {/* Search */}
          <div style={{ flex: 1, display: "flex", border: `2px solid ${C.border}`, borderRadius: 50, overflow: "hidden", minWidth: 0 }}>
            <input placeholder="Search products…" style={{ flex: 1, border: "none", outline: "none", padding: "9px 16px", fontSize: 13, fontFamily: "inherit", background: "transparent", minWidth: 0 }} />
            <button style={{ background: C.primary, color: "#fff", border: "none", padding: "9px 16px", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>🔍</button>
          </div>

          {/* Account */}
          <button onClick={handleAccountClick} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0, padding: "4px 6px", borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = "#F5F3EF"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: account ? C.primary : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: account ? "#fff" : C.muted, fontWeight: 700, overflow: "hidden", border: account ? `2px solid ${C.accent}` : "none" }}>
              {account?.avatar ? <img src={account.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : account ? account.name.charAt(0).toUpperCase() : "👤"}
            </div>
            <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{account ? account.name.split(" ")[0].substring(0, 8) : "Account"}</span>
          </button>

          {/* Admin */}
          <button onClick={() => adminAuthed ? setView("admin") : setShowAdminLogin(true)} style={{ background: C.dark, color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>⚙️</button>

          {/* Cart */}
          <button onClick={() => setCartOpen(true)} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 50, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
            🛒 <span style={{ background: C.accent, color: C.dark, borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
          </button>
        </div>

        {page !== "shop" && <div style={{ borderTop: `1px solid ${C.border}`, overflowX: "auto" }}><div style={{ display: "flex", maxWidth: 1200, margin: "0 auto", padding: "0 18px" }}>{[["shop", "🏠 Shop"], ["about", "🏕️ About"], ["track", "📦 Track"], ["returns", "🔄 Returns"], ["faq", "❓ FAQ"]].map(([k, l]) => <div key={k} onClick={() => nav(k)} style={{ padding: "9px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", color: page === k ? C.primary : C.muted, borderBottom: page === k ? `3px solid ${C.primary}` : "3px solid transparent" }}>{l}</div>)}</div></div>}
      </div>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} activeCat={activeCat}
        onCat={cat => { setActiveCat(cat); setPage("shop"); }} onNav={nav}
        account={account} onAccountOpen={() => setShowAuth(true)} onLogout={handleLogout} />

      <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: C.bg, minHeight: "100vh", color: C.dark }}>
        {pageContent()}
        {/* FOOTER */}
        <div style={{ background: C.dark, color: "#fff", padding: "32px 18px 16px", marginTop: 36 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 28, marginBottom: 22 }}>
              <div><div style={{ fontSize: 18, fontWeight: 900, color: C.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Outback Cartel</div><p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 12 }}>Your trusted dropshipping store. Electronics, beauty tech, gaming, travel, smart bags & more.</p><a href={`https://wa.me/${CONFIG.WHATSAPP}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700 }}>💬 {CONFIG.WHATSAPP_DISPLAY}</a><div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 5 }}>📵 Text only</div></div>
              <div><h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,.8)" }}>Quick Links</h4>{[["about", "About"], ["track", "Track Order"], ["returns", "Returns"], ["faq", "FAQ"]].map(([k, l]) => <div key={k} onClick={() => nav(k)} style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 7, cursor: "pointer" }} onMouseEnter={e => e.target.style.color = "rgba(255,255,255,.8)"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.4)"}>{l}</div>)}</div>
              <div><h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,.8)" }}>Payments</h4>{[["bKash", "#E2136E"], ["Nagad", "#F05A28"], ["Rocket", "#8B2FC9"], ["Cards", "#003366"], ["COD", "#2E7D52"]].map(([l, bg]) => <span key={l} style={{ display: "inline-block", background: bg, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 5, margin: "0 3px 5px 0" }}>{l}</span>)}<div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.3)" }}>SSLCommerz 🔒</div></div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>© 2026 Outback Cartel.</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>Made with ❤️ in Bangladesh 🇧🇩</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showAdminLogin && <AdminLogin onLogin={() => { setAdminAuthed(true); setShowAdminLogin(false); setView("admin"); }} onCancel={() => setShowAdminLogin(false)} />}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)}
        onSuccess={acc => { setAccount(acc); setShowAuth(false); toast_(`🎉 Welcome, ${acc.name}!`); setTimeout(() => setShowDash(true), 400); }} />

      {showDash && account && <UserDashboard account={account} onClose={() => setShowDash(false)}
        onUpdate={acc => setAccount(acc)} onLogout={handleLogout} />}

      <CartSidebar cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onQty={changeQty} onRemove={removeItem}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />

      <CheckoutModal cart={cart} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} account={account}
        onSuccess={id => { setCheckoutOpen(false); setOrderId(id); setSuccessOpen(true); }} />

      {successOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 360, padding: "36px 28px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.28)" }}>
          <div style={{ fontSize: 64, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 7 }}>Order Placed!</h2>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>ধন্যবাদ! We'll confirm your delivery soon.</p>
          <div style={{ background: C.bg, borderRadius: 9, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: C.muted }}>Order ID: <strong style={{ color: C.dark, fontSize: 14 }}>{orderId}</strong></div>
          <a href={`https://wa.me/${CONFIG.WHATSAPP}?text=Hi!%20Order:%20${orderId}`} target="_blank" rel="noreferrer" style={{ display: "block", background: "#25D366", color: "#fff", textDecoration: "none", padding: "11px", borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 9 }}>💬 Confirm on WhatsApp</a>
          <Btn onClick={() => { setSuccessOpen(false); setCart([]); }} style={{ width: "100%", borderRadius: 10, padding: "11px", fontSize: 13 }}>Continue Shopping</Btn>
        </div>
      </div>}

      {/* AI CHATBOT */}
      <AIChatbot products={products} />

      {toast && <Toast msg={toast} />}
    </>
  );
}
