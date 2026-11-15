JSF FASHION ONLINE — PROJECT GUIDE

প্রজেক্ট
--------
JSF FASHION-এর অনলাইন ফ্যাশন স্টোর। এই প্রজেক্টে Customer Storefront,
Checkout এবং আলাদা Admin Panel রয়েছে।

গুরুত্বপূর্ণ ফাইল
----------------
- index.html              Customer website
- order.html              Checkout page
- admin.html              Admin panel
- store.js                Storefront, cart, checkout এবং customer interactions
- admin.js                Admin dashboard এবং management functions
- firebase.js             Customer-side Firebase connection
- admin-firebase.js       Admin Firebase connection
- style.css               Main website styles
- admin.css               Admin panel styles
- premium-theme.css       Shared responsive theme
- database.rules.json     Firebase Realtime Database rules
- assets/jsf-fashion-logo.svg  Default JSF FASHION logo

পেমেন্ট পদ্ধতি
--------------
Checkout-এ শুধু এই তিনটি পদ্ধতি থাকবে:
1. bKash
2. Nagad
3. Cash on Delivery

Bank Card, Credit Card এবং Debit Card checkout-এ ব্যবহার করা হয় না।
bKash/Nagad নম্বর Admin Panel > Settings থেকে সেট করতে হবে।

লোগো পরিবর্তন
-------------
1. Admin Panel-এ অনুমোদিত Admin account দিয়ে Login করুন।
2. Settings পেজে যান।
3. Website Logo অংশে নতুন JPG, PNG অথবা WEBP logo নির্বাচন করুন।
4. Upload & Apply Logo চাপুন।
5. সফল হলে Customer website, Checkout এবং Admin header-এ লোগো দেখা যাবে।
   পরবর্তীতে একই জায়গা থেকে নতুন logo আপলোড করে বদলানো যাবে।
Default logo: assets/jsf-fashion-logo.svg

অন্যান্য Admin সুবিধা
--------------------
- Products: পণ্য যোগ, সম্পাদনা, মুছে ফেলা, ছবি, কালার, সাইজ ও More Design।
- Orders: গ্রাহকের অর্ডার দেখা, স্ট্যাটাস পরিবর্তন ও অর্ডার ম্যানেজ করা।
- Customers: অর্ডার থেকে কাস্টমার ডিরেক্টরি, নাম/ফোন সার্চ ও অর্ডার সারাংশ দেখা।
- Website Banners: হোমপেজ ব্যানার আপলোড ও ম্যানেজ করা।
- Settings: bKash/Nagad নম্বর, WhatsApp নম্বর এবং Website Logo।
- Admin Profile: অনুমোদিত Admin account-এর তথ্য।

ছবি আপলোড
----------
পণ্য, ব্যানার ও লোগোর ছবি Cloudinary unsigned upload preset দিয়ে আপলোড হয়।
বর্তমান প্রজেক্টে Cloudinary upload configuration আগে থেকেই কোডে সেট করা আছে।
Upload ব্যর্থ হলে Cloudinary account, preset এবং upload limit পরীক্ষা করতে হবে।

Firebase সেটআপ
--------------
1. Firebase Console-এ JSF FASHION project খুলুন।
2. Authentication-এ Email/Password sign-in চালু রাখুন।
3. অনুমোদিত Admin UID-গুলোর জন্য Admin account তৈরি করুন।
4. Realtime Database-এ database.rules.json-এর rules যাচাই করে Publish করুন।
5. Firebase config-এর project ID, database URL এবং app ID সঠিক কিনা নিশ্চিত করুন।

নিরাপত্তা নোট
------------
- Admin access নির্দিষ্ট UID allowlist দিয়ে সীমাবদ্ধ।
- Products এবং Settings write শুধু অনুমোদিত Admin account করতে পারে।
- Customer checkout-এ নতুন order তৈরি করার জন্য guest write অনুমোদিত।
  Firebase Rules-এ customer name, phone, address, payment method, transaction ID,
  item count, amount ও initial Pending status-এর মৌলিক validation যোগ করা হয়েছে।
  তবে browser থেকে পাঠানো পণ্যের দাম/মোট মূল্য সার্ভার-ভেরিফায়েড নয়; price manipulation
  ও spam পুরোপুরি ঠেকাতে Cloud Functions/API validation, abuse protection এবং
  Firebase App Check / rate limiting প্রয়োজন।
- Firebase Rules পরিবর্তনের আগে বর্তমান Admin UID এবং checkout flow পরীক্ষা করুন।
- কোনো Admin password বা private credential GitHub-এ রাখবেন না।

GitHub Pages Deployment
-----------------------
এই repository-তে development branch-এ কাজ করা হচ্ছে।
Development branch-এর পরিবর্তন main branch-এ যাচাই করে merge না করা পর্যন্ত
মূল live website স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে না।

Deployment-এর সময়:
1. GitHub repository খুলুন।
2. Settings > Pages-এ যান।
3. Deploy from a branch নির্বাচন করুন।
4. Branch: main এবং Folder: / (root) নির্বাচন করুন।
5. Save করুন এবং GitHub Pages deployment শেষ হওয়া পর্যন্ত অপেক্ষা করুন।

Live link-এর ধরন:
Customer Website: https://OWNER.github.io/REPOSITORY/
Admin Panel:      https://OWNER.github.io/REPOSITORY/admin.html

ডোমেইন ব্যবহার করলে GitHub Pages-এ custom domain configure করতে হবে।
