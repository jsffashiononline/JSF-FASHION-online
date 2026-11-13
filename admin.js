
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
   4. CLOUDINARY PRODUCT PHOTO GALLERY
================================= */

const productImageInput = $("product-image");
let productGalleryImages = [];
let productGalleryPreview = null;
let productGalleryStatus = null;
let productGalleryInput = null;

function renderProductGalleryPreview() {
  if (!productGalleryPreview) return;
  productGalleryPreview.innerHTML = productGalleryImages.map((url, index) =>
    `<div style="position:relative"><img src="${escapeHTML(url)}" alt="Product photo ${index+1}" style="width:76px;height:86px;object-fit:cover;border:1px solid #444;border-radius:7px"><button type="button" data-remove-product-photo="${index}" aria-label="Remove photo" style="position:absolute;top:2px;right:2px;background:#7b2222;color:white;border:0;border-radius:50%;width:22px;height:22px;cursor:pointer">×</button></div>`
  ).join("");
}

if (productImageInput) {
  const uploadContainer = document.createElement("div");
  uploadContainer.style.cssText = "margin-top:10px;display:flex;flex-direction:column;gap:10px";
  const galleryButton = document.createElement("button");
  galleryButton.type = "button";
  galleryButton.textContent = "📷 CHOOSE MULTIPLE PRODUCT PHOTOS";
  galleryButton.style.cssText = "padding:12px;background:#dfb957;color:#080808;border:0;border-radius:6px;font-weight:bold;cursor:pointer";
  productGalleryInput = document.createElement("input");
  productGalleryInput.type = "file";
  productGalleryInput.accept = "image/jpeg,image/png,image/webp";
  productGalleryInput.multiple = true;
  productGalleryInput.hidden = true;
  productGalleryStatus = document.createElement("p");
  productGalleryStatus.style.cssText = "font-size:13px;margin:0";
  productGalleryPreview = document.createElement("div");
  productGalleryPreview.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
  uploadContainer.append(galleryButton, productGalleryInput, productGalleryStatus, productGalleryPreview);
  productImageInput.insertAdjacentElement("afterend", uploadContainer);
  galleryButton.addEventListener("click", () => productGalleryInput.click());
  productGalleryPreview.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-product-photo]");
    if (!button) return;
    productGalleryImages.splice(Number(button.dataset.removeProductPhoto), 1);
    productImageInput.value = productGalleryImages[0] || "";
    renderProductGalleryPreview();
  });
  productGalleryInput.addEventListener("change", async () => {
    const files = Array.from(productGalleryInput.files || []);
    if (!files.length) return;
    if (productGalleryImages.length + files.length > 8) {
      productGalleryStatus.textContent = "একটি প্রোডাক্টে সর্বোচ্চ ৮টি ছবি রাখা যাবে।";
      productGalleryInput.value = "";
      return;
    }
    const invalid = files.find(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 10*1024*1024);
    if (invalid) {
      productGalleryStatus.textContent = "শুধু JPG, PNG, WEBP এবং প্রতিটি ছবি ১০ MB-এর কম হতে হবে।";
      productGalleryInput.value = "";
      return;
    }
    galleryButton.disabled = true;
    galleryButton.textContent = "UPLOADING PHOTOS...";
    let uploaded = 0;
    try {
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        data.append("folder", "jsf-fashion-products");
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {method:"POST",body:data});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Cloudinary upload failed.");
        productGalleryImages.push(result.secure_url);
        uploaded++;
        productGalleryStatus.textContent = uploaded + " / " + files.length + " ছবি আপলোড হয়েছে...";
        renderProductGalleryPreview();
      }
      productImageInput.value = productGalleryImages[0] || "";
      productGalleryStatus.textContent = productGalleryImages.length + " টি প্রোডাক্ট ছবি প্রস্তুত হয়েছে।";
      productGalleryStatus.style.color = "#70d99a";
    } catch (error) {
      productGalleryStatus.textContent = "আপলোডে সমস্যা: " + error.message;
      productGalleryStatus.style.color = "#ff7777";
    } finally {
      galleryButton.disabled = false;
      galleryButton.textContent = "📷 CHOOSE MULTIPLE PRODUCT PHOTOS";
      productGalleryInput.value = "";
    }
  });
}


/* =================================
   4B. HOMEPAGE BANNER MANAGEMENT
================================= */
let bannerImages = [];
const bannerFilesInput = $("banner-image-files");
const uploadBannerButton = $("upload-banner-images");
const bannerList = $("banner-image-list");
const bannerMessage = $("banner-upload-message");
function renderBannerImageList() {
  if (!bannerList) return;
  if (!bannerImages.length) {
    bannerList.innerHTML = '<p class="muted">এখনো কোনো Banner Image আপলোড করা হয়নি।</p>';
    return;
  }
  bannerList.innerHTML = bannerImages.map((url, index) => `<article class="banner-image-card"><img src="${escapeHTML(url)}" alt="Banner ${index + 1}"><div><strong>Banner ${index + 1}</strong><button class="small-btn delete" type="button" data-remove-banner="${index}">REMOVE</button></div></article>`).join("");
}
if (uploadBannerButton && bannerFilesInput) {
  uploadBannerButton.addEventListener("click", async () => {
    const files = Array.from(bannerFilesInput.files || []);
    if (!files.length) {
      showMessage(bannerMessage, "প্রথমে গ্যালারি থেকে ছবি নির্বাচন করুন।", "error");
      return;
    }
    const invalid = files.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid) {
      showMessage(bannerMessage, "শুধু JPG, PNG বা WEBP ছবি দিন; প্রতিটি ছবি ১০ MB-এর কম হতে হবে।", "error");
      return;
    }
    uploadBannerButton.disabled = true;
    uploadBannerButton.textContent = "UPLOADING...";
    let uploaded = 0;
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", "jsf-fashion-banners");
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {method:"POST", body:formData});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Cloudinary upload failed.");
        bannerImages.push(result.secure_url);
        await set(ref(db, "settings/bannerImages"), bannerImages);
        uploaded++;
        renderBannerImageList();
        showMessage(bannerMessage, `${uploaded} / ${files.length} টি ছবি আপলোড হয়েছে...`);
      }
      bannerFilesInput.value = "";
      showMessage(bannerMessage, `${uploaded} টি Banner Image সফলভাবে আপলোড হয়েছে। ওয়েবসাইটে স্বয়ংক্রিয়ভাবে দেখা যাবে।`, "success");
    } catch (error) {
      console.error("Banner upload error:", error);
      showMessage(bannerMessage, "ছবি আপলোডে সমস্যা: " + error.message, "error");
    } finally {
      uploadBannerButton.disabled = false;
      uploadBannerButton.textContent = "UPLOAD SELECTED IMAGES";
    }
  });
}
if (bannerList) {
  bannerList.addEventListener("click", async event => {
    const button = event.target.closest("[data-remove-banner]");
    if (!button) return;
    const index = Number(button.dataset.removeBanner);
    if (!Number.isInteger(index) || index < 0 || index >= bannerImages.length) return;
    if (!confirm("এই Banner Image ওয়েবসাইটের Slider থেকে সরাবেন?")) return;
    const nextImages = bannerImages.filter((_, i) => i !== index);
    try {
      await set(ref(db, "settings/bannerImages"), nextImages);
      bannerImages = nextImages;
      renderBannerImageList();
      showMessage(bannerMessage, "Banner Image সরানো হয়েছে।", "success");
    } catch (error) {
      showMessage(bannerMessage, "ছবি সরানো যায়নি: " + firebaseError(error), "error");
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
   PRODUCT COLOR & DESIGN VARIANTS
================================= */
const variantEditor = document.createElement("section");
variantEditor.className = "variant-editor";
variantEditor.innerHTML = `
  <div class="variant-editor-heading">
    <div><p class="eyebrow">PRODUCT OPTIONS</p><h3>Color & Design Variants</h3><p class="muted">প্রতিটি কালার/ডিজাইনের জন্য আলাদা ৩–৪টি ছবি, দাম ও সাইজ দিন।</p></div>
    <button type="button" class="btn gold" id="add-product-variant">+ ADD VARIANT</button>
  </div>
  <div id="product-variant-list" class="variant-editor-list"></div>`;
productForm.insertAdjacentElement("afterend", variantEditor);
const variantList = variantEditor.querySelector("#product-variant-list");
const variantAddButton = variantEditor.querySelector("#add-product-variant");
if (productImageInput) productImageInput.required = false;
function variantImagesFromText(value) {
  return String(value || "").split(/[\n,]+/).map(url => url.trim()).filter(url => /^https:\/\//i.test(url));
}
function addVariantEditorCard(variant = {}) {
  const card = document.createElement("article");
  card.className = "variant-editor-card";
  const images = Array.isArray(variant.images) ? variant.images : (variant.image ? [variant.image] : []);
  card.innerHTML = `
    <div class="variant-card-top"><strong>Color / Design Variant</strong><button type="button" class="small-btn delete" data-remove-variant>REMOVE</button></div>
    <div class="variant-fields">
      <div><label>Color / Design Name *</label><input class="variant-name" maxlength="50" placeholder="Black / Graphic Print" value="${escapeHTML(variant.name || variant.color || "")}"></div>
      <div><label>Color Code</label><input class="variant-color" type="color" value="${/^#[0-9a-f]{6}$/i.test(variant.colorHex || "") ? variant.colorHex : "#222222"}"></div>
      <div><label>Variant Price (BDT, optional)</label><input class="variant-price" type="number" min="0" step="0.01" placeholder="Use main product price" value="${variant.price ?? ""}"></div>
      <div><label>Available Sizes</label><input class="variant-sizes" placeholder="S, M, L, XL" value="${escapeHTML(Array.isArray(variant.sizes) ? variant.sizes.join(", ") : (variant.sizes || ""))}"></div>
      <div class="variant-images-field"><label>Image URLs (one per line)</label><textarea class="variant-images" rows="3" placeholder="Uploaded image links will appear here">${escapeHTML(images.join("\n"))}</textarea>
      <label>Upload 3–4 photos for this variant</label><input class="variant-files" type="file" accept="image/jpeg,image/png,image/webp" multiple>
      <div class="variant-image-preview">${images.map(url => `<img src="${escapeHTML(url)}" alt="Variant preview">`).join("")}</div><p class="variant-upload-status" aria-live="polite"></p></div>
    </div>`;
  variantList.appendChild(card);
  const fileInput = card.querySelector(".variant-files");
  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;
    const current = variantImagesFromText(card.querySelector(".variant-images").value);
    if (files.length + current.length > 4) {
      card.querySelector(".variant-upload-status").textContent = "একটি ভ্যারিয়েন্টে সর্বোচ্চ ৪টি ছবি রাখা যাবে।";
      fileInput.value = ""; return;
    }
    if (files.some(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      card.querySelector(".variant-upload-status").textContent = "শুধু JPG, PNG, WEBP এবং প্রতিটি ১০ MB-এর কম ছবি দিন।";
      fileInput.value = ""; return;
    }
    const status = card.querySelector(".variant-upload-status");
    status.textContent = "ছবি আপলোড হচ্ছে...";
    fileInput.disabled = true;
    try {
      const urls = [...current];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", "jsf-fashion-products");
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {method:"POST", body:formData});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Cloudinary upload failed.");
        urls.push(result.secure_url);
      }
      card.querySelector(".variant-images").value = urls.join("\n");
      if (productImageInput && !productImageInput.value && urls[0]) productImageInput.value = urls[0];
      status.textContent = urls.length + " টি ছবি প্রস্তুত হয়েছে।";
      card.querySelector(".variant-image-preview").innerHTML = urls.map(url => `<img src="${escapeHTML(url)}" alt="Variant preview">`).join("");
    } catch (error) {
      status.textContent = "আপলোড হয়নি: " + error.message;
    } finally {
      fileInput.disabled = false;
      fileInput.value = "";
    }
  });
  card.querySelector(".variant-images").addEventListener("input", () => {
    const urls = variantImagesFromText(card.querySelector(".variant-images").value).slice(0,4);
    card.querySelector(".variant-image-preview").innerHTML = urls.map(url => `<img src="${escapeHTML(url)}" alt="Variant preview">`).join("");
    if (productImageInput && !productImageInput.value && urls[0]) productImageInput.value = urls[0];
  });
}
variantAddButton.addEventListener("click", () => addVariantEditorCard());
variantList.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-variant]");
  if (button) button.closest(".variant-editor-card").remove();
});
function collectProductVariants() {
  return Array.from(variantList.querySelectorAll(".variant-editor-card")).map(card => ({
    name: card.querySelector(".variant-name").value.trim(),
    colorHex: card.querySelector(".variant-color").value,
    price: card.querySelector(".variant-price").value === "" ? null : Number(card.querySelector(".variant-price").value),
    sizes: card.querySelector(".variant-sizes").value.split(",").map(value => value.trim()).filter(Boolean),
    images: variantImagesFromText(card.querySelector(".variant-images").value).slice(0,4)
  }));
}
function loadProductVariants(variants) {
  variantList.innerHTML = "";
  (Array.isArray(variants) ? variants : []).forEach(addVariantEditorCard);
}

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

  const variants = collectProductVariants();
  const firstVariantImage = variants.find(item => item.images.length)?.images[0] || "";
  const product = {
    name: $("product-name").value.trim(),
    price: Number($("product-price").value),
    category: $("product-category").value.trim(),
    image: $("product-image").value.trim() || firstVariantImage,
    images: productGalleryImages.length ? [...productGalleryImages] : ($("product-image").value.trim() ? [$("product-image").value.trim()] : (firstVariantImage ? [firstVariantImage] : [])),
    sizes: $("product-sizes").value.trim(),
    description: $("product-description").value.trim(),
    variants,
    updatedAt: Date.now()
  };
  if (variants.some(item => !item.name || item.images.length < 3 || item.images.length > 4)) {
    showMessage(productMessage, "প্রতিটি Variant-এর নাম এবং ৩–৪টি ছবি দিতে হবে।", "error");
    return;
  }

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
    productGalleryImages = [];
    renderProductGalleryPreview();
    if (productGalleryStatus) productGalleryStatus.textContent = "";
    loadProductVariants([]);

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
      const categorySelect = $("product-category");
      const savedCategory = product.category || "";
      if (savedCategory && !Array.from(categorySelect.options).some(option => option.value === savedCategory)) {
        const legacyOption = document.createElement("option");
        legacyOption.value = savedCategory;
        legacyOption.textContent = savedCategory + " (Existing)";
        categorySelect.appendChild(legacyOption);
      }
      categorySelect.value = savedCategory;
      $("product-image").value = product.image || "";
      productGalleryImages = Array.isArray(product.images) && product.images.length ? [...product.images] : (product.image ? [product.image] : []);
      renderProductGalleryPreview();
      if (productGalleryStatus) productGalleryStatus.textContent = productGalleryImages.length + " টি সংরক্ষিত ছবি";
      $("product-sizes").value = product.sizes || "";
      $("product-description").value = product.description || "";
      loadProductVariants(product.variants || []);

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
  loadProductVariants([]);
  showMessage(productMessage, "Form পরিষ্কার করা হয়েছে।");
});

/* =================================
   11. CUSTOMER ORDERS
================================= */

async function loadOrders() {
  const ordersRef = ref(db, "orders");
  let catalogProducts = {};
  try {
    const catalogSnapshot = await get(ref(db, "products"));
    catalogProducts = catalogSnapshot.val() || {};
  } catch (error) {
    console.warn("Product image fallback could not load:", error);
  }

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

      const itemsHTML = Array.isArray(order.items)
        ? order.items.map((item) => {
            const itemName = item.name || item.productName || "Product";
            const itemSize = item.size || item.selectedSize || "Not specified";
            const itemVariant = item.color || item.variant || item.selectedColor || "";
            const itemQty = item.qty || item.quantity || 1;
            const savedProduct = catalogProducts[item.id] || {};
            const matchingVariant = Array.isArray(savedProduct.variants)
              ? savedProduct.variants.find(variant => String(variant.name || "") === String(item.color || item.variant || ""))
              : null;
            const itemImage = item.image || item.images?.[0] ||
              matchingVariant?.images?.[0] || matchingVariant?.image ||
              savedProduct.images?.[0] || savedProduct.image || "";
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.12)">${itemImage ? `<img src="${escapeHTML(itemImage)}" alt="${escapeHTML(itemName)}" loading="lazy" style="width:76px;height:86px;object-fit:cover;border-radius:8px;background:#fff">` : `<div style="width:76px;height:86px;display:grid;place-items:center;background:#26344d;border-radius:8px;font-size:11px">No Image</div>`}<div><strong>${escapeHTML(itemName)}</strong><p>সাইজ: ${escapeHTML(itemSize)} · কালার/ডিজাইন: ${escapeHTML(itemVariant || "N/A")}</p><p>পরিমাণ: ${escapeHTML(itemQty)} · একক মূল্য: ${money(item.price)} · মোট: ${money(Number(item.price || 0) * Number(itemQty))}</p></div></div>`;
          }).join("")
        : "পণ্যের বিস্তারিত পাওয়া যায়নি";
      const subtotal = money(order.subtotal ?? (Array.isArray(order.items) ? order.items.reduce((sum,item)=>sum + Number(item.price||0)*Number(item.qty||item.quantity||1),0) : 0));
      const shipping = money(order.shippingCharge || 0);
      const codFee = 0;
      const total = money(order.total || order.totalAmount || order.amount || 0);

      return `
        <article class="data-card order-card">
          <h3>Order #${escapeHTML(id)}</h3>
          <p>Customer: ${customer}</p>
          <p>Phone: ${phone}</p>
          <p>Address: ${address}</p>
          <div><strong>অর্ডার করা পণ্য:</strong>${itemsHTML}</div>
          <p>ডেলিভারি এলাকা: ${escapeHTML(order.deliveryArea || "পুরোনো অর্ডার")}</p><p>Payment Method: ${escapeHTML(order.paymentMethod || "Not specified")}</p><p>পণ্যের মূল্য: ${subtotal} · ডেলিভারি: ${shipping}</p>
          ${order.paymentMethod === "bKash" || order.paymentMethod === "Nagad"
            ? `<p>Transaction ID: <strong>${escapeHTML(order.transactionId || "Not provided")}</strong></p>`
            : ""}
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
   12. DELETE ALL CUSTOMER ORDERS
================================= */

const deleteAllOrdersBtn = $("delete-all-orders");
deleteAllOrdersBtn?.addEventListener("click", async () => {
  const firstConfirm = confirm("আপনি কি নিশ্চিত? ওয়েবসাইটের সব Customer Order স্থায়ীভাবে মুছে যাবে। Products বা Settings মুছবে না।");
  if (!firstConfirm) return;

  const confirmationText = prompt('স্থায়ীভাবে ডিলিট করতে লিখুন: DELETE ALL ORDERS');
  if (confirmationText !== "DELETE ALL ORDERS") {
    alert("নিশ্চিতকরণ মেলেনি। কোনো অর্ডার ডিলিট করা হয়নি।");
    return;
  }

  deleteAllOrdersBtn.disabled = true;
  try {
    await remove(ref(db, "orders"));
    alert("সব Customer Order ডিলিট করা হয়েছে।");
  } catch (error) {
    alert("Orders delete failed: " + firebaseError(error));
  } finally {
    deleteAllOrdersBtn.disabled = false;
  }
});

/* =================================
   13. UPDATE ORDER STATUS
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
    bannerImages = Array.isArray(settings.bannerImages) ? settings.bannerImages : [];
    renderBannerImageList();

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
