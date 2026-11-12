
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

          ${p.description ? `<p class="product-description">${safeText(p.description)}</p>` : ""}

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

// Load store settings
db.ref("settings").on("value", snapshot => {
  settings = snapshot.val() || {};
  updatePaymentInfo();
});

// Load the two public WhatsApp contact numbers
db.ref("publicContact").on("value", snapshot => {
  const contacts = snapshot.val() || {};
  renderWhatsAppContacts(contacts);
}, error => {
  console.error("WhatsApp contacts read error:", error);
});

// Render only the two admin WhatsApp contacts
function renderWhatsAppContacts(contacts) {
  const container = $("whatsapp-contacts");
  if (!container) return;

  const entries = [
    ["Admin 1", contacts.whatsappAdmin1],
    ["Admin 2", contacts.whatsappAdmin2]
  ];

  const links = entries.filter(([, number]) => String(number || "").trim())
    .map(([label, number]) => {
      let digits = String(number).replace(/\\D/g, "");
      if (digits.startsWith("01")) digits = "88" + digits;
      else if (digits.startsWith("1") && digits.length === 10) digits = "880" + digits;
      const safeNumber = safeText(digits);
      const safeLabel = safeText(label);
      return `<a class="whatsapp-contact-link" href="https://wa.me/${safeNumber}" target="_blank" rel="noopener noreferrer">${safeLabel} WhatsApp</a>`;
    });

  container.innerHTML = links.length
    ? links.join("")
    : '<p class="muted">WhatsApp contact numbers will be available soon.</p>';
}

// Payment information
function updatePaymentInfo() {
  const paymentMethod = $("payment-method");

  if (!paymentMethod || !paymentInfo) return;

  const method = paymentMethod.value;

  if (method === "bKash") {
    paymentInfo.textContent =
      "bKash Number: " +
      (settings.bkash || "Please contact the store.");

  } else if (method === "Nagad") {
    paymentInfo.textContent =
      "Nagad Number: " +
      (settings.nagad || "Please contact the store.");

  } else {
    paymentInfo.textContent =
      "Pay when your order is delivered.";
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
      
