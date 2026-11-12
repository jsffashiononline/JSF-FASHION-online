
import { auth, db } from "./admin-firebase.js?v=1";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
  ref,
  onValue,
  get,
  push,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

/* =================================
   1. ADMIN & CLOUDINARY CONFIG
================================= */

const ADMIN_UIDS = [
  "oqLhQp7pgVUBWFAwLFfjgIg3v2r1",
  "iGYHyUYQKEbICfzY7VDt9HMWcEi1"
];

const CLOUDINARY_CLOUD_NAME = "phvmgyj9";
const CLOUDINARY_UPLOAD_PRESET = "jsf_fashion_upload";

/* =================================
   2. HTML ELEMENTS
================================= */

const $ = (id) => document.getElementById(id);

const loginSection = $("login-section");
const dashboard = $("dashboard");
const loginForm = $("login-form");
const loginMessage = $("login-message");
const loginBtn = $("login-btn");
const logoutBtn = $("logout-btn");

const productForm = $("product-form");
const productMessage = $("product-message");
const productList = $("admin-products");
const orderList = $("admin-orders");

const settingsForm = $("settings-form");
const settingsMessage = $("settings-message");

/* =================================
   3. HELPER FUNCTIONS
================================= */

function showMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = "message " + type;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function money(value) {
  const amount = Number(value) || 0;
  return "৳" + amount.toLocaleString("en-BD");
}

function isAdmin(user) {
  return Boolean(user && ADMIN_UIDS.includes(user.uid));
}

function firebaseError(error) {
  const messages = {
    "auth/invalid-credential": "Email অথবা Password ভুল।",
    "auth/invalid-email": "সঠিক Email Address দিন।",
    "auth/user-not-found": "এই Email দিয়ে কোনো Account পাওয়া যায়নি।",
    "auth/wrong-password": "Password সঠিক নয়।",
    "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।",
    "auth/network-request-failed": "Internet Connection পরীক্ষা করুন।",
    "auth/invalid-api-key": "Firebase API Key পরীক্ষা করুন।",
    "auth/operation-not-allowed": "Firebase Email/Password Login চালু নেই।"
  };

  return messages[error.code] || error.message ||
    "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।";
}

/* =================================
   4. CLOUDINARY GALLERY UPLOAD
================================= */

const productImageInput = $("product-image");

if (productImageInput) {
  const uploadContainer = document.createElement("div");

  uploadContainer.style.marginTop = "10px";
  uploadContainer.style.display = "flex";
  uploadContainer.style.flexDirection = "column";
  uploadContainer.style.gap = "10px";

  const galleryButton = document.createElement("button");

  galleryButton.type = "button";
  galleryButton.textContent = "📷 CHOOSE PHOTO FROM GALLERY";
  galleryButton.style.padding = "12px";
  galleryButton.style.background = "#dfb957";
  galleryButton.style.color = "#080808";
  galleryButton.style.border = "none";
  galleryButton.style.borderRadius = "6px";
  galleryButton.style.fontWeight = "bold";
  galleryButton.style.cursor = "pointer";

  const galleryInput = document.createElement("input");

  galleryInput.type = "file";
  galleryInput.accept = "image/jpeg,image/png,image/webp";
  galleryInput.hidden = true;

  const uploadStatus = document.createElement("p");
  uploadStatus.style.fontSize = "13px";
  uploadStatus.style.margin = "0";

  uploadContainer.appendChild(galleryButton);
  uploadContainer.appendChild(galleryInput);
  uploadContainer.appendChild(uploadStatus);

  productImageInput.insertAdjacentElement(
    "afterend",
    uploadContainer
  );

  galleryButton.addEventListener("click", () => {
    galleryInput.click();
  });

  galleryInput.addEventListener("change", async () => {
    const file = galleryInput.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      uploadStatus.textContent = "শুধু JPG, PNG অথবা WEBP ছবি দিন।";
      uploadStatus.style.color = "red";
      galleryInput.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      uploadStatus.textContent = "ছবির সাইজ 10 MB-এর কম হতে হবে।";
      uploadStatus.style.color = "red";
      galleryInput.value = "";
      return;
    }

    galleryButton.disabled = true;
    galleryButton.textContent = "UPLOADING PHOTO...";
    uploadStatus.textContent = "Cloudinary-তে ছবি আপলোড হচ্ছে...";
    uploadStatus.style.color = "#dfb957";

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "jsf-fashion-products");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Cloudinary upload failed."
        );
      }

      productImageInput.value = result.secure_url;

      uploadStatus.textContent = "ছবি সফলভাবে আপলোড হয়েছে!";
      uploadStatus.style.color = "green";

    } catch (error) {
      console.error("Cloudinary upload error:", error);

      uploadStatus.textContent =
        "ছবি আপলোড হয়নি: " + error.message;

      uploadStatus.style.color = "red";

    } finally {
      galleryButton.disabled = false;
      galleryButton.textContent = "📷 CHOOSE PHOTO FROM GALLERY";
      galleryInput.value = "";
    }
  });
}

/* =================================
   5. LOGIN SYSTEM
================================= */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    showMessage(loginMessage, "Email এবং Password দিন।", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "LOGGING IN...";
  showMessage(loginMessage, "Login হচ্ছে...");

  try {
    const result = await signInWithEmailAndPassword(
      auth, email, password
    );

    if (!isAdmin(result.user)) {
      await signOut(auth);
      showMessage(
        loginMessage,
        "এই Account Admin হিসেবে অনুমোদিত নয়।",
        "error"
      );
      return;
    }

    loginForm.reset();
    showMessage(loginMessage, "Login successful!", "success");

  } catch (error) {
    console.error("Login error:", error);
    showMessage(loginMessage, firebaseError(error), "error");

  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "LOGIN";
  }
});

/* =================================
   6. AUTHENTICATION CHECK
================================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    $("admin-email").textContent = "";
    return;
  }

  if (!isAdmin(user)) {
    showMessage(
      loginMessage,
      "আপনার Account Admin Access পায়নি।",
      "error"
    );

    await signOut(auth);
    return;
  }

  loginSection.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  $("admin-email").textContent = user.email || "Admin";

  loadProducts();
  loadOrders();
  loadSettings();
});

/* =================================
   7. LOGOUT
================================= */

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(firebaseError(error));
  }
});

/* =================================
   8. PRODUCT MANAGEMENT
================================= */

function loadProducts() {
  const productsRef = ref(db, "products");

  onValue(productsRef, (snapshot) => {
    const products = snapshot.val() || {};
    const entries = Object.entries(products);

    $("total-products").textContent = entries.length;

    if (!entries.length) {
      productList.innerHTML =
        '<p class="muted">No products added yet.</p>';
      return;
    }

    productList.innerHTML = entries.map(([id, product]) => {
      const name = escapeHTML(product.name || "Unnamed Product");
      const price = money(product.price);
      const category = escapeHTML(product.category || "");
      const image = escapeHTML(product.image || "");

      return `
        <article class="data-card product-card">
          <img
            src="${image}"
            alt="${name}"
            loading="lazy"
            onerror="this.style.display='none'"
          >

          <div class="product-info">
            <h3>${name}</h3>
            <p>${price} | ${category}</p>

            <div class="item-actions">
              <button
                class="small-btn edit"
                type="button"
                data-action="edit-product"
                data-id="${escapeHTML(id)}"
              >EDIT</button>

              <button
                class="small-btn delete"
                type="button"
                data-action="delete-product"
                data-id="${escapeHTML(id)}"
              >DELETE</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

  }, (error) => {
    console.error("Products error:", error);
    productList.textContent = "Products load failed: " + error.message;
  });
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("product-id").value.trim();

  const product = {
    name: $("product-name").value.trim(),
    price: Number($("product-price").value),
    category: $("product-category").value.trim(),
    image: $("product-image").value.trim(),
    sizes: $("product-sizes").value.trim(),
    description: $("product-description").value.trim(),
    updatedAt: Date.now()
  };

  if (
    !product.name ||
    !Number.isFinite(product.price) ||
    product.price < 0 ||
    !product.category ||
    !product.image
  ) {
    showMessage(productMessage, "সঠিক Product Information দিন।", "error");
    return;
  }

  const saveButton = $("save-product-btn");
  saveButton.disabled = true;
  showMessage(productMessage, "Saving product...");

  try {
    if (id) {
      await update(ref(db, "products/" + id), product);
    } else {
      const newProductRef = push(ref(db, "products"));
      product.createdAt = Date.now();
      await set(newProductRef, product);
    }

    productForm.reset();
    $("product-id").value = "";

    showMessage(
      productMessage,
      "Product সফলভাবে Save হয়েছে।",
      "success"
    );

  } catch (error) {
    console.error("Product save error:", error);
    showMessage(
      productMessage,
      "Product Save হয়নি: " + firebaseError(error),
      "error"
    );

  } finally {
    saveButton.disabled = false;
  }
});

/* =================================
   9. EDIT AND DELETE PRODUCTS
================================= */

productList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (!id) return;

  if (action === "edit-product") {
    try {
      const snapshot = await get(ref(db, "products/" + id));

      if (!snapshot.exists()) {
        showMessage(productMessage, "Product পাওয়া যায়নি।", "error");
        return;
      }

      const product = snapshot.val();

      $("product-id").value = id;
      $("product-name").value = product.name || "";
      $("product-price").value = product.price ?? "";
      $("product-category").value = product.category || "";
      $("product-image").value = product.image || "";
      $("product-sizes").value = product.sizes || "";
      $("product-description").value = product.description || "";

      $("product-name").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      showMessage(productMessage, "এখন Product Edit করে Save করুন।");

    } catch (error) {
      showMessage(productMessage, firebaseError(error), "error");
    }
  }

  if (action === "delete-product") {
    const confirmed = confirm("আপনি কি এই Product Delete করতে চান?");
    if (!confirmed) return;

    try {
      await remove(ref(db, "products/" + id));

      showMessage(
        productMessage,
        "Product Delete হয়েছে।",
        "success"
      );

    } catch (error) {
      showMessage(
        productMessage,
        "Delete failed: " + firebaseError(error),
        "error"
      );
    }
  }
});

/* =================================
   10. CLEAR PRODUCT FORM
================================= */

$("cancel-edit").addEventListener("click", () => {
  productForm.reset();
  $("product-id").value = "";
  showMessage(productMessage, "Form পরিষ্কার করা হয়েছে।");
});

/* =================================
   11. CUSTOMER ORDERS
================================= */

function loadOrders() {
  const ordersRef = ref(db, "orders");

  onValue(ordersRef, (snapshot) => {
    const orders = snapshot.val() || {};
    const entries = Object.entries(orders);

    let pending = 0;
    let delivered = 0;
    let sales = 0;

    entries.forEach(([id, order]) => {
      const status = String(order.status || "Pending").toLowerCase();

      if (status === "pending") pending++;

      if (status === "delivered") {
        delivered++;
        sales += Number(
          order.total || order.totalAmount || order.amount || 0
        );
      }
    });

    $("total-orders").textContent = entries.length;
    $("pending-orders").textContent = pending;
    $("delivered-orders").textContent = delivered;
    $("total-sales").textContent = money(sales);

    if (!entries.length) {
      orderList.innerHTML =
        '<p class="muted">No customer orders yet.</p>';
      return;
    }

    orderList.innerHTML = entries.map(([id, order]) => {
      const customer = escapeHTML(
        order.customerName || order.name || "Customer"
      );

      const phone = escapeHTML(
        order.phone || order.mobile || "Not provided"
      );

      const address = escapeHTML(order.address || "Not provided");
      const status = String(order.status || "Pending");

      const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
      ];

      const options = allowedStatuses.map((item) => `
        <option
          value="${item}"
          ${item.toLowerCase() === status.toLowerCase() ? "selected" : ""}
        >${item}</option>
      `).join("");

      const itemsText = Array.isArray(order.items)
        ? order.items.map((item) => {
            const itemName = item.name || item.productName || "Product";
            const itemSize = item.size || item.selectedSize || "Not specified";
            const itemQty = item.qty || item.quantity || 1;
            return `${itemName} (Size: ${itemSize}) × ${itemQty}`;
          }).join(" | ")
        : "See order details in database";

      const total = money(
        order.total || order.totalAmount || order.amount || 0
      );

      return `
        <article class="data-card order-card">
          <h3>Order #${escapeHTML(id)}</h3>
          <p>Customer: ${customer}</p>
          <p>Phone: ${phone}</p>
          <p>Address: ${address}</p>
          <p>Items: ${escapeHTML(itemsText)}</p>
          <p>Total: ${total}</p>

          <label for="status-${escapeHTML(id)}">Order Status</label>

          <select
            class="order-status"
            id="status-${escapeHTML(id)}"
            data-order-id="${escapeHTML(id)}"
          >
            ${options}
          </select>
        </article>
      `;
    }).join("");

  }, (error) => {
    console.error("Orders error:", error);
    orderList.textContent = "Orders load failed: " + error.message;
  });
}

/* =================================
   12. UPDATE ORDER STATUS
================================= */

orderList.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-order-id]");
  if (!select) return;

  const id = select.dataset.orderId;
  const status = select.value;

  try {
    await update(ref(db, "orders/" + id), {
      status: status,
      updatedAt: Date.now()
    });

  } catch (error) {
    alert("Order update failed: " + firebaseError(error));
  }
});

/* =================================
   13. STORE SETTINGS
================================= */

function loadSettings() {
  onValue(ref(db, "settings"), (snapshot) => {
    const settings = snapshot.val() || {};

    $("bkash-number").value = settings.bkashNumber || settings.bkash || "";
    $("nagad-number").value = settings.nagadNumber || settings.nagad || "";
    $("store-picture").value = settings.storePicture || "";
    $("whatsapp-admin-1").value = settings.whatsappAdmin1 || "";
    $("whatsapp-admin-2").value = settings.whatsappAdmin2 || "";

  }, (error) => {
    console.error("Settings load error:", error);
    showMessage(settingsMessage, firebaseError(error), "error");
  });

}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const settings = {
    bkashNumber: $("bkash-number").value.trim(),
    nagadNumber: $("nagad-number").value.trim(),
    storePicture: $("store-picture").value.trim(),
    whatsappAdmin1: $("whatsapp-admin-1").value.trim(),
    whatsappAdmin2: $("whatsapp-admin-2").value.trim(),
    updatedAt: Date.now()
  };

  try {
    await update(ref(db, "settings"), settings);

    showMessage(
      settingsMessage,
      "Store Settings ও দুইটি WhatsApp নম্বর সফলভাবে Save হয়েছে।",
      "success"
    );

  } catch (error) {
    console.error("Settings save error:", error);

    showMessage(
      settingsMessage,
      "Settings Save failed: " + firebaseError(error),
      "error"
    );
  }
});
