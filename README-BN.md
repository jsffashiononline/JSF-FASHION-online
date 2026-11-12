# JSF FASHION — ওয়েবসাইট ও অ্যাডমিন প্যানেল

এই ZIP-এ storefront, product details, cart, checkout এবং Firebase-ভিত্তিক admin panel আছে। ব্র্যান্ডের নাম সব জায়গায় **JSF FASHION** নির্দিষ্ট রাখা হয়েছে। Storefront navigation-এ Admin link নেই; সরাসরি `/admin/login.html` দিয়ে Admin login করা যাবে।

## ফাইল আপলোড
ZIP extract করে ভেতরের সব ফাইল ও folder GitHub repository-র root-এ upload করুন। `index.html` root-এ থাকতে হবে। GitHub Pages-এ branch `main` এবং folder `/ (root)` নির্বাচন করুন। ES module চালাতে HTTPS hosting ব্যবহার করুন।

## Firebase চালু করা
এই প্রজেক্টে আপনার দেওয়া Firebase project `mr-game-shop-9f914`-এর Web App config ব্যবহার করা আছে (`js/firebase.js`)। Firebase Console-এ নিচের সার্ভিসগুলো চালু করুন:

1. **Authentication → Sign-in method → Email/Password** enable করুন।
2. **Authentication → Users** থেকে Admin email/password account তৈরি করুন। Public signup page এই প্রজেক্টে নেই।
3. **Realtime Database** তৈরি/চালু করুন এবং `firebase/database.rules.json`-এর rules publish করুন।
4. **Storage** চালু করুন এবং `firebase/storage.rules`-এর rules publish করুন।

## Admin অনুমোদন (অবশ্যই করতে হবে)
Firebase Authentication → Users থেকে Admin user-এর UID কপি করুন। Realtime Database → Data-তে `admins` node-এর নিচে UID-কে key এবং boolean `true` value দিন। উদাহরণ:

```json
{
  "admins": {
    "PASTE_ADMIN_UID_HERE": true
  }
}
```

`admins` node ওয়েবসাইট থেকে পরিবর্তন করা যাবে না। Admin নিজের UID-এর অনুমতি পড়তে পারবে; অন্য ব্যবহারকারীর অনুমতি পড়তে পারবে না।

## Admin panel
- Login: `https://আপনার-সাইটের-ঠিকানা/admin/login.html`
- Dashboard: `https://আপনার-সাইটের-ঠিকানা/admin/dashboard.html` (login ছাড়া সরাসরি খুললে login-এ পাঠাবে)
- পণ্য যোগ, সম্পাদনা ও মুছে ফেলা
- পণ্যের ছবি আপলোড (সর্বোচ্চ ৫ MB)
- লোগো আপলোড
- bKash ও Nagad নম্বর সেট করা
- অর্ডার দেখা এবং status পরিবর্তন

## পেমেন্ট ও অর্ডার
bKash/Nagad নম্বর checkout-এ দেখানো হয়; এটি automatic payment gateway নয়। Transaction ID গ্রাহক লিখতে পারে, কিন্তু টাকা গ্রহণ/পেমেন্ট যাচাই আপনাকে ম্যানুয়ালি করতে হবে। Order total browser থেকে পাঠানো হয়—লাইভ ব্যবসায় চালুর আগে trusted backend দিয়ে price validation, rate limiting এবং payment verification যোগ করা উচিত।

## গুরুত্বপূর্ণ নিরাপত্তা নোট
- Firebase Web API key frontend config-এ থাকা স্বাভাবিক; Service Account private key, password বা secret key কখনো ZIP-এ দেবেন না।
- Storage rules-এ signed-in user image upload করতে পারে। তাই অচেনা user account তৈরি/অনুমোদন করবেন না। আরও শক্ত admin-only upload security-এর জন্য Firebase custom claims বা trusted backend দরকার।
- Rules publish করার আগে বিদ্যমান database-এর backup রাখুন।
- Admin UID-টি database-এ boolean `true` হিসেবে যোগ না করলে dashboard-এ প্রবেশ করা যাবে না।
