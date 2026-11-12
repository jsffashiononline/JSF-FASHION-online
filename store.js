import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const $ = (id) => document.getElementById(id);
const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const safeImage = (url) => {
  try { const u = new URL(url); return ["https:", "http:"].includes(u.protocol) ? u.href : ""; } catch { return ""; }
};
let products = {};
let settings = {};
let cart = JSON.parse(sessionStorage.getItem("jsf-cart") || "[]");
let selectedCategory = "all";

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2600);
}
function persistCart() { sessionStorage.setItem("jsf-cart", JSON.stringify(cart)); renderCart(); }
function productList() { return Object.entries(products).map(([id, p]) => ({ id, ...p })).filter(p => p.available !== false); }

onValue(ref(db, "products"), snap => {
  products = snap.val() || {};
  renderCategories(); renderProducts();
  $("store-status").textContent = productList().length ? `${productList().length}টি পণ্য পাওয়া গেছে` : "এখনো কোনো পণ্য যোগ করা হয়নি।";
}, err => { $("store-status").textContent = `পণ্য লোড করা যায়নি: ${err.message}`; });

onValue(ref(db, "settings"), snap => {
  settings = snap.val() || {};
  const profile = safeImage(settings.profileImageUrl || "");
  const profileEl = $("store-profile-image");
  if (profileEl) profileEl.src = profile || "https://placehold.co/64x64/121212/dfb957?text=JSF";
  updatePaymentInfo();
});

function renderCategories() {
  const categories = [...new Set(productList().map(p => p.category).filter(Boolean))].sort();
  $("category-list").innerHTML = `<button class="category-chip ${selectedCategory === "all" ? "active" : ""}" data-category="all">সব পণ্য</button>` +
    categories.map(c => `<button class="category-chip ${selectedCategory === c ? "active" : ""}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
  $("category-list").querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    selectedCategory = btn.dataset.category; renderCategories(); renderProducts();
  }));
}
function renderProducts() {
  const query = $("product-search").value.trim().toLowerCase();
  const list = productList().filter(p => (selectedCategory === "all" || p.category === selectedCategory) &&
    `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase().includes(query));
  $("product-grid").innerHTML = list.length ? list.map(p => {
    const img = safeImage(p.image);
    return `<article class="product-card">
      <button class="product-image-button" data-view="${p.id}" aria-label="View ${escapeHTML(p.name)}">
        ${img ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.style.display='none'">` : `<span class="image-fallback">JSF</span>`}
        ${p.featured ? `<span class="product-tag">FEATURED</span>` : ""}
      </button>
      <div class="product-info"><p class="product-category">${escapeHTML(p.category || "COLLECTION")}</p><h3>${escapeHTML(p.name || "Untitled product")}</h3>
      <div class="product-bottom"><strong>${money(p.price)}</strong><button class="add-button" data-add="${p.id}" aria-label="Add to cart">+</button></div></div>
    </article>`;
  }).join("") : `<div class="empty-state grid-empty">এই ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি।</div>`;
  $("product-grid").querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.add)));
  $("product-grid").querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showProduct(b.dataset.view)));
}
function showProduct(id) {
  const p = products[id]; if (!p) return;
  const img = safeImage(p.image);
  $("product-modal-content").innerHTML = `<div class="product-detail">
    ${img ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}">` : `<div class="image-fallback">JSF</div>`}
    <div><p class="eyebrow">${escapeHTML(p.category || "JSF COLLECTION")}</p><h2 id="modal-product-name">${escapeHTML(p.name)}</h2><strong class="detail-price">${money(p.price)}</strong>
    <p>${escapeHTML(p.description || "JSF FASHION premium collection.")}</p>
    <label>সাইজ<select id="detail-size"><option value="">সাইজ নির্বাচন করুন</option>${(p.sizes || []).map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("")}</select></label>
    <button class="gold-button full-width" id="detail-add">কার্টে যোগ করুন</button></div></div>`;
  $("detail-add").addEventListener("click", () => {
    const size = $("detail-size").value;
    if ((p.sizes || []).length && !size) { toast("অনুগ্রহ করে সাইজ নির্বাচন করুন।"); return; }
    addToCart(id, size); closeModal("product-modal");
  });
  openModal("product-modal");
}
function addToCart(id, size = "") {
  const p = products[id]; if (!p || p.available === false) return;
  const key = `${id}::${size}`;
  const existing = cart.find(x => x.key === key);
  if (existing) existing.quantity += 1; else cart.push({ key, id, size, quantity: 1 });
  persistCart(); toast("পণ্যটি কার্টে যোগ হয়েছে।");
}
function cartLines() {
  return cart.map(item => ({ ...item, product: products[item.id] })).filter(x => x.product && x.product.available !== false);
}
function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((n, x) => n + x.quantity, 0);
  const total = lines.reduce((n, x) => n + Number(x.product.price || 0) * x.quantity, 0);
  $("cart-count").textContent = count; $("cart-subtotal").textContent = money(total);
  $("checkout-total").textContent = money(total);
  $("cart-items").innerHTML = lines.length ? lines.map(x => `<div class="cart-line">
    <div><strong>${escapeHTML(x.product.name)}</strong><small>${x.size ? `Size: ${escapeHTML(x.size)} · ` : ""}${money(x.product.price)}</small>
      <div class="quantity-control"><button data-qty="${x.key}" data-delta="-1">−</button><span>${x.quantity}</span><button data-qty="${x.key}" data-delta="1">+</button></div></div>
    <strong>${money(Number(x.product.price || 0) * x.quantity)}</strong><button class="remove-item" data-remove="${x.key}" aria-label="Remove">×</button></div>`).join("") : `<p class="empty-state">আপনার কার্ট খালি।</p>`;
  $("cart-items").querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => {
    const line = cart.find(x => x.key === b.dataset.qty); if (!line) return;
    line.quantity += Number(b.dataset.delta); if (line.quantity <= 0) cart = cart.filter(x => x !== line); persistCart();
  }));
  $("cart-items").querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => { cart = cart.filter(x => x.key !== b.dataset.remove); persistCart(); }));
}
function openCart() { $("cart-drawer").classList.add("open"); $("drawer-backdrop").classList.add("show"); $("cart-drawer").setAttribute("aria-hidden", "false"); }
function closeCart() { $("cart-drawer").classList.remove("open"); $("drawer-backdrop").classList.remove("show"); $("cart-drawer").setAttribute("aria-hidden", "true"); }
function openModal(id) { $(id).classList.add("show"); document.body.classList.add("no-scroll"); }
function closeModal(id) { $(id).classList.remove("show"); document.body.classList.remove("no-scroll"); }
function updatePaymentInfo() {
  const method = $("payment-method").value;
  const number = method === "bKash" ? settings.bkashNumber : method === "Nagad" ? settings.nagadNumber : "";
  $("payment-info").hidden = !number;
  $("payment-info").textContent = number ? `${method} নম্বর: ${number} — পেমেন্ট সম্পন্ন করে Transaction ID দিন।` : "";
  $("transaction-wrap").hidden = method === "Cash on Delivery";
}
$("product-search").addEventListener("input", renderProducts);
$("search-toggle").addEventListener("click", () => { $("search-wrap").classList.toggle("search-visible"); $("product-search").focus(); document.querySelector("#collections").scrollIntoView({ behavior: "smooth" }); });
$("cart-open").addEventListener("click", openCart);
$("cart-close").addEventListener("click", closeCart);
$("drawer-backdrop").addEventListener("click", closeCart);
$("checkout-open").addEventListener("click", () => {
  if (!cartLines().length) { toast("চেকআউটের আগে কার্টে পণ্য যোগ করুন।"); return; }
  closeCart(); openModal("checkout-modal"); updatePaymentInfo();
});
$("payment-method").addEventListener("change", updatePaymentInfo);
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(bg => bg.addEventListener("click", e => { if (e.target === bg) closeModal(bg.id); }));
$("menu-toggle").addEventListener("click", () => document.querySelector(".desktop-nav").classList.toggle("nav-open"));
$("year").textContent = new Date().getFullYear();

$("checkout-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.reportValidity()) return;
  const lines = cartLines();
  if (!lines.length) { $("checkout-message").textContent = "কার্টে কোনো পণ্য নেই।"; return; }
  const fd = new FormData(form);
  const total = lines.reduce((n, x) => n + Number(x.product.price || 0) * x.quantity, 0);
  const order = {
    customerName: String(fd.get("customerName")).trim(),
    phone: String(fd.get("phone")).trim(),
    address: String(fd.get("address")).trim(),
    paymentMethod: String(fd.get("paymentMethod")),
    transactionId: String(fd.get("transactionId") || "").trim(),
    items: lines.map(x => ({ productId: x.id, name: x.product.name || "", price: Number(x.product.price || 0), size: x.size || "", quantity: x.quantity })),
    total, status: "Pending", createdAt: Date.now()
  };
  const button = $("place-order"); button.disabled = true; button.textContent = "অর্ডার পাঠানো হচ্ছে...";
  $("checkout-message").textContent = "";
  try {
    const orderRef = push(ref(db, "orders"));
    await set(orderRef, order);
    cart = []; persistCart(); form.reset(); updatePaymentInfo();
    $("checkout-message").textContent = `অর্ডার সফল হয়েছে! আপনার Order ID: ${orderRef.key}`;
    toast("আপনার অর্ডার গ্রহণ করা হয়েছে।");
  } catch (err) {
    $("checkout-message").textContent = `অর্ডার পাঠানো যায়নি: ${err.message}`;
  } finally { button.disabled = false; button.textContent = "অর্ডার কনফার্ম করুন"; }
});
renderCart();
