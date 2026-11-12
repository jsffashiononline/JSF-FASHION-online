
const productList = document.getElementById("product-list");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const cartCount = document.getElementById("cart-count");
const searchInput = document.getElementById("product-search");
const paymentInfo = document.getElementById("payment-info");

let products = [];
let settings = {};
let cart = JSON.parse(localStorage.getItem("jsf_cart") || "[]");

document.getElementById("year").textContent = new Date().getFullYear();

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

function saveCart() {
  localStorage.setItem("jsf_cart", JSON.stringify(cart));
  renderCart();
}

function renderProducts(list) {
  if (!list.length) {
    productList.innerHTML = '<p class="muted">No products found.</p>';
    return;
  }

  productList.innerHTML = list.map(p => {
    const sizes = Array.isArray(p.sizes) ? p.sizes : ["Free Size"];
    return `
      <article class="product-card">
        <img src="${safeText(p.image || "")}" alt="${safeText(p.name)}"
             loading="lazy" onerror="this.style.display='none'">
        <div class="product-info">
          <h3>${safeText(p.name)}</h3>
          <p>${safeText(p.category || "Fashion")}</p>
          <div class="product-price">৳${money(p.price)}</div>
          <select id="size-${safeText(p.id)}">
            ${sizes.map(s => `<option value="${safeText(s)}">${safeText(s)}</option>`).join("")}
          </select>
          <button class="btn" onclick="addToCart('${safeText(p.id)}')">ADD TO CART</button>
        </div>
      </article>`;
  }).join("");
}

function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const sizeEl = document.getElementById("size-" + id);
  const size = sizeEl ? sizeEl.value : "Free Size";
  const existing = cart.find(x => x.id === id && x.size === size);
  if (existing) existing.qty++;
  else cart.push({
    id:p.id,name:p.name,price:Number(p.price),image:p.image || "",
    size,qty:1
  });
  saveCart();
  alert("Product added to cart.");
}

function changeQty(index, amount) {
  if (!cart[index]) return;
  cart[index].qty += amount;
  if (cart[index].qty <= 0) cart.splice(index,1);
  saveCart();
}

function removeItem(index) {
  cart.splice(index,1);
  saveCart();
}

function renderCart() {
  cartCount.textContent = cart.reduce((sum,x)=>sum+x.qty,0);
  const total = cart.reduce((sum,x)=>sum+x.price*x.qty,0);
  cartTotal.textContent = money(total);

  if (!cart.length) {
    cartItems.innerHTML = '<p class="muted">Your cart is empty.</p>';
    return;
  }

  cartItems.innerHTML = cart.map((x,i)=>`
    <div class="cart-row">
      <div>
        <strong>${safeText(x.name)}</strong>
        <p class="muted">Size: ${safeText(x.size)} · ৳${money(x.price)}</p>
        <button onclick="changeQty(${i},-1)">−</button>
        <strong>${x.qty}</strong>
        <button onclick="changeQty(${i},1)">+</button>
      </div>
      <div>
        ৳${money(x.price*x.qty)}
        <button onclick="removeItem(${i})">Remove</button>
      </div>
    </div>`).join("");
}

db.ref("products").on("value", snapshot => {
  products = [];
  snapshot.forEach(child => {
    products.push({id:child.key,...child.val()});
  });
  renderProducts(products);
}, error => {
  productList.textContent = "Could not load products: " + error.message;
});

db.ref("settings").on("value", snapshot => {
  settings = snapshot.val() || {};
  updatePaymentInfo();
});

function updatePaymentInfo() {
  const method = document.getElementById("payment-method").value;
  if (method === "bKash") {
    paymentInfo.textContent = "bKash Number: " + (settings.bkash || "Please contact the store.");
  } else if (method === "Nagad") {
    paymentInfo.textContent = "Nagad Number: " + (settings.nagad || "Please contact the store.");
  } else {
    paymentInfo.textContent = "Pay when your order is delivered.";
  }
}

document.getElementById("payment-method").addEventListener("change",updatePaymentInfo);

searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  renderProducts(products.filter(p =>
    String(p.name || "").toLowerCase().includes(q) ||
    String(p.category || "").toLowerCase().includes(q)
  ));
});

document.getElementById("checkout-open").addEventListener("click", () => {
  document.getElementById("checkout").scrollIntoView({behavior:"smooth"});
});

document.getElementById("checkout-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const form = e.currentTarget;
  const data = new FormData(form);
  const button = form.querySelector("button[type=submit]");
  const message = document.getElementById("checkout-message");

  const order = {
    customerName:String(data.get("name")).trim(),
    phone:String(data.get("phone")).trim(),
    address:String(data.get("address")).trim(),
    paymentMethod:String(data.get("payment")),
    items:cart.map(x=>({
      id:x.id,name:x.name,price:x.price,size:x.size,qty:x.qty
    })),
    total:cart.reduce((sum,x)=>sum+x.price*x.qty,0),
    status:"Pending",
    createdAt:Date.now()
  };

  if (!order.customerName || !order.phone || !order.address) {
    message.textContent = "Please complete all fields.";
    return;
  }

  button.disabled = true;
  message.textContent = "Submitting order...";

  try {
    await db.ref("orders").push(order);
    cart = [];
    saveCart();
    form.reset();
    updatePaymentInfo();
    message.textContent = "Your order has been submitted successfully!";
  } catch (error) {
    message.textContent = "Order failed: " + error.message;
  } finally {
    button.disabled = false;
  }
});

renderCart();
updatePaymentInfo();
