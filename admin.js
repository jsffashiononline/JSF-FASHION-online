
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
  ref,
  onValue,
  get,
  set,
  push,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

// TWO AUTHORIZED ADMINS
const ADMIN_UIDS = [
  "oqLhQp7pgVUBWFAwLFfjgIg3v2r1",
  "iGYHyUYQKEbICfzY7VDt9HMWcEi1"
];

const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");
const loginMessage = document.getElementById("login-message");

let productCache = {};
let orderCache = {};

function isAdmin(user) {
  return user && ADMIN_UIDS.includes(user.uid);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[c]);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboard.classList.add("hidden");
  document.getElementById("logout-btn").classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboard.classList.remove("hidden");
  document.getElementById("logout-btn").classList.remove("hidden");
  loadAdminData();
}

document.getElementById("login-form").addEventListener("submit", async e => {
  e.preventDefault();

  loginMessage.textContent = "Signing in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    if (!isAdmin(result.user)) {
      await signOut(auth);
      loginMessage.textContent = "Access denied. Not an authorized admin.";
    }
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth);
});

onAuthStateChanged(auth, user => {
  if (!user) {
    showLogin();
    return;
  }

  if (!isAdmin(user)) {
    signOut(auth);
    loginMessage.textContent = "Access denied.";
    return;
  }

  showDashboard();
});

function loadAdminData() {
  onValue(ref(db, "products"), snapshot => {
    productCache = snapshot.val() || {};
    renderAdminProducts();
    updateStats();
  });

  onValue(ref(db, "orders"), snapshot => {
    orderCache = snapshot.val() || {};
    renderAdminOrders();
    updateStats();
  });

  get(ref(db, "settings")).then(snapshot => {
    const s = snapshot.val() || {};

    document.getElementById("bkash-number").value = s.bkash || "";
    document.getElementById("nagad-number").value = s.nagad || "";
    document.getElementById("store-picture").value = s.profileImage || "";
  }).catch(error => {
    console.error("Settings error:", error);
  });
}

function updateStats() {
  const products = Object.values(productCache);
  const orders = Object.values(orderCache);

  document.getElementById("total-products").textContent = products.length;
  document.getElementById("total-orders").textContent = orders.length;

  document.getElementById("pending-orders").textContent =
    orders.filter(o => o.status === "Pending").length;

  document.getElementById("delivered-orders").textContent =
    orders.filter(o => o.status === "Delivered").length;

  const sales = orders
    .filter(o => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  document.getElementById("total-sales").textContent =
    "৳" + formatMoney(sales);
}

function renderAdminProducts() {
  const container = document.getElementById("admin-products");
  const entries = Object.entries(productCache);

  if (!entries.length) {
    container.innerHTML = "<p>No products added yet.</p>";
    return;
  }

  container.innerHTML = entries.map(([id, p]) => `
    <div class="admin-item">
      <h3>${esc(p.name)}</h3>
      <p>Price: ৳${formatMoney(p.price)} | ${esc(p.category)}</p>
      <img src="${esc(p.image || "")}" alt="Product image"
           onerror="this.style.display='none'">
      <div>
        <button class="secondary" onclick="editProduct('${esc(id)}')">EDIT</button>
        <button class="danger" onclick="deleteProduct('${esc(id)}')">DELETE</button>
      </div>
    </div>
  `).join("");
}

document.getElementById("product-form").addEventListener("submit", async e => {
  e.preventDefault();

  const id = document.getElementById("product-id").value;

  const product = {
    name: document.getElementById("product-name").value.trim(),
    price: Number(document.getElementById("product-price").value),
    category: document.getElementById("product-category").value.trim(),
    image: document.getElementById("product-image").value.trim(),
    sizes: document.getElementById("product-sizes").value
      .split(",").map(s => s.trim()).filter(Boolean),
    description: document.getElementById("product-description").value.trim()
  };

  if (!product.name || !product.category || !product.image ||
      !Number.isFinite(product.price) || product.price < 0) {
    alert("Please enter valid product details.");
    return;
  }

  try {
    if (id) {
      await update(ref(db, "products/" + id), product);
    } else {
      await push(ref(db, "products"), product);
    }

    e.currentTarget.reset();
    document.getElementById("product-id").value = "";
    alert("Product saved successfully.");
  } catch (error) {
    alert("Could not save product: " + error.message);
  }
});

function editProduct(id) {
  const p = productCache[id];
  if (!p) return;

  document.getElementById("product-id").value = id;
  document.getElementById("product-name").value = p.name || "";
  document.getElementById("product-price").value = p.price || "";
  document.getElementById("product-category").value = p.category || "";
  document.getElementById("product-image").value = p.image || "";
  document.getElementById("product-sizes").value = (p.sizes || []).join(",");
  document.getElementById("product-description").value = p.description || "";

  document.getElementById("product-form").scrollIntoView({ behavior: "smooth" });
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await remove(ref(db, "products/" + id));
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
});

function renderAdminOrders() {
  const container = document.getElementById("admin-orders");
  const entries = Object.entries(orderCache).reverse();

  if (!entries.length) {
    container.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  const statuses = [
    "Pending", "Confirmed", "Processing",
    "Shipped", "Delivered", "Cancelled"
  ];

  container.innerHTML = entries.map(([id, o]) => `
    <div class="admin-item">
      <h3>Order #${esc(id)}</h3>
      <p>Customer: ${esc(o.customerName)}</p>
      <p>Phone: ${esc(o.phone)}</p>
      <p>Address: ${esc(o.address)}</p>
      <p>Payment: ${esc(o.paymentMethod)}</p>
      <p>Total: ৳${formatMoney(o.total)}</p>
      <p>Items: ${(o.items || []).map(i =>
        esc(i.name) + " × " + Number(i.qty || 1) + " (" + esc(i.size) + ")"
      ).join(", ")}</p>
      <label>Order Status</label>
      <select onchange="updateOrderStatus('${esc(id)}',this.value)">
        ${statuses.map(s =>
          `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`
        ).join("")}
      </select>
      <button class="danger" onclick="deleteOrder('${esc(id)}')">DELETE ORDER</button>
    </div>
  `).join("");
}

async function updateOrderStatus(id, status) {
  const allowed = [
    "Pending", "Confirmed", "Processing",
    "Shipped", "Delivered", "Cancelled"
  ];

  if (!allowed.includes(status)) return;

  try {
    await set(ref(db, "orders/" + id + "/status"), status);
  } catch (error) {
    alert("Status update failed: " + error.message);
  }
}

async function deleteOrder(id) {
  if (!confirm("Permanently delete this order?")) return;

  try {
    await remove(ref(db, "orders/" + id));
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById("settings-form").addEventListener("submit", async e => {
  e.preventDefault();

  const message = document.getElementById("settings-message");

  const settings = {
    bkash: document.getElementById("bkash-number").value.trim(),
    nagad: document.getElementById("nagad-number").value.trim(),
    profileImage: document.getElementById("store-picture").value.trim()
  };

  try {
    await update(ref(db, "settings"), settings);
    message.textContent = "Store settings saved successfully.";
  } catch (error) {
    message.textContent = "Settings save failed: " + error.message;
  }
});

// Make inline HTML buttons accessible
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
