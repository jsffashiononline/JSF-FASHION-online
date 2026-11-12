
const db = window.db;

const productList = document.getElementById("product-list");

if (!db || typeof db.ref !== "function") {
  if (productList) {
    productList.textContent =
      "Firebase connection error: database is not initialized. Please refresh the page.";
  }
  throw new Error("Firebase database is not initialized. Check firebase.js and SDK loading order.");
}
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const cartCount = document.getElementById("cart-count");
const searchInput = document.getElementById("product-search");
const paymentInfo = document.getElementById("payment-info");

let products = [];
let settings = {};

let cart = [];
let directOrderItems = null;

try {
  cart = JSON.parse(localStorage.getItem("jsf_cart") || "[]");
  if (!Array.isArray(cart)) cart = [];
} catch (error) {
  cart = [];
}

const $ = id => document.getElementById(id);

if ($("year")) {
  $("year").textContent = new Date().getFullYear();
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

// Product size support
function getSizes(product) {
  if (Array.isArray(product.sizes) && product.sizes.length) {
    return product.sizes;
  }

  if (typeof product.sizes === "string" && product.sizes.trim()) {
    return product.sizes.split(",").map(s => s.trim()).filter(Boolean);
  }

  return ["Free Size"];
}

// Save cart
function saveCart() {
  localStorage.setItem("jsf_cart", JSON.stringify(cart));
  renderCart();
}

// Render products
function renderProducts(list) {
  if (!productList) return;

  if (!list.length) {
    productList.innerHTML =
      '<p class="muted">No products found.</p>';
    return;
  }

  productList.innerHTML = list.map(p => {
    const sizes = getSizes(p);

    return `
      <article class="product-card">

        <img
          src="${safeText(p.image || "")}"
          alt="${safeText(p.name)}"
          loading="lazy"
          onerror="this.style.display='none'"
        >

        <div class="product-info">

          <h3>${safeText(p.name)}</h3>

          <p>${safeText(p.category || "Fashion")}</p>

          ${p.description ? `<div class="description-wrap"><p class="product-description">${safeText(p.description)}</p><button type="button" class="description-toggle" aria-expanded="false">আরও</button></div>` : ""}

          <div class="product-price">
            ৳${money(p.price)}
          </div>

          <label>Choose Size:</label>

          <select class="product-size">
            ${sizes.map(size => `
              <option value="${safeText(size)}">
                ${safeText(size)}
              </option>
            `).join("")}
          </select>

          <div class="product-actions">
            <button
              class="btn add-cart-btn"
              data-product-id="${safeText(p.id)}"
            >
              ADD TO CART
            </button>
            <button
              class="btn direct-order-btn"
              data-product-id="${safeText(p.id)}"
            >
              DIRECT ORDER
            </button>
          </div>

        </div>
      </article>
    `;
  }).join("");
}

// Expand/collapse product descriptions
if (productList) {
  productList.addEventListener("click", event => {
    const toggle = event.target.closest(".description-toggle");
    if (!toggle) return;
    const wrap = toggle.closest(".description-wrap");
    const description = wrap?.querySelector(".product-description");
    if (!description) return;
    const expanded = description.classList.toggle("description-expanded");
    toggle.textContent = expanded ? "কম দেখুন" : "আরও";
    toggle.setAttribute("aria-expanded", String(expanded));
  });
}

// Add product to cart
function addToCart(id, size) {
  const product = products.find(p => p.id === id);

  if (!product) {
    alert("Product not found.");
    return;
  }

  const existing = cart.find(item =>
    item.id === id && item.size === size
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      image: product.image || "",
      size: size,
      qty: 1
    });
  }

  saveCart();
  alert("Product added to cart!");
}

// Add button click
if (productList) {
  productList.addEventListener("click", event => {
    const button = event.target.closest(".add-cart-btn, .direct-order-btn");

    if (!button) return;

    const card = button.closest(".product-card");
    const sizeSelect = card.querySelector(".product-size");

    const id = button.dataset.productId;
    const size = sizeSelect ? sizeSelect.value : "Free Size";

    if (button.classList.contains("direct-order-btn")) {
      const product = products.find(item => item.id === id);
      if (!product) {
        alert("Product not found.");
        return;
      }

      directOrderItems = [{
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        image: product.image || "",
        size,
        qty: 1
      }];

      const message = $("checkout-message");
      if (message) message.textContent = "Direct order selected. Fill in your delivery details below.";
      $("checkout")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    directOrderItems = null;
    addToCart(id, size);
  });
}

// Change quantity
function changeQty(index, amount) {
  if (!cart[index]) return;

  cart[index].qty += amount;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  saveCart();
}

// Remove product
function removeItem(index) {
  if (!cart[index]) return;

  cart.splice(index, 1);
  saveCart();
}

// Render cart
function renderCart() {
  if (!cartItems || !cartTotal || !cartCount) return;

  const count = cart.reduce(
    (sum, item) => sum + Number(item.qty || 0), 0
  );

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.qty || 0), 0
  );

  cartCount.textContent = count;
  cartTotal.textContent = money(total);

  if (!cart.length) {
    cartItems.innerHTML =
      '<p class="muted">Your cart is empty.</p>';
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-row">

      <div>
        <strong>${safeText(item.name)}</strong>

        <p class="muted">
          Size: ${safeText(item.size)}
          · ৳${money(item.price)}
        </p>

        <button data-action="minus" data-index="${index}">
          −
        </button>

        <strong>${Number(item.qty)}</strong>

        <button data-action="plus" data-index="${index}">
          +
        </button>
      </div>

      <div>
        ৳${money(item.price * item.qty)}

        <button data-action="remove" data-index="${index}">
          Remove
        </button>
      </div>

    </div>
  `).join("");
}

// Cart button actions
if (cartItems) {
  cartItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const index = Number(button.dataset.index);
    const action = button.dataset.action;

    if (action === "minus") changeQty(index, -1);
    if (action === "plus") changeQty(index, 1);
    if (action === "remove") removeItem(index);
  });
}

// Load products from Firebase
try {
  db.ref("products").on("value", snapshot => {
    products = [];

    snapshot.forEach(child => {
      const value = child.val();
      if (value && typeof value === "object") {
        products.push({
          id: child.key,
          ...value
        });
      }
    });

    renderProducts(products);

  }, error => {
    console.error("Products read error:", error);
    if (productList) {
      productList.textContent =
        "Could not load products: " + (error.message || String(error));
    }
  });
} catch (error) {
  console.error("Products setup error:", error);
  if (productList) {
    productList.textContent =
      "Products setup error: " + (error.message || String(error));
  }
}

// Read all public store settings together so payment and WhatsApp details
// always stay in sync with the values saved from the Admin Panel.
db.ref("settings").on("value", snapshot => {
  settings = snapshot.val() || {};
  updatePaymentInfo();
  renderWhatsAppContacts();
}, error => {
  console.error("Store settings read error:", error);
  if (paymentInfo) {
    paymentInfo.textContent = "পেমেন্ট তথ্য লোড করা যায়নি। পেজটি Refresh করুন।";
  }
  const contacts = $("whatsapp-contacts");
  if (contacts) {
    contacts.innerHTML = '<p class="muted">WhatsApp নম্বর লোড করা যায়নি।</p>';
  }
});

function renderWhatsAppContacts() {
  const container = $("whatsapp-contacts");
  if (!container) return;
  const contacts = [
    ["ADMIN ONE", settings.whatsappAdmin1],
    ["ADMIN TWO", settings.whatsappAdmin2]
  ];
  const links = contacts.filter(([, number]) => String(number || "").trim()).map(([label, number]) => {
    let digits = String(number).replace(/\D/g, "");
    if (digits.startsWith("01")) digits = "88" + digits;
    else if (digits.startsWith("1") && digits.length === 10) digits = "880" + digits;
    const safeNumber = safeText(digits);
    const safeLabel = safeText(label);
    return `<a class="whatsapp-contact-link" href="https://wa.me/${safeNumber}" target="_blank" rel="noopener noreferrer"><svg class="whatsapp-icon" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 2.67A13.25 13.25 0 0 0 4.65 22.7L2.8 29.33l6.8-1.78a13.3 13.3 0 1 0 6.44-24.88Zm0 24.05a10.7 10.7 0 0 1-5.45-1.49l-.39-.23-4.03 1.05 1.08-3.92-.25-.4a10.68 10.68 0 1 1 9.04 4.99Zm5.86-8.01c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.72.16-.22.32-.83 1.05-1.02 1.27-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.84-1.59-1.88-1.78-2.2-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.47 4.84.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z"/></svg><span>${safeLabel}</span></a>`;
  });
  container.innerHTML = links.length ? links.join("") : '<p class="muted">WhatsApp যোগাযোগ নম্বর এখনো যোগ করা হয়নি।</p>';
}

// Payment information
function updatePaymentInfo() {
  const paymentMethod = $("payment-method");

  if (!paymentMethod || !paymentInfo) return;

  const method = paymentMethod.value;

  const transactionWrap = $("transaction-id-wrap");
  const transactionInput = $("transaction-id");

  if (method === "bKash") {
    const number = settings.bkashNumber || settings.bkash || "";
    paymentInfo.textContent = number
      ? "বিকাশে Send Money করুন এই নম্বরে: " + number
      : "বিকাশ নম্বর এখনো Admin Panel থেকে যোগ করা হয়নি।";
    if (transactionWrap) transactionWrap.hidden = false;
    if (transactionInput) transactionInput.required = true;

  } else if (method === "Nagad") {
    const number = settings.nagadNumber || settings.nagad || "";
    paymentInfo.textContent = number
      ? "নগদে Send Money করুন এই নম্বরে: " + number
      : "নগদ নম্বর এখনো Admin Panel থেকে যোগ করা হয়নি।";
    if (transactionWrap) transactionWrap.hidden = false;
    if (transactionInput) transactionInput.required = true;

  } else {
    paymentInfo.textContent = "Cash on Delivery — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।";
    if (transactionWrap) transactionWrap.hidden = true;
    if (transactionInput) {
      transactionInput.required = false;
      transactionInput.value = "";
    }
  }
}

if ($("payment-method")) {
  $("payment-method").addEventListener(
    "change",
    updatePaymentInfo
  );
}

// Product search
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();

    const filtered = products.filter(product =>
      String(product.name || "").toLowerCase().includes(q) ||
      String(product.category || "").toLowerCase().includes(q)
    );

    renderProducts(filtered);
  });
}

// Open checkout
if ($("checkout-open")) {
  $("checkout-open").addEventListener("click", () => {
    directOrderItems = null;
    $("checkout")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

// Submit order
if ($("checkout-form")) {
  $("checkout-form").addEventListener("submit", async event => {
    event.preventDefault();

    const orderItems = directOrderItems || cart;
    if (!orderItems.length) {
      alert("Your cart is empty. Please choose Direct Order or add a product to cart.");
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);

    const button = form.querySelector(
      'button[type="submit"]'
    );

    const message = $("checkout-message");

    const order = {
      customerName: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      address: String(data.get("address") || "").trim(),

      paymentMethod: String(data.get("payment") || ""),
      transactionId: String(data.get("transactionId") || "").trim(),

      items: orderItems.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        size: item.size,
        qty: Number(item.qty)
      })),

      total: orderItems.reduce(
        (sum, item) =>
          sum + Number(item.price) * Number(item.qty), 0
      ),

      status: "Pending",
      createdAt: Date.now()
    };

    if (
      (order.paymentMethod === "bKash" || order.paymentMethod === "Nagad") &&
      !order.transactionId
    ) {
      if (message) message.textContent = "বিকাশ/নগদ পেমেন্টের Transaction ID লিখুন।";
      $("transaction-id")?.focus();
      return;
    }

    if (
      (order.paymentMethod === "bKash" && !(settings.bkashNumber || settings.bkash)) ||
      (order.paymentMethod === "Nagad" && !(settings.nagadNumber || settings.nagad))
    ) {
      if (message) message.textContent = "এই পেমেন্ট নম্বরটি এখনো Admin Panel থেকে সেট করা হয়নি।";
      return;
    }

    if (
      !order.customerName ||
      !order.phone ||
      !order.address
    ) {
      if (message) {
        message.textContent = "Please complete all fields.";
      }
      return;
    }

    if (button) button.disabled = true;

    if (message) {
      message.textContent = "Submitting order...";
    }

    try {
      // Create a unique order ID first
      const newOrderRef = db.ref("orders").push();

      // Save order under its own ID
      await newOrderRef.set(order);

      // Clear only the purchase path that was successfully submitted.
      if (directOrderItems) {
        directOrderItems = null;
      } else {
        cart = [];
        saveCart();
      }

      form.reset();
      updatePaymentInfo();

      if (message) {
        message.textContent =
          "Your order has been submitted successfully!";
      }

    } catch (error) {
      console.error("Order error:", error);

      if (message) {
        message.textContent =
          "Order failed: " + error.message;
      }

    } finally {
      if (button) button.disabled = false;
    }
  });
}

// Initial load
renderCart();
updatePaymentInfo();
      
