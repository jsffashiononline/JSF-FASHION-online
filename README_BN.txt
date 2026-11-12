JSF FASHION — সেটআপ গাইড (বাংলা)
=================================

প্রজেক্টে যা আছে
----------------
index.html             কাস্টমার স্টোর
admin.html             আলাদা অ্যাডমিন প্যানেল
style.css              সম্পূর্ণ responsive design
store.js               পণ্য, কার্ট, checkout ও order submission
admin.js               Firebase Authentication ও admin management
firebase-config.js     আপনার দেওয়া Firebase project configuration
database.rules.json    Realtime Database security rules

গুরুত্বপূর্ণ নিরাপত্তা নোট
-------------------------
অ্যাডমিন UID কোডে নির্দিষ্ট করা আছে:
MYGho0eVmHMWPV9n9GFSmO3XvC62

শুধু ওই UID দিয়ে লগইন করা Firebase user-কে অ্যাডমিন UI দেখানো হয়। তবে প্রকৃত নিরাপত্তা
Firebase Database Rules প্রয়োগ করে। Rules অবশ্যই Firebase Console-এ publish করবেন।
Firebase Web API key গোপন password নয়; নিরাপত্তা Rules ও Authentication-এর ওপর নির্ভর করে।

১) Firebase প্রস্তুত করুন
-------------------------
1. https://console.firebase.google.com/ এ আপনার project খুলুন।
2. Authentication > Sign-in method থেকে Email/Password enable করুন।
3. Authentication > Users-এ admin user তৈরি/নিশ্চিত করুন।
4. ওই admin user-এর UID অবশ্যই উপরের নির্দিষ্ট UID-এর সাথে মিলতে হবে।
   UID আলাদা হলে এই প্রজেক্টে নির্ধারিত UID বা Firebase account—যেটি সঠিক, সেটি
   সমন্বয় না করা পর্যন্ত admin login অনুমোদিত হবে না।
5. Realtime Database চালু করুন। Region/database URL আপনার দেওয়া config অনুযায়ী।
6. Realtime Database > Rules-এ database.rules.json-এর সম্পূর্ণ rules paste করে Publish করুন।

২) প্রথমবার পণ্য যোগ
--------------------
1. সাইট deploy করার পর /admin.html খুলুন।
2. অনুমোদিত Firebase admin email/password দিয়ে login করুন।
3. Products > Add product থেকে নাম, দাম (BDT), category, sizes, image URL ও description দিন।
4. Save product চাপুন। পণ্য কাস্টমার ওয়েবসাইটে real-time দেখা যাবে।

পণ্যের ছবি ও স্টোর প্রোফাইল ছবির জন্য public HTTPS image URL ব্যবহার করুন।
এই সংস্করণে সরাসরি Firebase Storage upload নেই; URL সংরক্ষণ করা হয়।
Storage upload চাইলে Storage enable ও আলাদা Storage Rules/কোড যোগ করতে হবে।

৩) Store Settings
-----------------
Admin Panel > Store Settings-এ bKash নম্বর, Nagad নম্বর এবং Store profile image URL
দিয়ে Save settings চাপুন। Checkout-এ payment number real-time দেখানো হবে।
Cash on Delivery-ও checkout-এ আছে।

৪) Deploy (Firebase Hosting)
----------------------------
Firebase CLI ইনস্টল করে project folder-এ terminal খুলুন:

  npm install -g firebase-tools
  firebase login
  firebase init hosting

প্রশ্নের সময়:
- Public directory: বর্তমান project folder (.)
- Configure as a single-page app: No
- Set up automatic builds: প্রয়োজন অনুযায়ী

তারপর:
  firebase deploy --only hosting

Firebase Hosting-এ static files serve করতে হবে। ES modules ব্যবহারের কারণে
file:// দিয়ে index.html ডাবল-ক্লিক করে চালাবেন না; localhost বা hosting ব্যবহার করুন।
উদাহরণ:
  python -m http.server 8000
তারপর http://localhost:8000 খুলুন।

Admin URL:
  https://YOUR-DOMAIN/admin.html

৫) Database Structure
---------------------
products/{productId}
orders/{orderId}
settings

প্রতিটি order-এ customerName, phone, address, paymentMethod, items, total,
status ও createdAt থাকে।

৬) Security ও operational notes
-------------------------------
- products ও settings public read; শুধু নির্দিষ্ট admin UID write করতে পারে।
- orders admin-only read; customer unauthenticated অবস্থায় নতুন order create করতে পারে।
- Customer order write rule-টি নতুন order creation অনুমোদন করে; তাই public order spam/
  fake submission প্রতিরোধে production-এ App Check, rate limiting বা server-side
  validation/Cloud Functions যোগ করার পরামর্শ দেওয়া হচ্ছে।
- বর্তমান rules public customer-কে নতুন order তৈরি করতে দেয়, কিন্তু existing order
  edit/delete করতে দেয় না।
- Admin UI-তে UID check আছে এবং database rules-এও UID check আছে।
- Client-side checks একা security boundary নয়; Firebase Rules-ই আসল enforcement।
- bKash/Nagad নম্বর প্রদর্শন করা হয়; স্বয়ংক্রিয় payment verification এই প্রজেক্টে নেই।
- Checkout submit সফল হলে Firebase Realtime Database-এ order তৈরি হয়।
- Product/profile image URL অবশ্যই HTTPS image endpoint হওয়া ভালো।

৭) সমস্যা হলে
--------------
- Permission denied: database.rules.json publish হয়েছে কি না এবং admin UID ঠিক কি না দেখুন।
- Admin login failed: Authentication-এ Email/Password enabled এবং সঠিক user আছে কি না দেখুন।
- Product image না এলে URL browser-এ খুলে দেখুন এবং image host hotlink অনুমতি দেয় কি না দেখুন।
- Firebase quota/network error হলে Firebase Console-এর usage ও browser console পরীক্ষা করুন।

এই প্রজেক্টটি Firebase config-সহ প্রস্তুত static web app। আপনার Firebase project-এ
Authentication user, Realtime Database ও Rules setup/deploy করা আপনার Console access দিয়ে
সম্পন্ন করতে হবে।
