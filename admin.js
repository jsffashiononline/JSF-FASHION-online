import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = id => document.getElementById(id);
const money = n => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
let productData = {};
let orderData = {};
let settingsData = {};
let unsubscribers = [];

function message(id, text, error = false) { const el = $(id); el.textContent = text; el.classList.toggle("error", error); }
function toast(text) { const el = $("toast"); el.textContent = text; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2500); }
function stopListeners() { unsubscribers.forEach(fn => fn()); unsubscribers = []; }
function showLogin(text = "") {
  stopListeners(); $("dashboard-section").hidden = true; $("login-section").hidden = false; $("logout-button").hidden = true;
  if (text) message("login-message", text, true);
}
function showDashboard(user) {
  $("login-section").hidden = true; $("dashboard-section").hidden = false; $("logout-button").hidden = false;
  $("admin-identity").textContent = `Signed in as ${user.email || user.uid}`;
  startListeners();
}
onAuthStateChanged(auth, user => {
  if (!user) { showLogin(); return; }
  if (user.uid !== ADMIN_UID) {
    signOut(auth).catch(() => {}); showLogin("এই Firebase account-এর admin permission নেই।"); return;
  }
  showDashboard(user);
});

$("login-form").addEventListener("submit", async e => {
  e.preventDefault(); const button = $("login-button"); button.disabled = true; button.textContent = "Signing in...";
  const fd = new FormData(e.currentTarget);
  try {
    const credential = await signInWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
    if (credential.user.uid !== ADMIN_UID) { await signOut(auth); message("login-message", "এই account অনুমোদিত admin নয়।", true); }
  } catch (err) { message("login-message", friendlyAuthError(err), true); }
  finally { button.disabled = false; button.textContent = "Login securely"; }
});
function friendlyAuthError(err) {
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(err.code)) return "Email অথবা password সঠিক নয়।";
  if (err.code === "auth/too-many-requests") return "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
  return err.message || "Login করা যায়নি।";
}
$("logout-button").addEventListener("click", () => signOut(auth));

function startListeners() {
  stopListeners();
  unsubscribers.push(onValue(ref(db, "products"), snap => { productData = snap.val() || {}; renderProducts(); updateStats(); }, err => toast(err.message)));
  unsubscribers.push(onValue(ref(db, "orders"), snap => { orderData = snap.val() || {}; renderOrders(); updateStats(); }, err => toast(err.message)));
  unsubscribers.push(onValue(ref(db, "settings"), snap => { settingsData = snap.val() || {}; fillSettings(); }, err => toast(err.message)));
}
function updateStats() {
  const products = Object.values(productData);
  const orders = Object.values(orderData);
  $("total-products").textContent = products.length;
  $("total-orders").textContent = orders.length;
  $("pending-orders").textContent = orders.filter(o => o.status === "Pending").length;
}
function renderProducts() {
  const rows = Object.entries(productData);
  $("admin-products-body").innerHTML = rows.length ? rows.map(([id, p]) => `<tr>
    <td><div class="table-product">${p.image ? `<img src="${esc(p.image)}" alt="" onerror="this.style.display='none'">` : ""}<strong>${esc(p.name || "Untitled")}</strong></div></td>
    <td>${esc(p.category || "—")}</td><td>${money(p.price)}</td><td>${p.available === false ? "Unavailable" : "Available"}</td>
    <td class="action-cell"><button class="mini-button" data-edit="${id}">Edit</button><button class="mini-button danger" data-delete-product="${id}">Delete</button></td></tr>`).join("") : `<tr><td colspan="5">কোনো পণ্য নেই।</td></tr>`;
  $("admin-products-body").querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editProduct(b.dataset.edit)));
  $("admin-products-body").querySelectorAll("[data-delete-product]").forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.deleteProduct)));
}
function editProduct(id) {
  const p = productData[id]; if (!p) return;
  const f = $("product-form"); f.hidden = false; f.elements.productId.value = id;
  f.elements.name.value = p.name || ""; f.elements.price.value = p.price ?? "";
  f.elements.category.value = p.category || ""; f.elements.sizes.value = (p.sizes || []).join(", ");
  f.elements.image.value = p.image || ""; f.elements.description.value = p.description || "";
  f.elements.featured.checked = !!p.featured; f.elements.available.checked = p.available !== false;
  $("product-form-title").textContent = "Edit product"; f.scrollIntoView({ behavior: "smooth", block: "center" });
}
async function deleteProduct(id) {
  if (!confirm("এই পণ্যটি স্থায়ীভাবে মুছে ফেলবেন?")) return;
  try { await remove(ref(db, `products/${id}`)); toast("পণ্য মুছে ফেলা হয়েছে।"); }
  catch (err) { toast(`Delete failed: ${err.message}`); }
}
$("new-product-button").addEventListener("click", () => {
  $("product-form").reset(); $("product-form").hidden = false; $("product-form").elements.productId.value = "";
  $("product-form").elements.available.checked = true; $("product-form-title").textContent = "Add new product";
  $("product-form").scrollIntoView({ behavior: "smooth", block: "center" });
});
$("cancel-product-button").addEventListener("click", () => { $("product-form").hidden = true; });
$("product-form").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.currentTarget; const fd = new FormData(f);
  const price = Number(fd.get("price")); const image = String(fd.get("image")).trim();
  try { const u = new URL(image); if (!["http:", "https:"].includes(u.protocol)) throw new Error(); }
  catch { message("product-message", "সঠিক http/https image URL দিন।", true); return; }
  if (!Number.isFinite(price) || price < 0) { message("product-message", "সঠিক মূল্য লিখুন।", true); return; }
  const id = fd.get("productId");
  const data = {
    name: String(fd.get("name")).trim(), price, category: String(fd.get("category")).trim(),
    sizes: String(fd.get("sizes") || "").split(",").map(x => x.trim()).filter(Boolean),
    image, description: String(fd.get("description") || "").trim(),
    featured: f.elements.featured.checked, available: f.elements.available.checked, updatedAt: Date.now()
  };
  const button = $("save-product-button"); button.disabled = true;
  try {
    if (id) await update(ref(db, `products/${id}`), data);
    else { data.createdAt = Date.now(); await set(push(ref(db, "products")), data); }
    f.reset(); f.hidden = true; message("product-message", "পণ্য সংরক্ষণ হয়েছে।"); toast("Product saved.");
  } catch (err) { message("product-message", `সংরক্ষণ করা যায়নি: ${err.message}`, true); }
  finally { button.disabled = false; }
});

const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
function renderOrders() {
  const rows = Object.entries(orderData).sort((a,b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0));
  $("admin-orders-body").innerHTML = rows.length ? rows.map(([id, o]) => {
    const date = o.createdAt ? new Date(o.createdAt).toLocaleString("en-BD") : "—";
    const items = (o.items || []).map(x => `${esc(x.name)} × ${Number(x.quantity || 1)}${x.size ? ` (${esc(x.size)})` : ""}`).join("<br>");
    return `<tr><td><strong>${esc(id.slice(-7).toUpperCase())}</strong><small>${esc(date)}</small><small>${items}</small></td>
      <td>${esc(o.customerName)}<small>${esc(o.phone)}</small><small>${esc(o.paymentMethod || "")}</small></td>
      <td class="address-cell">${esc(o.address)}</td><td><strong>${money(o.total)}</strong></td>
      <td><select class="status-select" data-status="${id}">${statuses.map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <button class="mini-button danger" data-delete-order="${id}">Delete</button></td></tr>`;
  }).join("") : `<tr><td colspan="5">এখনো কোনো অর্ডার আসেনি।</td></tr>`;
  $("admin-orders-body").querySelectorAll("[data-status]").forEach(s => s.addEventListener("change", async () => {
    try { await update(ref(db, `orders/${s.dataset.status}`), { status: s.value, statusUpdatedAt: Date.now() }); toast("Order status updated."); }
    catch (err) { toast(`Update failed: ${err.message}`); }
  }));
  $("admin-orders-body").querySelectorAll("[data-delete-order]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("এই অর্ডারটি মুছে ফেলবেন?")) return;
    try { await remove(ref(db, `orders/${b.dataset.deleteOrder}`)); toast("Order deleted."); }
    catch (err) { toast(`Delete failed: ${err.message}`); }
  }));
}
function fillSettings() {
  const f = $("settings-form");
  f.elements.bkashNumber.value = settingsData.bkashNumber || "";
  f.elements.nagadNumber.value = settingsData.nagadNumber || "";
  f.elements.profileImageUrl.value = settingsData.profileImageUrl || "";
  $("profile-preview").src = settingsData.profileImageUrl || "https://placehold.co/100x100/121212/dfb957?text=JSF";
}
$("settings-form").elements.profileImageUrl.addEventListener("input", e => {
  const value = e.target.value;
  try { const u = new URL(value); if (["http:", "https:"].includes(u.protocol)) $("profile-preview").src = u.href; } catch {}
});
$("settings-form").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.currentTarget;
  const data = { bkashNumber: f.elements.bkashNumber.value.trim(), nagadNumber: f.elements.nagadNumber.value.trim(), profileImageUrl: f.elements.profileImageUrl.value.trim(), updatedAt: Date.now() };
  if (data.profileImageUrl) {
    try { const u = new URL(data.profileImageUrl); if (!["http:", "https:"].includes(u.protocol)) throw new Error(); }
    catch { message("settings-message", "সঠিক profile image URL দিন।", true); return; }
  }
  const button = $("save-settings-button"); button.disabled = true;
  try { await update(ref(db, "settings"), data); message("settings-message", "সেটিংস Firebase-এ সংরক্ষণ হয়েছে।"); toast("Settings saved."); }
  catch (err) { message("settings-message", `সেটিংস সংরক্ষণ করা যায়নি: ${err.message}`, true); }
  finally { button.disabled = false; }
});

document.querySelectorAll(".admin-tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".admin-tab").forEach(x => x.classList.toggle("active", x === btn));
  ["products-panel", "orders-panel", "settings-panel"].forEach(id => $(id).hidden = id !== btn.dataset.tab);
}));
