(() => {
  "use strict";
  const auth = window.firebase?.auth?.();
  const db = window.db;
  const CLOUDINARY_CLOUD_NAME = "phvmgyj9";
  const CLOUDINARY_UPLOAD_PRESET = "jsf_fashion_upload";
  const $ = id => document.getElementById(id);
  if (!auth || !db) {
    $("account-auth").innerHTML = '<section class="account-panel"><h2>Connection unavailable</h2><p>Firebase connection পাওয়া যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।</p></section>';
    return;
  }
  const message = (id, text, error = true) => {
    const el = $(id);
    if (el) { el.textContent = text; el.style.color = error ? "#9b2c2c" : "#187344"; }
  };
  const friendly = error => ({
    "auth/email-already-in-use":"এই Email দিয়ে আগে Account খোলা হয়েছে।",
    "auth/invalid-email":"সঠিক Email Address দিন।",
    "auth/weak-password":"Password কমপক্ষে ৬ অক্ষরের হতে হবে।",
    "auth/invalid-credential":"Email অথবা Password সঠিক নয়।",
    "auth/too-many-requests":"অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    "auth/network-request-failed":"Internet connection পরীক্ষা করুন।",
    "auth/requires-recent-login":"নিরাপত্তার জন্য আবার Login করে চেষ্টা করুন।"
  }[error.code] || error.message || "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sendPasswordLink = async target => {
    const user = auth.currentUser;
    if (!user?.email) return message(target, "এই অ্যাকাউন্টে Email পাওয়া যায়নি।");
    try {
      await auth.sendPasswordResetEmail(user.email);
      message(target, "Password পরিবর্তনের নিরাপদ Link আপনার Email-এ পাঠানো হয়েছে। Inbox/Spam পরীক্ষা করুন।", false);
    } catch (error) { message(target, friendly(error)); }
  };

  $("account-login").addEventListener("submit", async event => {
    event.preventDefault(); message("login-message", "Login হচ্ছে...", false);
    try { await auth.signInWithEmailAndPassword($("login-email").value.trim(), $("login-password").value); }
    catch (error) { message("login-message", friendly(error)); }
  });
  $("account-register").addEventListener("submit", async event => {
    event.preventDefault(); message("register-message", "Account তৈরি হচ্ছে...", false);
    const name = $("register-name").value.trim(), phone = $("register-phone").value.trim();
    try {
      const credential = await auth.createUserWithEmailAndPassword($("register-email").value.trim(), $("register-password").value);
      try {
        await credential.user.updateProfile({ displayName: name });
        await db.ref("customerProfiles/" + credential.user.uid).set({ name, phone, address: "", email: credential.user.email, photoURL: credential.user.photoURL || "", updatedAt: Date.now() });
        message("register-message", "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। আপনি এখন লগইন আছেন।", false);
      } catch (profileError) {
        console.error("Customer profile save error:", profileError);
        message("register-message", "অ্যাকাউন্ট তৈরি হয়েছে, কিন্তু প্রোফাইল সেভ হয়নি। Profile থেকে তথ্য Save করুন।", false);
      }
    } catch (error) { console.error("Customer registration error:", error); message("register-message", friendly(error)); }
  });
  $("reset-password").addEventListener("click", async () => {
    const email = $("login-email").value.trim();
    if (!email) return message("login-message", "আগে Email লিখুন।");
    try { await auth.sendPasswordResetEmail(email); message("login-message", "Password reset link আপনার Email-এ পাঠানো হয়েছে।", false); }
    catch (error) { message("login-message", friendly(error)); }
  });
  $("dashboard-reset-password").addEventListener("click", () => sendPasswordLink("security-message"));
  $("account-profile").addEventListener("submit", async event => {
    event.preventDefault();
    const user = auth.currentUser; if (!user) return;
    try {
      const profile = {
        name: $("profile-name").value.trim(),
        phone: $("profile-phone").value.trim(),
        address: $("profile-address").value.trim(),
        email: user.email,
        updatedAt: Date.now()
      };
      await db.ref("customerProfiles/" + user.uid).update(profile);
      await user.updateProfile({ displayName: profile.name });
      message("profile-message", "প্রোফাইল ও Default Delivery Address আপডেট হয়েছে।", false);
    } catch (error) { message("profile-message", friendly(error)); }
  });
  const profilePhoto = $("customer-profile-photo");
  const profilePhotoInput = $("customer-profile-photo-file");
  const photoMessage = (text, ok = false) => {
    if (!photoMessageEl) return;
    photoMessageEl.textContent = text;
    photoMessageEl.style.color = ok ? "#187344" : "#9b2c2c";
  };
  const photoMessageEl = $("customer-photo-message");
  const showProfilePhoto = url => {
    if (!profilePhoto) return;
    if (url) {
      profilePhoto.src = url;
      profilePhoto.classList.remove("customer-profile-photo-empty");
    } else {
      profilePhoto.removeAttribute("src");
      profilePhoto.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23f5f1e5'/%3E%3Ccircle cx='50' cy='38' r='17' fill='%23c4a04a'/%3E%3Cpath d='M17 94c3-22 16-33 33-33s30 11 33 33' fill='%23c4a04a'/%3E%3C/svg%3E";
    }
  };
  if (profilePhotoInput) profilePhotoInput.addEventListener("change", async () => {
    const user = auth.currentUser, file = profilePhotoInput.files?.[0];
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) { photoMessage("শুধু ছবি নির্বাচন করুন।"); profilePhotoInput.value = ""; return; }
    if (file.size > 5 * 1024 * 1024) { photoMessage("ছবির সাইজ ৫ MB-এর কম হতে হবে।"); profilePhotoInput.value = ""; return; }
    photoMessage("ছবি আপলোড হচ্ছে...", true);
    profilePhotoInput.disabled = true;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      form.append("folder", "jsf-fashion-customer-profiles");
      const response = await fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "ছবি আপলোড করা যায়নি।");
      await db.ref("customerProfiles/" + user.uid).update({ photoURL: result.secure_url, updatedAt: Date.now() });
      await user.updateProfile({ photoURL: result.secure_url });
      showProfilePhoto(result.secure_url);
      photoMessage("প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে।", true);
    } catch (error) {
      photoMessage("ছবি আপলোড হয়নি: " + friendly(error));
    } finally {
      profilePhotoInput.disabled = false;
      profilePhotoInput.value = "";
    }
  });
  $("account-logout").addEventListener("click", () => auth.signOut());

  let orderListener = null;
  $("account-orders").addEventListener("click", async event => {
    const button = event.target.closest("[data-cancel-order]");
    if (!button) return;
    const user = auth.currentUser, orderId = button.dataset.cancelOrder;
    if (!user || !orderId || button.disabled) return;
    const card = button.closest(".account-order");
    const reasonField = card?.querySelector("[data-cancel-reason]");
    const reason = String(reasonField?.value || "").trim();
    if (reason.length < 5) {
      if (reasonField) { reasonField.focus(); reasonField.setCustomValidity("কমপক্ষে ৫ অক্ষরে কারণ লিখুন।"); reasonField.reportValidity(); }
      return;
    }
    button.disabled = true; button.textContent = "Sending...";
    try {
      await db.ref("userOrders/" + user.uid + "/" + orderId).update({
        cancelRequest: { requested: true, reason, requestedAt: Date.now(), status: "Requested" }
      });
    } catch (error) {
      button.disabled = false; button.textContent = "SEND CANCEL REQUEST";
      const note = card?.querySelector(".account-cancel-note");
      if (note) note.textContent = "Request পাঠানো যায়নি: " + friendly(error);
    }
  });
  $("account-orders").addEventListener("input", event => {
    const field = event.target.closest("[data-cancel-reason]");
    if (field) field.setCustomValidity("");
  });

  auth.onAuthStateChanged(async user => {
    $("account-auth").classList.toggle("account-hidden", !!user);
    $("account-dashboard").classList.toggle("account-hidden", !user);
    if (orderListener) { orderListener.off(); orderListener = null; }
    if (!user) return;
    $("profile-email").textContent = user.email || "";
    try {
      const snap = await db.ref("customerProfiles/" + user.uid).once("value");
      const profile = snap.val() || {};
      $("profile-name").value = profile.name || user.displayName || "";
      $("profile-phone").value = profile.phone || "";
      $("profile-address").value = profile.address || "";
      showProfilePhoto(profile.photoURL || user.photoURL || "");
    } catch (error) { message("profile-message", "প্রোফাইল লোড করা যায়নি: " + friendly(error)); }

    // Load only reviews authored by this signed-in customer.
    try {
      const [reviewsSnap, productsSnap] = await Promise.all([
        db.ref("reviews").once("value"),
        db.ref("products").once("value")
      ]);
      const productNames = {};
      productsSnap.forEach(child => { productNames[child.key] = child.val()?.name || "Product"; });
      const ownReviews = [];
      reviewsSnap.forEach(productNode => {
        const review = productNode.child(user.uid).val();
        if (review) ownReviews.push({ productId: productNode.key, ...review });
      });
      ownReviews.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      $("customer-reviews").innerHTML = ownReviews.length ? ownReviews.map(review =>
        '<article class="account-order"><strong>' + escapeHtml(productNames[review.productId] || "Product") +
        '</strong><p>' + "★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0))) +
        ' · ' + (Number(review.createdAt) ? new Date(Number(review.createdAt)).toLocaleDateString() : "") +
        '</p><p>' + escapeHtml(review.comment || "") + '</p></article>'
      ).join("") : '<p class="account-note">আপনি এখনো কোনো প্রোডাক্টে রিভিউ দেননি।</p>';
    } catch (error) {
      $("customer-reviews").textContent = "রিভিউ লোড করা যায়নি: " + friendly(error);
    }

    const ordersRef = db.ref("userOrders/" + user.uid).orderByChild("createdAt");
    orderListener = ordersRef;
    ordersRef.on("value", snapshot => {
      const entries = [];
      snapshot.forEach(child => entries.push({ id: child.key, ...(child.val() || {}) }));
      entries.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      $("account-orders").innerHTML = entries.length ? entries.map(order => {
        const status = String(order.status || "Pending");
        const cancelRequested = !!order.cancelRequest?.requested;
        const canCancel = status.toLowerCase() === "pending" && !cancelRequested;
        return '<article class="account-order">' +
          '<strong>Order #' + escapeHtml(order.orderCode || order.id.slice(-8).toUpperCase()) + '</strong>' +
          '<p>' + (Number(order.createdAt) ? new Date(Number(order.createdAt)).toLocaleString() : "Date unavailable") +
          ' · ৳' + Number(order.total || 0).toLocaleString("en-BD") + '</p>' +
          '<span class="account-status">Order Status: ' + escapeHtml(status) + '</span>' +
          (Array.isArray(order.items) && order.items.length ? '<div class="account-order-items"><strong>আপনার অর্ডার করা পণ্য:</strong>' + order.items.map(item => '<div class="account-order-item">' + (item.image ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name || "Product") + '">' : '') + '<div><strong>' + escapeHtml(item.name || "Product") + '</strong><p>পরিমাণ: ' + Number(item.qty || 1) + ' · সাইজ: ' + escapeHtml(item.size || "N/A") + ' · কালার: ' + escapeHtml(item.color || "N/A") + '</p><p>একক মূল্য: ৳' + Number(item.price || 0).toLocaleString("en-BD") + '</p></div></div>').join("") + '</div>' : '<p class="account-note">এই অর্ডারের পণ্যের বিস্তারিত এখনো পাওয়া যায়নি।</p>') +
          (order.trackingUrl ? '<p class="account-tracking"><strong>কুরিয়ার ট্র্যাকিং:</strong> <a href="' + escapeHtml(order.trackingUrl) + '" target="_blank" rel="noopener noreferrer">TRACK YOUR PARCEL</a></p>' : (status.toLowerCase() === "shipped" ? '<p class="account-note">অর্ডার শিপড হয়েছে। কুরিয়ার Tracking Link এখনো যোগ করা হয়নি।</p>' : '')) +
          (cancelRequested ? '<div class="account-cancel-note"><strong>Cancel Request: ' + escapeHtml(order.cancelRequest.status || "Requested") + '</strong><p>আপনার কারণ: ' + escapeHtml(order.cancelRequest.reason || "কারণ উল্লেখ করা হয়নি") + '</p>' + (order.cancelRequest.status === "Rejected" ? '<p>আপনার অনুরোধটি গ্রহণ করা হয়নি।</p>' : order.cancelRequest.status === "Accepted" ? '<p>আপনার অর্ডার বাতিল করা হয়েছে।</p>' : '<p>দোকানের সিদ্ধান্তের অপেক্ষায়।</p>') + '</div>' : '') +
          (canCancel ? '<div class="account-order-actions" style="display:block"><label>কেন অর্ডারটি Cancel করতে চান?</label><textarea data-cancel-reason maxlength="500" required placeholder="Cancel করার কারণ লিখুন (কমপক্ষে ৫ অক্ষর)" style="display:block;width:100%;min-height:76px;margin:7px 0;padding:10px;border:1px solid #cbd5e1;border-radius:7px"></textarea><button type="button" data-cancel-order="' + escapeHtml(order.id) + '">SEND CANCEL REQUEST</button></div>' : '') +
          '</article>';
      }).join("") : '<p class="account-note">এখনো কোনো অর্ডার পাওয়া যায়নি। নতুন অর্ডার দেওয়ার আগে এই Account-এ Login থাকা জরুরি। Login ছাড়া বা Guest হিসেবে আগে দেওয়া অর্ডার স্বয়ংক্রিয়ভাবে এখানে যুক্ত হবে না।</p>';
    }, error => { $("account-orders").textContent = "অর্ডার লোড করা যায়নি: " + friendly(error); });
  });
})();