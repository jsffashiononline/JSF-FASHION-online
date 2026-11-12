JSF FASHION — E-COMMERCE WEBSITE
================================

এই ZIP-এ রয়েছে:
- index.html: Customer-facing main store
- admin.html: আলাদা Admin Panel (মেইন ওয়েবসাইটে admin link নেই)
- style.css: Black & Premium Gold responsive design
- app.js: Product display, search, cart, checkout, order creation
- admin.js: Admin login, product CRUD, order management, store settings
- firebase-config.js: Firebase Web App configuration
- database.rules.json: Realtime Database rules

গুরুত্বপূর্ণ: Firebase UID একা দিয়ে লগইন করা যায় না। Admin panel-এ প্রবেশের জন্য ওই UID-এর সঙ্গে যুক্ত Firebase Authentication account-এর Email/Password লাগবে।

সেটআপ:
1. Firebase Console খুলুন: https://console.firebase.google.com/
2. আপনার project: mr-game-shop-9f914 নির্বাচন করুন।
3. Project settings > General > Your apps থেকে Web App তৈরি/নির্বাচন করুন।
4. Firebase config থেকে apiKey, messagingSenderId, appId কপি করে firebase-config.js-এ বসান।
   databaseURL ইতিমধ্যে আপনার দেওয়া URL অনুযায়ী বসানো আছে।
5. Authentication > Sign-in method থেকে Email/Password চালু করুন।
6. Authentication > Users-এ আপনার Admin UID-এর সঙ্গে মিলে এমন অ্যাকাউন্ট আছে কি না যাচাই করুন।
   Admin UID অবশ্যই MYGho0eVmHMWPV9n9GFSmO3XvC62 হতে হবে।
7. Realtime Database > Rules-এ database.rules.json-এর নিয়মগুলো যাচাই করে Publish করুন।
8. ZIP extract করে Firebase Hosting বা অন্য HTTPS static hosting-এ আপলোড করুন।
9. Main store: https://your-domain/
   Admin panel: https://your-domain/admin.html

Admin Panel:
- Product add/edit/delete
- Customer orders দেখা
- Order status: Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
- বিকাশ ও নগদ নম্বর পরিবর্তন
- Store profile picture URL পরিবর্তন

প্রোফাইল ছবির জন্য:
Admin Panel > Store Settings > Profile image URL-এ সরাসরি image URL দিন।
এই সংস্করণে Firebase Storage upload নয়, URL-ভিত্তিক ছবি ব্যবহার করা হয়েছে।

নিরাপত্তা:
- Firebase Web config browser-এ থাকা স্বাভাবিক; এটি server secret নয়।
- Admin access অবশ্যই Firebase Authentication + Database Rules দিয়ে নিয়ন্ত্রিত।
- আপনার দেওয়া orders write rule-এ যে কেউ নতুন order তৈরি করতে পারে; এটি checkout-এর জন্য রাখা হয়েছে।
  তবে এতে order spam ঠেকানোর validation নেই। লাইভ ব্যবসায় যাওয়ার আগে App Check, rate limiting/Cloud Functions
  এবং order data validation যোগ করুন।
- Public database-এ কখনো admin password, private API key বা সংবেদনশীল তথ্য রাখবেন না।

পেমেন্ট:
এই starter-এ বিকাশ/নগদ নম্বর admin settings-এ সংরক্ষণ হয়। এটি স্বয়ংক্রিয় payment gateway integration নয়।
ক্রেতাকে নম্বর দেখানো/পেমেন্ট যাচাইয়ের workflow পরের ধাপে যুক্ত করা যাবে।
