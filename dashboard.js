import { auth, db, storage } from "../js/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ref, get, set, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
}[char]));
const money = (value) => Number(value || 0).toLocaleString("en-BD");
let productCache = {};
let listenersStarted = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  try {
    const adminSnapshot = await get(ref(db, `admins/${user.uid}`));
    if (adminSnapshot.val() !== true) {
      $("#notice").textContent = "এই অ্যাকাউন্টটি Admin হিসেবে অনুমোদিত নয়। Firebase Realtime Database-এর admins নোডে আপনার UID-এর মান true দিন।";
      $("#productForm").hidden = true;
      $("#settingsForm").hidden = true;
      $("#logout").hidden = false;
      return;
    }
    $("#notice").textContent = "Admin হিসেবে লগইন করেছেন।";
    if (!listenersStarted) {
      listenersStarted = true;
      loadDashboard();
      loadSettings();
    }
  } catch (error) {
    $("#notice").textContent = "Admin অনুমতি যাচাই করা যায়নি: " + error.message;
  }
});

$("#logout").addEventListener("click", async () => {
  await signOut(auth);
  location.href = "login.html";
});

async function uploadImage(file, folder) {
  if (!file || !file.size) return "";
  if (!file.type.startsWith("image/")) throw new Error("শুধু ছবির ফাইল আপলোড করুন।");
  if (file.size > 5 * 1024 * 1024) throw new Error("ছবির আকার ৫ MB-এর কম হতে হবে।");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileRef = storageRef(storage, `${folder}/${Date.now()}-${safeName}`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}

$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const id = data.get("id") || push(ref(db, "products")).key;
  const saveButton = form.querySelector("button[type=submit]");
  saveButton.disabled = true;
  try {
    let image = await uploadImage(data.get("image"), "product-images");
    if (!image) image = productCache[id]?.image || "";
    const previous = productCache[id] || {};
    await set(ref(db, `products/${id}`), {
      ...previous,
      name: String(data.get("name") || "").trim(),
      price: Number(data.get("price")),
      description: String(data.get("description") || "").trim(),
      image,
      active: previous.active !== false,
      updatedAt: Date.now()
    });
    form.reset();
    $("#productForm [name=id]").value = "";
    alert("পণ্য সংরক্ষণ হয়েছে।");
  } catch (error) {
    alert("পণ্য সংরক্ষণ হয়নি: " + error.message);
  } finally {
    saveButton.disabled = false;
  }
});

$("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const saveButton = form.querySelector("button[type=submit]");
  saveButton.disabled = true;
  try {
    let logo = await uploadImage(data.get("logo"), "branding");
    if (!logo) logo = (await get(ref(db, "settings/logo"))).val() || "";
    await update(ref(db, "settings"), {
      storeName: "JSF FASHION",
      bkash: String(data.get("bkash") || "").trim(),
      nagad: String(data.get("nagad") || "").trim(),
      logo
    });
    alert("দোকানের সেটিংস সংরক্ষণ হয়েছে।");
    form.reset();
    $("#storeNameSetting").value = "JSF FASHION";
    $("#settingsForm [name=bkash]").value = String(data.get("bkash") || "");
    $("#settingsForm [name=nagad]").value = String(data.get("nagad") || "");
  } catch (error) {
    alert("সেটিংস সংরক্ষণ হয়নি: " + error.message);
  } finally {
    saveButton.disabled = false;
  }
});

function loadSettings() {
  onValue(ref(db, "settings"), (snapshot) => {
    const settings = snapshot.val() || {};
    $("#storeNameSetting").value = "JSF FASHION";
    $("#settingsForm [name=bkash]").value = settings.bkash || "";
    $("#settingsForm [name=nagad]").value = settings.nagad || "";
  });
}

function loadDashboard() {
  onValue(ref(db, "products"), (snapshot) => {
    productCache = snapshot.val() || {};
    const entries = Object.entries(productCache);
    $("#products").innerHTML = entries.length ? entries.map(([id, product]) => `
      <article class="admin-product">
        <div><b>${escapeHTML(product.name)}</b><div class="muted">৳${money(product.price)}</div></div>
        <div class="admin-actions"><button type="button" data-edit="${escapeHTML(id)}">Edit</button><button type="button" class="danger" data-delete="${escapeHTML(id)}">Delete</button></div>
      </article>`).join("") : "কোনো পণ্য নেই।";
    document.querySelectorAll("#products [data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.edit;
        const product = productCache[id];
        for (const key of ["id", "name", "price", "description"]) {
          $("#productForm").elements[key].value = key === "id" ? id : (product[key] ?? "");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
    document.querySelectorAll("#products [data-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (confirm("এই পণ্যটি মুছে ফেলবেন?")) {
          try { await remove(ref(db, `products/${button.dataset.delete}`)); }
          catch (error) { alert("মুছতে সমস্যা হয়েছে: " + error.message); }
        }
      });
    });
  }, (error) => { $("#products").textContent = "পণ্য লোড হয়নি: " + error.message; });

  onValue(ref(db, "orders"), (snapshot) => {
    const orders = Object.entries(snapshot.val() || {}).reverse();
    $("#orders").innerHTML = orders.length ? orders.map(([id, order]) => `
      <article class="admin-order">
        <div><b>${escapeHTML(order.customer?.name || "Customer")}</b> — ${escapeHTML(order.customer?.phone || "")}
        <div>${escapeHTML(order.customer?.address || "")}</div>
        <div>৳${money(order.total)} · ${escapeHTML(order.payment || "")}</div>
        <small>Order: ${escapeHTML(id)}</small></div>
        <label>স্ট্যাটাস<select data-status="${escapeHTML(id)}">
          ${["pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select></label>
      </article>`).join("") : "কোনো অর্ডার নেই।";
    document.querySelectorAll("#orders [data-status]").forEach((select) => {
      select.addEventListener("change", async () => {
        try { await update(ref(db, `orders/${select.dataset.status}`), { status: select.value }); }
        catch (error) { alert("অর্ডারের স্ট্যাটাস বদলানো যায়নি: " + error.message); }
      });
    });
  }, (error) => { $("#orders").textContent = "অর্ডার লোড হয়নি: " + error.message; });
}
