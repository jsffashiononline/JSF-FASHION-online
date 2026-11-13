
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
let activeCategory = "";

let cart = [];
let directOrderItems = null;
try {
  directOrderItems = JSON.parse(localStorage.getItem("jsf_direct_order") || "null");
  if (!Array.isArray(directOrderItems)) directOrderItems = null;
} catch (error) {
  directOrderItems = null;
}

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


let heroSlideTimer = null;
let heroSlideIndex = 0;
function renderHeroSlides(images) {
  const stage = $("hero-slides");
  const dots = $("hero-dots");
  if (!stage || !dots) return;
  const validImages = Array.isArray(images) ? images.filter(item => typeof item === "string" && /^https:\/\//i.test(item)) : [];
  if (!validImages.length) {
    stage.innerHTML = ""; dots.innerHTML = "";
    if (heroSlideTimer) clearInterval(heroSlideTimer);
    heroSlideTimer = null;
    $("hero-prev")?.classList.add("hidden"); $("hero-next")?.classList.add("hidden");
    return;
  }
  heroSlideIndex = Math.min(heroSlideIndex, validImages.length - 1);
  stage.innerHTML = validImages.map((url, index) => `<img class="hero-slide-image image-view-trigger ${index === heroSlideIndex ? "active" : ""}" src="${safeText(url)}" alt="JSF FASHION banner ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" role="button" tabindex="0" aria-label="ব্যানার ছবি বড় করে দেখুন">`).join("");
  dots.innerHTML = validImages.map((_, index) => `<button type="button" class="hero-dot ${index === heroSlideIndex ? "active" : ""}" data-slide-index="${index}" aria-label="Show banner ${index + 1}"></button>`).join("");
  $("hero-prev")?.classList.toggle("hidden", validImages.length < 2);
  $("hero-next")?.classList.toggle("hidden", validImages.length < 2);
  const showSlide = nextIndex => {
    const imgs = stage.querySelectorAll(".hero-slide-image");
    const indicators = dots.querySelectorAll(".hero-dot");
    if (!imgs.length) return;
    heroSlideIndex = (nextIndex + imgs.length) % imgs.length;
    imgs.forEach((img, i) => img.classList.toggle("active", i === heroSlideIndex));
    indicators.forEach((dot, i) => dot.classList.toggle("active", i === heroSlideIndex));
  };
  if (stage.dataset.bound !== "yes") {
    stage.dataset.bound = "yes";
    $("hero-prev")?.addEventListener("click", () => showSlide(heroSlideIndex - 1));
    $("hero-next")?.addEventListener("click", () => showSlide(heroSlideIndex + 1));
    dots.addEventListener("click", event => {
      const dot = event.target.closest("[data-slide-index]");
      if (dot) showSlide(Number(dot.dataset.slideIndex));
    });
  }
  if (heroSlideTimer) clearInterval(heroSlideTimer);
  if (validImages.length > 1) heroSlideTimer = setInterval(() => showSlide(heroSlideIndex + 1), 4500);
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

// Branded, non-blocking notification instead of browser alert popups
let jsfToastTimer = null;
function showJsfToast(message, type = "success") {
  let toast = document.getElementById("jsf-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "jsf-toast";
    toast.className = "jsf-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.className = "jsf-toast " + (type === "error" ? "error" : "success");
  toast.textContent = message;
  const icon = document.createElement("span");
  icon.className = "jsf-toast-icon";
  icon.textContent = type === "error" ? "!" : "✓";
  toast.prepend(icon);
  requestAnimationFrame(() => toast.classList.add("show"));
  if (jsfToastTimer) clearTimeout(jsfToastTimer);
  jsfToastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

// Product size support
function normalizeSizes(value) {
  if (Array.isArray(value)) return value.map(size => String(size).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(/[,،;\\n]+/).map(size => size.trim()).filter(Boolean);
  return [];
}
function getSizes(product) {
  const sizes = normalizeSizes(product?.sizes).length ? normalizeSizes(product.sizes)
    : normalizeSizes(product?.availableSizes).length ? normalizeSizes(product.availableSizes)
    : normalizeSizes(product?.sizeOptions);
  return sizes.length ? [...new Set(sizes)] : ["Free Size"];
}

// Save cart
function saveCart() {
  localStorage.setItem("jsf_cart", JSON.stringify(cart));
  renderCart();
}

// Render products
const selectedProductVariants = new Map();
const selectedProductDesigns = new Map();
let visibleProducts = [];
function variantPhotoList(variant) {
  const list = Array.isArray(variant?.images) ? variant.images : [];
  return list.filter(url => typeof url === "string" && /^https:\/\//i.test(url)).slice(0,4);
}
function renderProducts(list) {
  if (!productList) return;
  visibleProducts = list;
  if (!list.length) { productList.innerHTML = '<p class="muted">No products found.</p>'; return; }
  productList.innerHTML = list.map(p => {
    const variants = Array.isArray(p.variants) ? p.variants.filter(v => v && String(v.name || "").trim()) : [];
    const saved = selectedProductVariants.get(p.id) || {variantIndex:-1,imageIndex:0};
    const variantIndex = variants.length ? (Number.isInteger(saved.variantIndex) && saved.variantIndex >= 0 ? Math.min(saved.variantIndex, variants.length - 1) : -1) : -1;
    const variant = variantIndex >= 0 ? variants[variantIndex] : null;
    const productPhotos = (Array.isArray(p.images) ? p.images : [p.image]).filter(Boolean);
    const photos = variant ? (variantPhotoList(variant).length ? variantPhotoList(variant) : productPhotos) : productPhotos;
    const imageIndex = Math.min(saved.imageIndex || 0, Math.max(0,photos.length - 1));
    const selectedDesignIndex = selectedProductDesigns.get(p.id) ?? -1;
    const moreDesigns = Array.isArray(p.moreDesigns) ? p.moreDesigns.filter(item => item && /^https:\/\//i.test(item.image || "")) : [];
    const selectedDesign = selectedDesignIndex >= 0 ? moreDesigns[selectedDesignIndex] : null;
    const mainImage = selectedDesign?.image || photos[imageIndex] || p.image || "";
    const designPicker = moreDesigns.length ? `<div class="more-design-picker"><strong>More Design</strong><div class="more-design-options">${moreDesigns.map((item,index)=>`<button type="button" class="more-design-option ${index===selectedDesignIndex?"active":""}" data-more-design-index="${index}" data-product-id="${safeText(p.id)}" aria-label="Select More Design ${index+1}"><img src="${safeText(item.image)}" alt="Design ${index+1}"><span>Design ${index+1}</span></button>`).join("")}</div></div>` : "";
    const price = variant && variant.price !== null && variant.price !== "" && Number.isFinite(Number(variant.price)) ? Number(variant.price) : Number(p.price || 0);
    const thumbs = photos.length > 1 ? `<div class="product-gallery-thumbs">${photos.map((url,index)=>`<button type="button" class="gallery-thumb ${index===imageIndex?"active":""}" data-gallery-thumb="${index}" data-product-id="${safeText(p.id)}" aria-label="View product photo ${index+1}"><img src="${safeText(url)}" alt=""></button>`).join("")}</div>` : "";
    return `<article class="product-card" data-product-card="${safeText(p.id)}"><img class="product-view-image image-view-trigger" data-gallery-main src="${safeText(mainImage)}" alt="${safeText(p.name)}" loading="lazy" role="button" tabindex="0" aria-label="${safeText(p.name)} ছবি বড় করে দেখুন" onerror="this.style.display='none'">${thumbs}${designPicker}<div class="product-info"><h3>${safeText(p.name)}</h3><p>${safeText(p.category || "Fashion")}</p>${p.description ? `<div class="description-wrap"><p class="product-description">${safeText(p.description)}</p><button type="button" class="description-toggle" aria-expanded="false">আরও</button></div>` : ""}<div class="product-price">৳${money(price)}</div><div class="product-actions"><button class="btn add-cart-btn" data-product-id="${safeText(p.id)}">ADD TO CART</button><button class="btn direct-order-btn" data-product-id="${safeText(p.id)}">DIRECT ORDER</button></div></div></article>`;
  }).join("");
}

// Click-to-enlarge image viewer for product photos and homepage banners
// Full-screen swipeable product photo viewer
let imageViewer = null;
let viewerImages = [];
let viewerIndex = 0;
let viewerTouchStartX = 0;
function getImageViewer() {
  if (imageViewer) return imageViewer;
  imageViewer = document.createElement("div");
  imageViewer.className = "image-viewer";
  imageViewer.hidden = true;
  imageViewer.setAttribute("role", "dialog");
  imageViewer.setAttribute("aria-modal", "true");
  imageViewer.setAttribute("aria-label", "Product photo gallery");
  imageViewer.innerHTML = '<button type="button" class="image-viewer-close" aria-label="Close">×</button><button type="button" class="image-viewer-prev" aria-label="Previous photo">‹</button><img class="image-viewer-full" alt=""><button type="button" class="image-viewer-next" aria-label="Next photo">›</button><p class="image-viewer-hint"></p>';
  document.body.appendChild(imageViewer);
  imageViewer.addEventListener("click", event => {
    if (event.target === imageViewer || event.target.closest(".image-viewer-close")) closeImageViewer();
    if (event.target.closest(".image-viewer-prev")) showViewerImage(viewerIndex - 1);
    if (event.target.closest(".image-viewer-next")) showViewerImage(viewerIndex + 1);
  });
  imageViewer.addEventListener("touchstart", event => { viewerTouchStartX = event.changedTouches[0]?.clientX || 0; }, {passive:true});
  imageViewer.addEventListener("touchend", event => {
    const delta = (event.changedTouches[0]?.clientX || 0) - viewerTouchStartX;
    if (Math.abs(delta) > 45) showViewerImage(viewerIndex + (delta < 0 ? 1 : -1));
  }, {passive:true});
  document.addEventListener("keydown", event => {
    if (imageViewer.hidden) return;
    if (event.key === "Escape") closeImageViewer();
    if (event.key === "ArrowRight") showViewerImage(viewerIndex + 1);
    if (event.key === "ArrowLeft") showViewerImage(viewerIndex - 1);
  });
  return imageViewer;
}
function showViewerImage(index) {
  if (!viewerImages.length) return;
  viewerIndex = (index + viewerImages.length) % viewerImages.length;
  imageViewer.querySelector(".image-viewer-full").src = viewerImages[viewerIndex];
  imageViewer.querySelector(".image-viewer-hint").textContent = viewerImages.length > 1 ? (viewerIndex + 1) + " / " + viewerImages.length + " • Swipe or use arrows" : "Tap outside or × to close";
  imageViewer.querySelector(".image-viewer-prev").hidden = viewerImages.length < 2;
  imageViewer.querySelector(".image-viewer-next").hidden = viewerImages.length < 2;
}
function openImageViewer(images, index, alt) {
  viewerImages = (Array.isArray(images) ? images : [images]).filter(url => typeof url === "string" && url);
  if (!viewerImages.length) return;
  const viewer = getImageViewer();
  viewer.querySelector(".image-viewer-full").alt = alt || "JSF FASHION product image";
  viewer.hidden = false;
  document.body.classList.add("image-viewer-open");
  showViewerImage(index || 0);
  viewer.querySelector(".image-viewer-close").focus();
}
function closeImageViewer() {
  if (!imageViewer) return;
  imageViewer.hidden = true;
  imageViewer.querySelector(".image-viewer-full").removeAttribute("src");
  viewerImages = [];
  document.body.classList.remove("image-viewer-open");
}
function activateImageTrigger(target) {
  const image = target.closest(".image-view-trigger");
  if (!image || image.tagName !== "IMG") return;
  const card = image.closest("[data-product-card]");
  const id = card?.getAttribute("data-product-card");
  const product = visibleProducts.find(item => String(item.id) === String(id));
  if (!product) { openImageViewer([image.currentSrc || image.src], 0, image.alt); return; }
  const saved = selectedProductVariants.get(id) || {variantIndex:-1,imageIndex:0};
  const variants = Array.isArray(product.variants) ? product.variants.filter(v => v && String(v.name || "").trim()) : [];
  const variant = variants.length && saved.variantIndex >= 0 ? variants[Math.min(saved.variantIndex, variants.length - 1)] : null;
  const productPhotos = (Array.isArray(product.images) ? product.images : [product.image]).filter(Boolean);
  const photos = variant ? (variantPhotoList(variant).length ? variantPhotoList(variant) : productPhotos) : productPhotos;
  openImageViewer(photos.length ? photos : [image.currentSrc || image.src], saved.imageIndex || 0, product.name);
}
document.addEventListener("click", event => activateImageTrigger(event.target));
document.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.closest?.(".image-view-trigger")) {
    event.preventDefault();
    activateImageTrigger(event.target);
  }
});

// Expand/collapse product descriptions
if (productList) {
  productList.addEventListener("click", event => {
    const designButton = event.target.closest("[data-more-design-index]");
    if (designButton) {
      selectedProductDesigns.set(designButton.dataset.productId, Number(designButton.dataset.moreDesignIndex));
      renderProducts(visibleProducts);
      return;
    }
    const variantButton = event.target.closest("[data-variant-index]");
    if (variantButton) {
      const id = variantButton.dataset.productId;
      selectedProductVariants.set(id, {variantIndex:Number(variantButton.dataset.variantIndex),imageIndex:0});
      renderProducts(visibleProducts);
      return;
    }
    const galleryButton = event.target.closest("[data-gallery-thumb]");
    if (galleryButton) {
      const id = galleryButton.dataset.productId;
      const current = selectedProductVariants.get(id) || {variantIndex:-1,imageIndex:0};
      selectedProductVariants.set(id, {...current,imageIndex:Number(galleryButton.dataset.galleryThumb)});
      renderProducts(visibleProducts);
      return;
    }
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
function addToCart(id, size, variant = null) {
  const product = products.find(p => p.id === id);

  if (!product) {
    showJsfToast("প্রোডাক্টটি পাওয়া যায়নি।", "error");
    return;
  }

  const variantName = variant?.name || "";
  const designIndex = selectedProductDesigns.get(id) ?? -1;
  const selectedDesign = Array.isArray(product.moreDesigns) && designIndex >= 0 ? product.moreDesigns[designIndex] : null;
  const designName = selectedDesign?.name || "";
  const existing = cart.find(item =>
    item.id === id && item.size === size && (item.variant || "") === variantName && (item.design || "") === designName
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(variant && variant.price !== null && variant.price !== "" ? variant.price : product.price || 0),
      image: selectedDesign?.image || variant?.images?.[0] || variant?.image || product.images?.[0] || product.image || "",
      images: selectedDesign?.image ? [selectedDesign.image] : (variant?.images?.length ? [...variant.images] : (product.images?.length ? [...product.images] : (product.image ? [product.image] : []))),
      size: size,
      design: designName,
      designImage: selectedDesign?.image || "",
      variant: variantName,
      color: variantName,
      qty: 1
    });
  }

  saveCart();
  showJsfToast("প্রোডাক্টটি কার্টে যোগ হয়েছে।");
}

// Ask customer to choose a saved color before cart or direct order
let pendingColorChoice = null;
function getColorChoiceDialog() {
  let dialog = document.getElementById("jsf-color-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("div");
  dialog.id = "jsf-color-dialog";
  dialog.className = "jsf-color-dialog";
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="jsf-color-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="jsf-color-title">
      <button type="button" class="jsf-color-close" aria-label="Close">×</button>
      <h3 id="jsf-color-title">প্রোডাক্টের কালার ও সাইজ নির্বাচন করুন</h3>
      <p class="jsf-color-product-name"></p>
      <div class="jsf-color-options"></div>
      <label class="jsf-size-label" for="jsf-modal-size">সাইজ নির্বাচন করুন</label>
      <select class="jsf-size-options" id="jsf-modal-size"><option value="">সাইজ নির্বাচন করুন</option></select>
      <button type="button" class="jsf-color-confirm">✓ নির্বাচন নিশ্চিত করুন</button>
    </div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener("click", event => {
    if (event.target === dialog || event.target.closest(".jsf-color-close")) {
      dialog.hidden = true;
      pendingColorChoice = null;
      return;
    }
    const option = event.target.closest("[data-modal-color-index]");
    if (option) {
      dialog.querySelectorAll(".jsf-color-option").forEach(item => item.classList.remove("selected"));
      option.classList.add("selected");
      pendingColorChoice.variantIndex = Number(option.dataset.modalColorIndex);
      return;
    }
    if (event.target.closest(".jsf-color-confirm")) {
      if (!pendingColorChoice) return;
      if (pendingColorChoice.variants.length && pendingColorChoice.variantIndex < 0) {
        showJsfToast("একটি কালার সিলেক্ট করুন।", "error");
        return;
      }
      const size = dialog.querySelector(".jsf-size-options").value;
      if (!size) {
        showJsfToast("একটি সাইজ সিলেক্ট করুন।", "error");
        return;
      }
      const choice = pendingColorChoice;
      dialog.hidden = true;
      pendingColorChoice = null;
      if (choice.variantIndex >= 0) selectedProductVariants.set(choice.id, {variantIndex:choice.variantIndex,imageIndex:0});
      continueProductAction(choice.id, choice.action, size, choice.variantIndex);
    }
  });
  return dialog;
}
function openColorChoice(id, action, product, variants) {
  const dialog = getColorChoiceDialog();
  pendingColorChoice = {id, action, variantIndex:variants.length ? -1 : -1, variants};
  dialog.querySelector(".jsf-color-product-name").textContent = product.name || "";
  const colorArea = dialog.querySelector(".jsf-color-options");
  colorArea.innerHTML = variants.length ? variants.map((variant,index) => `
    <button type="button" class="jsf-color-option" data-modal-color-index="${index}">
      <span class="jsf-color-dot" style="--swatch-color:${/^#[0-9a-f]{6}$/i.test(variant.colorHex || "") ? variant.colorHex : "#777777"}"></span>
      <span>${safeText(variant.name)}</span><b>✓</b>
    </button>`).join("") : '<p class="jsf-no-color">এই প্রোডাক্টে আলাদা কালার অপশন নেই।</p>';
  const sizeSelect = dialog.querySelector(".jsf-size-options");
  const fillSizes = sizes => {
    sizeSelect.innerHTML = '<option value="">সাইজ নির্বাচন করুন</option>' + sizes.map(size => `<option value="${safeText(size)}">${safeText(size)}</option>`).join("");
  };
  // Show the product's saved sizes immediately; a color-specific size list overrides it when available.
  fillSizes(getSizes(product));
  if (variants.length) {
    colorArea.querySelectorAll(".jsf-color-option").forEach(option => option.addEventListener("click", () => {
      const variant = variants[Number(option.dataset.modalColorIndex)];
      const variantSizes = normalizeSizes(variant?.sizes);
      fillSizes(variantSizes.length ? variantSizes : getSizes(product));
      dialog.querySelectorAll(".jsf-color-option").forEach(item => item.classList.toggle("selected", item === option));
    }));
  }
  dialog.hidden = false;
}
function getSizesForVariant(variant, product) {
  if (Array.isArray(variant?.sizes) && variant.sizes.length) return variant.sizes;
  return getSizes(product);
}
function continueProductAction(id, action, size, variantIndex) {
  const product = products.find(item => item.id === id);
  if (!product) { showJsfToast("প্রোডাক্টটি পাওয়া যায়নি।", "error"); return; }
  const variants = Array.isArray(product.variants) ? product.variants.filter(v => v && String(v.name || "").trim()) : [];
  const variant = variants.length ? variants[variantIndex] : null;
  if (variants.length && !variant) {
    showJsfToast("একটি কালার সিলেক্ট করুন।", "error");
    return;
  }
  if (action === "direct") {
    directOrderItems = [{
      id: product.id,
      name: product.name,
      price: Number(variant && variant.price !== null && variant.price !== "" ? variant.price : product.price || 0),
      image: (Array.isArray(product.moreDesigns) && selectedProductDesigns.has(id) ? product.moreDesigns[selectedProductDesigns.get(id)]?.image : "") || variant?.images?.[0] || variant?.image || product.images?.[0] || product.image || "",
      images: (Array.isArray(product.moreDesigns) && selectedProductDesigns.has(id) ? [product.moreDesigns[selectedProductDesigns.get(id)]?.image].filter(Boolean) : (variant?.images?.length ? [...variant.images] : (product.images?.length ? [...product.images] : (product.image ? [product.image] : [])))),
      size,
      design: (Array.isArray(product.moreDesigns) && selectedProductDesigns.has(id) ? product.moreDesigns[selectedProductDesigns.get(id)]?.name : "") || "",
      designImage: (Array.isArray(product.moreDesigns) && selectedProductDesigns.has(id) ? product.moreDesigns[selectedProductDesigns.get(id)]?.image : "") || "",
      variant: variant?.name || "",
      color: variant?.name || "",
      qty: 1
    }];
    localStorage.setItem("jsf_direct_order", JSON.stringify(directOrderItems));
    window.location.href = "order.html";
    return;
  }
  directOrderItems = null;
  localStorage.removeItem("jsf_direct_order");
  addToCart(id, size, variant);
}
// Use document-level delegation so the chooser still opens after product cards re-render.
document.addEventListener("click", event => {
  const button = event.target.closest?.(".add-cart-btn, .direct-order-btn");
  if (!button) return;
  const id = button.dataset.productId;
  const product = products.find(item => String(item.id) === String(id));
  if (!product) { showJsfToast("প্রোডাক্টটি পাওয়া যায়নি।", "error"); return; }
  const variants = Array.isArray(product.variants) ? product.variants.filter(v => v && String(v.name || "").trim()) : [];
  const action = button.classList.contains("direct-order-btn") ? "direct" : "cart";
  try {
    openColorChoice(id, action, product, variants);
  } catch (error) {
    console.error("JSF product option dialog error:", error);
    showJsfToast("কালার ও সাইজ অপশন খুলতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "error");
  }
});

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
${item.color ? "Color: " + safeText(item.color) + " · " : ""}${item.design ? "More Design: " + safeText(item.design) + " · " : ""}Size: ${safeText(item.size)}
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

    applyProductFilters();

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

// Read each public setting separately. This also works when Firebase rules
// grant read access to individual settings keys rather than the whole node.
settings = {};
[
  "bkashNumber", "nagadNumber", "bkash", "nagad",
  "whatsappAdmin1", "whatsappAdmin2", "bannerImages"
].forEach(key => {
  db.ref("settings/" + key).on("value", snapshot => {
    settings[key] = snapshot.val() || "";
    if (key === "bannerImages") renderHeroSlides(settings[key]);
    else if (key.startsWith("whatsapp")) renderWhatsAppContacts();
    else updatePaymentInfo();
  }, error => {
    console.error("Settings read error (" + key + "):", error);
    if (key.startsWith("whatsapp")) {
      const contacts = $("whatsapp-contacts");
      if (contacts) contacts.innerHTML = '<p class="muted">WhatsApp নম্বর লোড করা যায়নি।</p>';
    } else if (paymentInfo) {
      paymentInfo.textContent = "পেমেন্ট তথ্য লোড করা যায়নি। Firebase Settings permission পরীক্ষা করুন।";
    }
  });
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

// Payment information: only the displayed payment number is a copy control
function updatePaymentInfo() {
  const paymentMethod = $("payment-method");
  if (!paymentMethod || !paymentInfo) return;
  const method = paymentMethod.value;
  const transactionWrap = $("transaction-id-wrap");
  const transactionInput = $("transaction-id");

  if (method === "bKash" || method === "Nagad") {
    const isBkash = method === "bKash";
    const number = String(isBkash
      ? (settings.bkashNumber || settings.bkash || "")
      : (settings.nagadNumber || settings.nagad || "")).trim();
    const service = isBkash ? "বিকাশ" : "নগদ";

    if (number) {
      paymentInfo.innerHTML =
        '<div class="payment-instruction">' + service + ' Send Money করুন নিচের নম্বরে</div>' +
        '<button type="button" class="payment-number-copy" data-copy-number="' + safeText(number) +
        '" aria-label="' + service + ' নম্বর কপি করুন"><span class="payment-number-value">' +
        safeText(number) + '</span><span class="payment-copy-hint">▢ কপি</span></button>' +
        '<div class="payment-copy-feedback" aria-live="polite">এই নাম্বারে সেন্ড মানি করুন</div>';
    } else {
      paymentInfo.textContent = service + " নম্বর এখনো Admin Panel থেকে যোগ করা হয়নি।";
    }
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

// Only the dedicated payment-number button copies a number
if (paymentInfo) {
  paymentInfo.addEventListener("click", async event => {
    const button = event.target.closest(".payment-number-copy");
    if (!button || !paymentInfo.contains(button)) return;
    const number = button.dataset.copyNumber || "";
    const feedback = paymentInfo.querySelector(".payment-copy-feedback");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(number);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = number;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.left = "-9999px";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand("copy");
        temporaryInput.remove();
        if (!copied) throw new Error("Copy command was not available");
      }
      button.classList.add("copied");
      const hint = button.querySelector(".payment-copy-hint");
      if (hint) hint.textContent = "কপি হয়েছে ✓";
      if (feedback) feedback.textContent = "পেমেন্ট নম্বর কপি হয়েছে";
    } catch (error) {
      console.error("Payment number copy failed:", error);
      if (feedback) feedback.textContent = "কপি করা যায়নি, আবার চেষ্টা করুন";
    }
  });
}

if ($("payment-method")) {
  $("payment-method").addEventListener(
    "change",
    updatePaymentInfo
  );
}

// Category and product search filters
function normalizeCategory(value) {
  const category = String(value || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\\s+/g, " ");
  const aliases = {
    "t shirt": "t-shirts", "t shirts": "t-shirts", "tee": "t-shirts", "tees": "t-shirts",
    "shirt": "shirts",
    "drop shoulders": "drop shoulder", "drop shoulder t shirt": "drop shoulder",
    "pant": "pants", "pants and jeans": "pants",
    "punjabi": "panjabi",
    "ladies": "saree", "ladies fashion": "saree", "women's fashion": "saree", "womens fashion": "saree",
    "hoodie": "hoodie & jacket", "hoodies": "hoodie & jacket", "hoodie & sweatshirt": "hoodie & jacket",
    "sweatshirt": "hoodie & jacket", "jacket": "hoodie & jacket", "jackets": "hoodie & jacket",
    "combo": "combo & couple", "comb": "combo & couple", "couple": "combo & couple",
    "couple set": "combo & couple", "combo & couple": "combo & couple",
    "three piece": "three piece", "three-piece": "three piece"
  };
  return aliases[category] || category;
}

function applyProductFilters() {
  const q = String(searchInput?.value || "").toLowerCase().trim();
  const filtered = products.filter(product => {
    const category = String(product.category || "").toLowerCase().trim();
    const selectedCategory = normalizeCategory(activeCategory);
    const normalizedProductCategory = normalizeCategory(category);
    const matchesCategory = !activeCategory ||
      normalizedProductCategory === selectedCategory ||
      (selectedCategory === "saree" && ["ladies", "ladies fashion", "women's fashion", "womens fashion"].includes(normalizedProductCategory)) ||
      (activeCategory === "New Arrivals" && product.isNewArrival === true);
    const matchesSearch = !q ||
      String(product.name || "").toLowerCase().includes(q) ||
      category.includes(q) ||
      String(product.description || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });
  renderProducts(filtered);
}

const categoryGrid = $("category-grid");
if (categoryGrid) {
  categoryGrid.addEventListener("click", event => {
    const card = event.target.closest("[data-category]");
    if (!card) return;
    event.preventDefault();
    activeCategory = card.dataset.category || "";
    categoryGrid.querySelectorAll("[data-category]").forEach(item => {
      item.classList.toggle("active", item === card);
      item.setAttribute("aria-pressed", String(item === card));
    });
    applyProductFilters();
    $("products")?.scrollIntoView({behavior:"smooth", block:"start"});
  });
}

if (searchInput) {
  searchInput.addEventListener("input", applyProductFilters);
}

// Open checkout
if ($("checkout-open")) {
  $("checkout-open").addEventListener("click", () => {
    directOrderItems = null;
    localStorage.removeItem("jsf_direct_order");
    window.location.href = "order.html";
  });
}

// Checkout delivery and payment price summary
function detectDeliveryArea(address) {
  const value = String(address || "").toLowerCase()
    .replace(/[.,\/\\-]+/g, " ")
    .replace(/\s+/g, " ").trim();

  // Detect a clearly named district outside Dhaka first, so an address
  // mentioning "Dhaka Division" but naming another district is not misclassified.
  const outsideDistricts = [
    ["চট্টগ্রাম","chattogram","chittagong"], ["কক্সবাজার","cox's bazar","coxsbazar"],
    ["কুমিল্লা","cumilla","comilla"], ["ফেনী","feni"], ["নোয়াখালী","noakhali"],
    ["লক্ষ্মীপুর","lakshmipur"], ["চাঁদপুর","chandpur"], ["ব্রাহ্মণবাড়িয়া","brahmanbaria"],
    ["রাঙ্গামাটি","rangamati"], ["খাগড়াছড়ি","khagrachhari"], ["বান্দরবান","bandarban"],
    ["সিলেট","sylhet"], ["মৌলভীবাজার","moulvibazar"], ["হবিগঞ্জ","habiganj","habiganj"],
    ["রাজশাহী","rajshahi"], ["নাটোর","natore"], ["নওগাঁ","naogaon"], ["চাঁপাইনবাবগঞ্জ","chapainawabganj"],
    ["পাবনা","pabna"], ["সিরাজগঞ্জ","sirajganj"], ["বগুড়া","bogura","bogra"],
    ["জয়পুরহাট","joypurhat"], ["রংপুর","rangpur"], ["দিনাজপুর","dinajpur"],
    ["গাইবান্ধা","gaibandha"], ["কুড়িগ্রাম","kurigram"], ["লালমনিরহাট","lalmonirhat"],
    ["নীলফামারী","nilphamari"], ["পঞ্চগড়","panchagarh"], ["ঠাকুরগাঁও","thakurgaon"],
    ["খুলনা","khulna"], ["যশোর","jashore","jeshore"], ["সাতক্ষীরা","satkhira"],
    ["বাগেরহাট","bagerhat"], ["নড়াইল","narail"], ["মাগুরা","magura"],
    ["ঝিনাইদহ","jhenaidah"], ["কুষ্টিয়া","kushtia"], ["চুয়াডাঙ্গা","chuadanga"],
    ["মেহেরপুর","meherpur"], ["বরিশাল","barishal","barisal"], ["ভোলা","bhola"],
    ["পটুয়াখালী","patuakhali"], ["বরগুনা","barguna"], ["ঝালকাঠি","jhalokati"],
    ["পিরোজপুর","pirojpur"], ["ময়মনসিংহ","mymensingh"], ["জামালপুর","jamalpur"],
    ["শেরপুর","sherpur"], ["নেত্রকোনা","netrokona"], ["টাঙ্গাইল","tangail"],
    ["গাজীপুর","gazipur"], ["নরসিংদী","narsingdi"], ["মানিকগঞ্জ","manikganj"],
    ["মুন্সিগঞ্জ","munshiganj"], ["নারায়ণগঞ্জ","narayanganj"], ["ফরিদপুর","faridpur"],
    ["গোপালগঞ্জ","gopalganj"], ["মাদারীপুর","madaripur"], ["রাজবাড়ী","rajbari"],
    ["শরীয়তপুর","shariatpur"]
  ];
  const hasDistrict = terms => terms.some(term => value.includes(term));
  if (outsideDistricts.some(terms => hasDistrict(terms))) return "Outside Dhaka";
  if (/ঢাকা|\bdhaka\b/.test(value)) return "Dhaka";
  return "Outside Dhaka";
}
function syncDeliveryArea() {
  const address = $("checkout-form")?.elements.namedItem("address")?.value || "";
  const area = detectDeliveryArea(address);
  const selector = $("delivery-area");
  const hiddenArea = $("delivery-area-value");
  if (selector) selector.value = area;
  if (hiddenArea) hiddenArea.value = area;
  updateCheckoutSummary();
}
$("checkout-form")?.elements.namedItem("address")?.addEventListener("input", syncDeliveryArea);

function updateCheckoutSummary() {
  const summary = $("checkout-price-summary");
  if (!summary) return;
  const items = directOrderItems || cart;
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const shipping = detectDeliveryArea($("checkout-form")?.elements.namedItem("address")?.value) === "Outside Dhaka" ? 120 : 60;
  const cod = 0;
  summary.innerHTML = '<strong>অর্ডারের হিসাব</strong><p>পণ্যের মূল্য: ৳' + money(subtotal) + '</p><p>ডেলিভারি চার্জ: ৳' + money(shipping) + '</p><hr><strong>সর্বমোট: ৳' + money(subtotal + shipping + cod) + '</strong>';
}
$("delivery-area")?.addEventListener("change", updateCheckoutSummary);
$("payment-method")?.addEventListener("change", () => { updatePaymentInfo(); updateCheckoutSummary(); });

// Submit order
if ($("checkout-form")) {
  $("checkout-form").addEventListener("submit", async event => {
    event.preventDefault();

    const orderItems = directOrderItems || cart;
    if (!orderItems.length) {
      showJsfToast("আপনার কার্ট খালি। আগে একটি প্রোডাক্ট যোগ করুন।", "error");
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
      deliveryArea: detectDeliveryArea(data.get("address")),
      shippingCharge: detectDeliveryArea(data.get("address")) === "Outside Dhaka" ? 120 : 60,
      codFee: 0,

      items: orderItems.map(item => ({
        id: item.id,
        name: item.name,
        image: item.image || item.images?.[0] || products.find(product => String(product.id) === String(item.id))?.images?.[0] || products.find(product => String(product.id) === String(item.id))?.image || "",
        price: Number(item.price),
        size: item.size,
        variant: item.variant || "",
        color: item.color || item.variant || "",
        images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
        qty: Number(item.qty)
      })),

      subtotal: orderItems.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.qty), 0
      ),
      total: 0,

      status: "Pending",
      createdAt: Date.now()
    };

    order.total = order.subtotal + order.shippingCharge + order.codFee;

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
        localStorage.removeItem("jsf_direct_order");
      } else {
        cart = [];
        saveCart();
      }

      form.reset();
      updatePaymentInfo();
      syncDeliveryArea();
      updateCheckoutSummary();

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
syncDeliveryArea();
updateCheckoutSummary();
      
