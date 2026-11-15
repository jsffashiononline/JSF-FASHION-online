
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
const customerList = $("admin-customers");
const customerSearch = $("customer-search");
let cachedOrderEntries = [];

const settingsForm = $("settings-form");
const settingsMessage = $("settings-message");
const websiteLogoFile = $("website-logo-file");
const websiteLogoPreview = $("website-logo-preview");
const websiteLogoPlaceholder = $("website-logo-placeholder");
const websiteLogoButton = $("upload-website-logo");
const resetWebsiteLogoButton = $("reset-website-logo");
const websiteLogoMessage = $("website-logo-message");
let currentWebsiteLogoUrl = "";

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

function showAdminConfirm(message, title = "আপনি কি নিশ্চিত?", confirmLabel = "হ্যাঁ, ডিলিট করুন") {
  const modal = $("admin-confirm-modal");
  const messageEl = $("admin-confirm-message");
  const titleEl = $("admin-confirm-title");
  const cancelButton = $("admin-confirm-cancel");
  const okButton = $("admin-confirm-ok");
  if (!modal || !messageEl || !titleEl || !cancelButton || !okButton) {
    return Promise.resolve(false);
  }
  titleEl.textContent = title;
  messageEl.textContent = message;
  okButton.textContent = confirmLabel;
  modal.classList.remove("hidden");
  return new Promise(resolve => {
    const close = value => {
      modal.classList.add("hidden");
      cancelButton.removeEventListener("click", onCancel);
      okButton.removeEventListener("click", onConfirm);
      modal.removeEventListener("click", onBackdrop);
      resolve(value);
    };
    const onCancel = () => close(false);
    const onConfirm = () => close(true);
    const onBackdrop = event => { if (event.target === modal) close(false); };
    cancelButton.addEventListener("click", onCancel);
    okButton.addEventListener("click", onConfirm);
    modal.addEventListener("click", onBackdrop);
  });
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
    if (!(await showAdminConfirm("এই Banner Image ওয়েবসাইটের Slider থেকে সরাতে চান?", "Banner Image সরাবেন?", "হ্যাঁ, সরান"))) return;
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
  const adminAvatar = $("admin-profile-avatar");
  if (adminAvatar) { adminAvatar.textContent = ""; adminAvatar.style.backgroundImage = user.photoURL ? `url("${user.photoURL}")` : "none"; adminAvatar.classList.toggle("has-photo", !!user.photoURL); if (!user.photoURL) adminAvatar.textContent = "JSF"; }

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
   PRODUCT COLORS
================================= */
const variantEditor = $("variant-editor");
const variantList = $("product-variant-list");
if (!variantEditor || !variantList) throw new Error("Product color editor is missing from admin.html");
if (productImageInput) productImageInput.required = false;

if (productImageInput) productImageInput.required = false;

function defaultColorHex(name) {
  const key = String(name || "").trim().toLowerCase();
  const colors = {black:"#111111",white:"#ffffff",red:"#e53935",blue:"#1565c0",navy:"#061b49",green:"#2e7d32",yellow:"#fdd835",pink:"#f48fb1",grey:"#808080",gray:"#808080",maroon:"#800000",purple:"#7b1fa2",orange:"#ef6c00",brown:"#795548"};
  return colors[key] || "#777777";
}
function addVariantEditorCard(variant = {}) {
  const card = document.createElement("article");
  card.className = "variant-editor-card color-only-card";
  card.innerHTML = `
    <label>কালারের নাম</label>
    <input class="variant-name" maxlength="50" placeholder="যেমন: Black" value="${escapeHTML(variant.name || variant.color || "")}">
    <label>কালার</label>
    <input class="variant-color" type="color" value="${/^#[0-9a-f]{6}$/i.test(variant.colorHex || "") ? variant.colorHex : defaultColorHex(variant.name || variant.color || "")}">
    <button type="button" class="small-btn delete" data-remove-variant>REMOVE</button>`;
  variantList.appendChild(card);
}
$("bulk-add-product-colors").addEventListener("click", () => {
  const input = $("bulk-product-colors");
  const names = [...new Set(input.value.split(/[，,\n]+/).map(name => name.trim()).filter(Boolean))];
  if (!names.length) {
    showMessage(productMessage, "কালারের নাম লিখুন।", "error");
    return;
  }
  const existing = new Set(Array.from(variantList.querySelectorAll(".variant-name")).map(field => field.value.trim().toLowerCase()));
  let added = 0;
  names.forEach(name => {
    if (existing.has(name.toLowerCase())) return;
    addVariantEditorCard({name, colorHex:defaultColorHex(name)});
    existing.add(name.toLowerCase());
    added++;
  });
  input.value = "";
  showMessage(productMessage, added ? added + " টি কালার যোগ হয়েছে।" : "এই কালারগুলো আগে থেকেই আছে।", added ? "success" : "error");
});
variantList.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-variant]");
  if (button) button.closest(".color-only-card").remove();
});
function collectProductVariants() {
  return Array.from(variantList.querySelectorAll(".color-only-card")).map(card => ({
    name: card.querySelector(".variant-name").value.trim(),
    colorHex: card.querySelector(".variant-color").value
  })).filter(item => item.name);
}
$("save-product-colors").addEventListener("click", async () => {
  const id = $("product-id").value.trim();
  const variants = collectProductVariants();
  const status = $("color-save-status");
  if (!id) {
    productForm.requestSubmit();
    return;
  }
  if (variants.some(item => !item.name)) {
    showMessage(productMessage, "প্রতিটি কালারের নাম লিখুন।", "error");
    return;
  }
  const button = $("save-product-colors");
  button.disabled = true;
  try {
    await update(ref(db, "products/" + id), {
      variants,
      sizes: $("product-sizes").value.trim(),
      updatedAt: Date.now()
    });
    status.textContent = "কালার সফলভাবে সেভ হয়েছে।";
    showMessage(productMessage, "Product colors সফলভাবে Save হয়েছে।", "success");
  } catch (error) {
    showMessage(productMessage, "কালার Save হয়নি: " + firebaseError(error), "error");
  } finally {
    button.disabled = false;
  }
});
function loadProductVariants(variants) {
  variantList.innerHTML = "";
  (Array.isArray(variants) ? variants : []).forEach(addVariantEditorCard);
}

/* =================================
   MORE DESIGN — SAME PRODUCT, SAME PRICE
================================= */
const moreDesignInput = $("more-design-files");
const moreDesignButton = $("upload-more-designs");
const moreDesignList = $("more-design-list");
const moreDesignStatus = $("more-design-status");
let moreDesignImages = [];

function renderMoreDesigns() {
  if (!moreDesignList) return;
  moreDesignList.innerHTML = moreDesignImages.length
    ? moreDesignImages.map((item, index) => `
      <article class="variant-editor-card" style="display:flex;align-items:center;gap:12px">
        <img src="${escapeHTML(item.image)}" alt="More Design ${index + 1}" style="width:76px;height:86px;object-fit:cover;border-radius:7px">
        <div style="flex:1"><strong>Design ${index + 1}</strong><p class="muted">মূল প্রোডাক্টের একই দাম</p></div>
        <button type="button" class="small-btn delete" data-remove-more-design="${index}">REMOVE</button>
      </article>`).join("")
    : '<p class="muted">এখনো কোনো More Design যোগ করা হয়নি।</p>';
}

if (moreDesignList) {
  moreDesignList.addEventListener("click", async event => {
    const button = event.target.closest("[data-remove-more-design]");
    if (!button) return;
    const id = $("product-id").value.trim();
    if (!id) return;
    const index = Number(button.dataset.removeMoreDesign);
    const next = moreDesignImages.filter((_, i) => i !== index);
    try {
      await update(ref(db, "products/" + id), {moreDesigns: next, updatedAt: Date.now()});
      moreDesignImages = next;
      renderMoreDesigns();
      showMessage(moreDesignStatus, "ডিজাইন সরানো হয়েছে।", "success");
    } catch (error) {
      showMessage(moreDesignStatus, "ডিজাইন সরানো যায়নি: " + firebaseError(error), "error");
    }
  });
}

if (moreDesignButton && moreDesignInput) {
  moreDesignButton.addEventListener("click", async () => {
    const id = $("product-id").value.trim();
    const files = Array.from(moreDesignInput.files || []);
    if (!id) {
      showMessage(moreDesignStatus, "প্রথমে প্রোডাক্ট Save করুন, তারপর Edit করে More Design যোগ করুন।", "error");
      return;
    }
    if (!files.length) {
      showMessage(moreDesignStatus, "প্রথমে ডিজাইনের ছবি নির্বাচন করুন।", "error");
      return;
    }
    if (moreDesignImages.length + files.length > 12) {
      showMessage(moreDesignStatus, "একটি প্রোডাক্টে সর্বোচ্চ ১২টি More Design রাখা যাবে।", "error");
      return;
    }
    const invalid = files.find(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 10*1024*1024);
    if (invalid) {
      showMessage(moreDesignStatus, "শুধু JPG, PNG, WEBP এবং প্রতিটি ছবি ১০ MB-এর কম হতে হবে।", "error");
      return;
    }
    moreDesignButton.disabled = true;
    moreDesignButton.textContent = "UPLOADING...";
    try {
      const uploaded = [];
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        data.append("folder", "jsf-fashion-more-designs");
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {method:"POST", body:data});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Cloudinary upload failed.");
        uploaded.push({name:"Design " + (moreDesignImages.length + uploaded.length + 1), image:result.secure_url});
      }
      const next = [...moreDesignImages, ...uploaded];
      await update(ref(db, "products/" + id), {moreDesigns:next, updatedAt:Date.now()});
      moreDesignImages = next;
      renderMoreDesigns();
      moreDesignInput.value = "";
      showMessage(moreDesignStatus, uploaded.length + " টি More Design সফলভাবে Save হয়েছে।", "success");
    } catch (error) {
      showMessage(moreDesignStatus, "আপলোড/সেভ হয়নি: " + firebaseError(error), "error");
    } finally {
      moreDesignButton.disabled = false;
      moreDesignButton.textContent = "UPLOAD MORE DESIGN";
    }
  });
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
  const firstVariantImage = "";
  const product = {
    name: $("product-name").value.trim(),
    price: Number($("product-price").value),
    category: $("product-category").value.trim(),
    image: $("product-image").value.trim() || firstVariantImage,
    images: productGalleryImages.length ? [...productGalleryImages] : ($("product-image").value.trim() ? [$("product-image").value.trim()] : []),
    sizes: $("product-sizes").value.trim(),
    description: $("product-description").value.trim(),
    variants,
    updatedAt: Date.now()
  };
  if (variants.some(item => !item.name)) {
    showMessage(productMessage, "প্রতিটি কালারের নাম লিখুন।", "error");
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
    moreDesignImages = [];
    renderMoreDesigns();
    if (moreDesignStatus) moreDesignStatus.textContent = "";

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
      moreDesignImages = Array.isArray(product.moreDesigns) ? [...product.moreDesigns] : [];
      renderMoreDesigns();
      if (moreDesignStatus) moreDesignStatus.textContent = moreDesignImages.length + " টি সংরক্ষিত ডিজাইন";

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
    const confirmed = await showAdminConfirm("আপনি কি এই Product স্থায়ীভাবে Delete করতে চান?", "Product Delete");
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
  moreDesignImages = [];
  renderMoreDesigns();
  if (moreDesignStatus) moreDesignStatus.textContent = "";
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

  onValue(ordersRef, async (snapshot) => {
    const orders = snapshot.val() || {};
    let entries = Object.entries(orders);
    const ownerUids = [...new Set(entries.map(([, order]) => order.ownerUid).filter(Boolean))];
    const snapshots = await Promise.all(ownerUids.map(async uid => {
      try { return [uid, (await get(ref(db, "userOrders/" + uid))).val() || {}]; }
      catch (error) { console.warn("Customer cancellation data unavailable:", uid, error); return [uid, {}]; }
    }));
    const summaries = new Map(snapshots);
    entries = entries.map(([id, order]) => [id, { ...order, cancelRequest: summaries.get(order.ownerUid)?.[id]?.cancelRequest || order.cancelRequest || null }]);
    cachedOrderEntries = entries;
    renderCustomers(entries);

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
            const itemVariant = [item.color || item.variant || item.selectedColor || "", item.design ? "More Design: " + item.design : ""].filter(Boolean).join(" · ");
            const itemQty = item.qty || item.quantity || 1;
            const savedProduct = catalogProducts[item.id] || {};
            const matchingVariant = Array.isArray(savedProduct.variants)
              ? savedProduct.variants.find(variant => String(variant.name || "") === String(item.color || item.variant || ""))
              : null;
            const rawItemPrice = item.price ?? item.productPrice ?? item.unitPrice ??
              matchingVariant?.price ?? savedProduct.price ?? 0;
            const itemPrice = Number.isFinite(Number(rawItemPrice)) ? Number(rawItemPrice) : 0;
            const itemImage = item.image || item.images?.[0] ||
              matchingVariant?.images?.[0] || matchingVariant?.image ||
              savedProduct.images?.[0] || savedProduct.image || "";
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.12)">${itemImage ? `<img src="${escapeHTML(itemImage)}" alt="${escapeHTML(itemName)}" loading="lazy" style="width:76px;height:86px;object-fit:cover;border-radius:8px;background:#fff">` : `<div style="width:76px;height:86px;display:grid;place-items:center;background:#26344d;border-radius:8px;font-size:11px">No Image</div>`}<div><strong>${escapeHTML(itemName)}</strong><p>সাইজ: ${escapeHTML(itemSize)} · কালার/ডিজাইন: ${escapeHTML(itemVariant || "N/A")}</p><p>পরিমাণ: ${escapeHTML(itemQty)} · একক মূল্য: ${money(itemPrice)} · মোট: ${money(itemPrice * Number(itemQty))}</p></div></div>`;
          }).join("")
        : "পণ্যের বিস্তারিত পাওয়া যায়নি";
      const customerReferenceImage = order.customerReferenceImage || order.referenceImage || "";
      const customerReferenceImageHTML = customerReferenceImage
        ? `<div class="customer-reference-admin" style="margin:12px 0;padding:12px;border:1px solid rgba(223,185,87,.35);border-radius:10px">
            <strong>কাস্টমারের পছন্দের প্রোডাক্টের ছবি:</strong>
            <a href="${escapeHTML(customerReferenceImage)}" target="_blank" rel="noopener noreferrer">
              <img src="${escapeHTML(customerReferenceImage)}" alt="Customer product reference" loading="lazy" style="display:block;width:min(220px,100%);aspect-ratio:1/1;object-fit:cover;border-radius:8px;margin-top:8px">
            </a>
          </div>` : "";
      const subtotalAmount = Number(order.subtotal ?? (Array.isArray(order.items) ? order.items.reduce((sum,item)=>sum + Number(item.price||0)*Number(item.qty||item.quantity||1),0) : 0));
      const shippingAmount = Number(order.shippingCharge ?? 0);
      const codFeeAmount = Number(order.codFee ?? 0);
      const calculatedTotal = subtotalAmount + shippingAmount + codFeeAmount;
      const savedTotal = Number(order.total ?? order.totalAmount ?? order.amount);
      const totalAmount = Number.isFinite(savedTotal) && savedTotal > 0 ? savedTotal : calculatedTotal;
      const subtotal = money(subtotalAmount);
      const shipping = money(shippingAmount);
      const codFee = money(codFeeAmount);
      const total = money(totalAmount);

      return `
        <article class="data-card order-card">
          <h3>Order #${escapeHTML(id)}</h3>
          <p>Customer: ${customer}</p>
          <p>Phone: ${phone}</p>
          <p>Address: ${address}</p>
          <div><strong>অর্ডার করা পণ্য:</strong>${itemsHTML}</div>
          ${customerReferenceImageHTML}
          <p>ডেলিভারি এলাকা: ${escapeHTML(order.deliveryArea || "পুরোনো অর্ডার")}</p>
          <p>Payment Method: ${escapeHTML(order.paymentMethod || "Not specified")}</p>
          <div class="order-price-breakdown" style="margin:14px 0;padding:14px;border:1px solid rgba(223,185,87,.35);border-radius:10px;background:rgba(223,185,87,.06)">
            <p style="display:flex;justify-content:space-between;gap:12px;margin:4px 0"><span>পণ্যের মূল্য</span><strong>${subtotal}</strong></p>
            <p style="display:flex;justify-content:space-between;gap:12px;margin:4px 0"><span>ডেলিভারি চার্জ</span><strong>${shipping}</strong></p>
            ${codFeeAmount > 0 ? `<p style="display:flex;justify-content:space-between;gap:12px;margin:4px 0"><span>অতিরিক্ত চার্জ</span><strong>${codFee}</strong></p>` : ""}
            <p style="display:flex;justify-content:space-between;gap:12px;margin:10px 0 0;padding-top:10px;border-top:1px solid rgba(223,185,87,.35);font-size:17px"><strong>সর্বমোট</strong><strong>${total}</strong></p>
          </div>
          ${order.paymentMethod === "bKash" || order.paymentMethod === "Nagad"
            ? `<p>Transaction ID: <strong>${escapeHTML(order.transactionId || "Not provided")}</strong></p>`
            : ""}

          ${order.cancelRequest?.requested ? `
            <section class="cancel-request-admin" style="margin:14px 0;padding:13px;border:1px solid #dfb957;border-radius:9px;background:rgba(223,185,87,.08)">
              <strong>কাস্টমারের Cancel Request — ${escapeHTML(order.cancelRequest.status || "Requested")}</strong>
              <p style="margin:8px 0"><strong>কারণ:</strong> ${escapeHTML(order.cancelRequest.reason || "কারণ উল্লেখ করা হয়নি")}</p>
              <p class="muted">Request time: ${order.cancelRequest.requestedAt ? new Date(Number(order.cancelRequest.requestedAt)).toLocaleString("en-GB") : "N/A"}</p>
              ${order.cancelRequest.status === "Requested" ? `
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                  <button type="button" class="small-btn" data-cancel-decision="Accepted" data-order-cancel-id="${escapeHTML(id)}">ACCEPT & CANCEL ORDER</button>
                  <button type="button" class="small-btn delete" data-cancel-decision="Rejected" data-order-cancel-id="${escapeHTML(id)}">REJECT REQUEST</button>
                </div>` : `<p><strong>Decision:</strong> ${escapeHTML(order.cancelRequest.status)}</p>`}
            </section>` : "" }
          <label for="status-${escapeHTML(id)}">Order Status</label>

          <select class="order-status" id="status-${escapeHTML(id)}" data-order-id="${escapeHTML(id)}">${options}</select>
          <label>Courier Tracking URL (কুরিয়ারের লিংক)</label>
          <input type="url" data-tracking-input value="${escapeHTML(order.trackingUrl || "")}" placeholder="https://courier-tracking-link..." style="width:100%;padding:10px;margin:6px 0">
          <button type="button" class="small-btn" data-save-tracking="${escapeHTML(id)}">SAVE TRACKING LINK</button>
          <p class="order-update-message" role="status"></p>
          <button type="button" class="small-btn delete" data-delete-order="${escapeHTML(id)}">DELETE THIS ORDER</button>
        </article>
      `;
    }).join("");

  }, (error) => {
    console.error("Orders error:", error);
    orderList.textContent = "Orders load failed: " + error.message;
  });
}



async function renderCustomers(entries = cachedOrderEntries) {
  if (!customerList) return;
  const customers = new Map();
  entries.forEach(([orderId, order]) => {
    const phone = String(order.phone || order.mobile || "").trim();
    const name = String(order.customerName || order.name || "Customer").trim();
    const key = phone || name.toLowerCase();
    const current = customers.get(key) || {
      name,
      phone: phone || "Not provided",
      address: String(order.address || "Not provided"),
      orders: 0,
      total: 0,
      latest: 0,
      uid: String(order.ownerUid || "")
    };
    current.orders += 1;
    current.total += Number(order.total || order.totalAmount || order.amount || 0);
    current.latest = Math.max(current.latest, Number(order.createdAt || 0));
    if (order.createdAt && Number(order.createdAt) >= current.latest) {
      current.name = name;
      current.address = String(order.address || current.address);
    }
    if (order.ownerUid) current.uid = String(order.ownerUid);
    customers.set(key, current);
  });
  const query = String(customerSearch?.value || "").trim().toLowerCase();
  const filtered = [...customers.values()].filter(customer =>
    customer.name.toLowerCase().includes(query) || customer.phone.toLowerCase().includes(query)
  ).sort((a,b) => b.latest - a.latest);
  if (!filtered.length) {
    customerList.innerHTML = '<p class="muted">কোনো কাস্টমার পাওয়া যায়নি।</p>';
    return;
  }
  customerList.innerHTML = filtered.map(customer => {
    const latest = customer.latest ? new Date(customer.latest).toLocaleDateString("en-GB") : "N/A";
    return `<article class="data-card customer-card">
      <h3>${escapeHTML(customer.name)}</h3>
      <p>Phone: <strong>${escapeHTML(customer.phone)}</strong></p>
      <p>Address: ${escapeHTML(customer.address)}</p>
      <div class="customer-summary"><span>Orders: <strong>${customer.orders}</strong></span><span>Order value: <strong>${money(customer.total)}</strong></span><span>Latest order: <strong>${latest}</strong></span></div>
    </article>`;
  }).join("");
}
if (customerSearch) customerSearch.addEventListener("input", () => renderCustomers());

/* =================================
   12. DELETE INDIVIDUAL CUSTOMER ORDER
================================= */

orderList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-delete-order]");
  if (!button) return;

  const id = button.dataset.deleteOrder;
  const confirmed = await showAdminConfirm("এই অর্ডারটি স্থায়ীভাবে ডিলিট করতে চান? অন্য অর্ডারগুলো অক্ষত থাকবে।", "অর্ডার ডিলিট করবেন?");
  if (!confirmed) return;

  button.disabled = true;
  try {
    await remove(ref(db, "orders/" + id));
  } catch (error) {
    button.disabled = false;
    alert("Order delete failed: " + firebaseError(error));
  }
});

orderList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-cancel-decision]");
  if (!button) return;
  const id = button.dataset.orderCancelId;
  const decision = button.dataset.cancelDecision;
  if (!id || !["Accepted", "Rejected"].includes(decision)) return;
  const confirmed = await showAdminConfirm(
    decision === "Accepted" ? "কাস্টমারের কারণ পর্যালোচনা করে অর্ডারটি বাতিল করবেন?" : "এই Cancel Request প্রত্যাখ্যান করবেন?",
    decision === "Accepted" ? "Cancel Request গ্রহণ" : "Cancel Request প্রত্যাখ্যান",
    decision === "Accepted" ? "হ্যাঁ, অর্ডার বাতিল করুন" : "হ্যাঁ, Reject করুন"
  );
  if (!confirmed) return;
  button.disabled = true;
  try {
    const orderData = (await get(ref(db, "orders/" + id))).val();
    if (!orderData?.ownerUid) throw new Error("এই অর্ডারের Customer Account সংযুক্ত নেই।");
    const orderRef = ref(db, "userOrders/" + orderData.ownerUid + "/" + id);
    const summary = (await get(orderRef)).val() || {};
    if (!summary.cancelRequest?.requested || summary.cancelRequest.status !== "Requested") throw new Error("এই Cancel Request আর Pending নেই।");
    const now = Date.now();
    const updates = {
      ["userOrders/" + orderData.ownerUid + "/" + id + "/cancelRequest"]: { ...summary.cancelRequest, status: decision, reviewedAt: now },
      ["orders/" + id + "/updatedAt"]: now
    };
    if (decision === "Accepted") {
      updates["orders/" + id + "/status"] = "Cancelled";
      updates["userOrders/" + orderData.ownerUid + "/" + id + "/status"] = "Cancelled";
    }
    await update(ref(db), updates);
  } catch (error) {
    alert("Cancel request update failed: " + firebaseError(error));
    button.disabled = false;
  }
});

/* =================================
   13. UPDATE ORDER STATUS
================================= */

orderList.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-order-id]");
  if (!select) return;
  const id = select.dataset.orderId, status = select.value;
  try {
    const snap = await get(ref(db, "orders/" + id));
    const orderData = snap.val();
    if (!orderData) throw new Error("অর্ডারটি পাওয়া যায়নি।");
    const updatedAt = Date.now(), updates = {};
    updates["orders/" + id + "/status"] = status;
    updates["orders/" + id + "/updatedAt"] = updatedAt;
    if (orderData.ownerUid) {
      const summaryRef = ref(db, "userOrders/" + orderData.ownerUid + "/" + id);
      const oldSummary = (await get(summaryRef)).val() || {};
      updates["userOrders/" + orderData.ownerUid + "/" + id] = {
        ...oldSummary, orderId:id,
        orderCode:oldSummary.orderCode || id.slice(-8).toUpperCase(),
        customerName:orderData.customerName || orderData.name || "Customer",
        phone:orderData.phone || orderData.mobile || "",
        total:Number(orderData.total || orderData.totalAmount || orderData.amount || 0),
        status, createdAt:Number(orderData.createdAt || updatedAt), updatedAt,
        items:Array.isArray(orderData.items) ? orderData.items.map(item => ({
          id:item.id || "", name:item.name || item.productName || "Product",
          image:item.image || item.images?.[0] || "", qty:Number(item.qty || item.quantity || 1),
          price:Number(item.price ?? item.productPrice ?? item.unitPrice ?? 0),
          size:item.size || item.selectedSize || "", color:item.color || item.variant || item.selectedColor || ""
        })) : [],
        ...(orderData.trackingUrl ? {trackingUrl:orderData.trackingUrl} : {})
      };
    }
    await update(ref(db), updates);
    const note=select.closest(".order-card")?.querySelector(".order-update-message");
    if(note) note.textContent="অর্ডারের স্ট্যাটাস কাস্টমার অ্যাকাউন্টে আপডেট হয়েছে।";
  } catch(error) { alert("Order update failed: " + firebaseError(error)); }
});

orderList.addEventListener("click", async (event) => {
  const button=event.target.closest("button[data-save-tracking]");
  if(!button) return;
  const id=button.dataset.saveTracking, card=button.closest(".order-card");
  const input=card?.querySelector("[data-tracking-input]");
  const rawUrl=String(input?.value || "").trim();
  let parsed;
  try { parsed=new URL(rawUrl); } catch { alert("সঠিক Tracking URL দিন।"); return; }
  if(!["https:","http:"].includes(parsed.protocol)) { alert("শুধু http/https Tracking URL দেওয়া যাবে।"); return; }
  button.disabled=true;
  try {
    const snap=await get(ref(db,"orders/"+id)), orderData=snap.val();
    if(!orderData) throw new Error("অর্ডার পাওয়া যায়নি।");
    const updates={["orders/"+id+"/trackingUrl"]:parsed.href,["orders/"+id+"/updatedAt"]:Date.now()};
    if(orderData.ownerUid) {
      const summaryRef=ref(db,"userOrders/"+orderData.ownerUid+"/"+id);
      const old=(await get(summaryRef)).val() || {};
      updates["userOrders/"+orderData.ownerUid+"/"+id]={
        ...old, orderId:id, orderCode:old.orderCode || id.slice(-8).toUpperCase(),
        customerName:old.customerName || orderData.customerName || orderData.name || "Customer",
        phone:old.phone || orderData.phone || orderData.mobile || "",
        total:Number(old.total ?? orderData.total ?? orderData.totalAmount ?? orderData.amount ?? 0),
        status:orderData.status || "Pending", createdAt:Number(old.createdAt || orderData.createdAt || Date.now()),
        items:old.items || (Array.isArray(orderData.items) ? orderData.items.map(item=>({
          id:item.id || "", name:item.name || item.productName || "Product",
          image:item.image || item.images?.[0] || "", qty:Number(item.qty || item.quantity || 1),
          price:Number(item.price ?? item.productPrice ?? item.unitPrice ?? 0),
          size:item.size || item.selectedSize || "", color:item.color || item.variant || item.selectedColor || ""
        })) : []),
        trackingUrl:parsed.href
      };
    }
    await update(ref(db),updates);
    const note=card?.querySelector(".order-update-message");
    if(note) note.textContent="Tracking link কাস্টমার অ্যাকাউন্টে পাঠানো হয়েছে।";
  } catch(error) { alert("Tracking link save failed: "+firebaseError(error)); }
  finally { button.disabled=false; }
});

/* =================================
   13. STORE SETTINGS
================================= */

function loadSettings() {
  onValue(ref(db, "settings"), (snapshot) => {
    const settings = snapshot.val() || {};

    $("bkash-number").value = settings.bkashNumber || settings.bkash || "";
    $("nagad-number").value = settings.nagadNumber || settings.nagad || "";
    $("delivery-inside-dhaka").value = settings.deliveryInsideDhaka ?? 60;
    $("delivery-outside-dhaka").value = settings.deliveryOutsideDhaka ?? 120;
    $("store-picture").value = settings.storePicture || "";
    $("whatsapp-admin-1").value = settings.whatsappAdmin1 || "";
    currentWebsiteLogoUrl = settings.logoUrl || "assets/jsf-fashion-logo.svg";
    const adminLogo = $("admin-site-logo-image");
    if (adminLogo) adminLogo.src = currentWebsiteLogoUrl;
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = currentWebsiteLogoUrl;
    if (websiteLogoPreview && websiteLogoPlaceholder) {
      if (currentWebsiteLogoUrl) {
        websiteLogoPreview.src = currentWebsiteLogoUrl;
        websiteLogoPreview.classList.remove("hidden");
        websiteLogoPlaceholder.classList.add("hidden");
      } else {
        websiteLogoPreview.removeAttribute("src");
        websiteLogoPreview.classList.add("hidden");
        websiteLogoPlaceholder.classList.remove("hidden");
      }
    }
    bannerImages = Array.isArray(settings.bannerImages) ? settings.bannerImages : [];
    renderBannerImageList();

  }, (error) => {
    console.error("Settings load error:", error);
    showMessage(settingsMessage, firebaseError(error), "error");
  });

}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const insideDeliveryCharge = Number($("delivery-inside-dhaka").value);
  const outsideDeliveryCharge = Number($("delivery-outside-dhaka").value);
  if (!Number.isFinite(insideDeliveryCharge) || insideDeliveryCharge < 0 || !Number.isFinite(outsideDeliveryCharge) || outsideDeliveryCharge < 0) {
    showMessage(settingsMessage, "ডেলিভারি চার্জ ০ বা তার বেশি সঠিক সংখ্যা হতে হবে।", "error");
    return;
  }
  const settings = {
    bkashNumber: $("bkash-number").value.trim(),
    nagadNumber: $("nagad-number").value.trim(),
    deliveryInsideDhaka: insideDeliveryCharge,
    deliveryOutsideDhaka: outsideDeliveryCharge,
    storePicture: $("store-picture").value.trim(),
    whatsappAdmin1: $("whatsapp-admin-1").value.trim(),
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


if (websiteLogoFile && websiteLogoButton) {
  const uploadSelectedWebsiteLogo = async () => {
    const file = websiteLogoFile.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      websiteLogoFile.value = "";
      showMessage(websiteLogoMessage, "একটি ছবি নির্বাচন করুন (সর্বোচ্চ ৫ MB)।", "error");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (websiteLogoPreview && websiteLogoPlaceholder) {
      websiteLogoPreview.src = previewUrl;
      websiteLogoPreview.classList.remove("hidden");
      websiteLogoPlaceholder.classList.add("hidden");
      websiteLogoPreview.onload = () => URL.revokeObjectURL(previewUrl);
    }
    websiteLogoButton.disabled = true;
    websiteLogoButton.textContent = "আপলোড হচ্ছে...";
    showMessage(websiteLogoMessage, "গ্যালারি থেকে নির্বাচিত Logo আপলোড হচ্ছে...");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("folder", "jsf-fashion-brand");
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {method:"POST", body:data});
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Logo upload failed.");
      await update(ref(db, "settings"), {logoUrl: result.secure_url, updatedAt: Date.now()});
      currentWebsiteLogoUrl = result.secure_url;
      const adminLogo = $("admin-site-logo-image");
      if (adminLogo) adminLogo.src = currentWebsiteLogoUrl;
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.href = currentWebsiteLogoUrl;
      if (websiteLogoPreview) websiteLogoPreview.src = currentWebsiteLogoUrl;
      if (websiteLogoPlaceholder) websiteLogoPlaceholder.classList.add("hidden");
      websiteLogoFile.value = "";
      showMessage(websiteLogoMessage, "গ্যালারি থেকে Logo আপলোড ও প্রয়োগ হয়েছে।", "success");
    } catch (error) {
      console.error("Website logo upload error:", error);
      showMessage(websiteLogoMessage, "Logo পরিবর্তন হয়নি: " + (error.message || "আবার চেষ্টা করুন।"), "error");
    } finally {
      websiteLogoButton.disabled = false;
      websiteLogoButton.textContent = "📁 গ্যালারি থেকে Logo নির্বাচন করুন";
    }
  };
  websiteLogoButton.addEventListener("click", () => websiteLogoFile.click());
  websiteLogoFile.addEventListener("change", uploadSelectedWebsiteLogo);
}
if (resetWebsiteLogoButton) {
  resetWebsiteLogoButton.addEventListener("click", async () => {
    resetWebsiteLogoButton.disabled = true;
    try {
      await update(ref(db, "settings"), {logoUrl: "", updatedAt: Date.now()});
      currentWebsiteLogoUrl = "assets/jsf-fashion-logo.svg";
      const adminLogo = $("admin-site-logo-image");
      if (adminLogo) adminLogo.src = currentWebsiteLogoUrl;
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.href = currentWebsiteLogoUrl;
      if (websiteLogoPreview) {
        websiteLogoPreview.src = currentWebsiteLogoUrl;
        websiteLogoPreview.classList.remove("hidden");
      }
      if (websiteLogoPlaceholder) websiteLogoPlaceholder.classList.add("hidden");
      if (websiteLogoFile) websiteLogoFile.value = "";
      showMessage(websiteLogoMessage, "ডিফল্ট JSF FASHION Logo ফিরিয়ে আনা হয়েছে।", "success");
    } catch (error) {
      showMessage(websiteLogoMessage, "ডিফল্ট Logo ফেরানো যায়নি: " + (error.message || "আবার চেষ্টা করুন।"), "error");
    } finally {
      resetWebsiteLogoButton.disabled = false;
    }
  });
}
