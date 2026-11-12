JSF FASHION WEBSITE - SETUP GUIDE

১. JSF-FASHION নামে একটি ফোল্ডার তৈরি করুন।

২. নিচের ফাইলগুলো একই ফোল্ডারে রাখুন:
- index.html
- style.css
- firebase-config.js
- store.js
- admin.html
- admin.css
- admin.js
- database.rules.json
- README_BN.txt

৩. Firebase Console খুলুন:
https://console.firebase.google.com/

৪. Authentication থেকে Email/Password Sign-in চালু করুন।

৫. আপনার অনুমোদিত Admin UID-এর সঙ্গে মিলে এমন
Firebase Auth অ্যাকাউন্ট তৈরি থাকতে হবে।

৬. Realtime Database খুলে database.rules.json-এর
নিয়মগুলো Rules অংশে বসিয়ে Publish করুন।

৭. GitHub-এ Repository তৈরি করুন।

৮. উপরের সব ফাইল Repository-এর মূল ফোল্ডারে
আপলোড করুন। index.html অবশ্যই Root-এ থাকবে।

৯. Repository Settings > Pages-এ যান।
Deploy from a branch নির্বাচন করুন।
Branch: main
Folder: / (root)
Save করুন।

১০. ওয়েবসাইটের লিংক তৈরি হলে সেটি খুলে পরীক্ষা করুন।

CUSTOMER WEBSITE:
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/

ADMIN PANEL:
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/admin.html

গুরুত্বপূর্ণ:
- Firebase Authentication ছাড়া Admin Login হবে না।
- Admin UID অবশ্যই অনুমোদিত UID-এর সঙ্গে মিলতে হবে।
- Firebase-এর জন্য ওয়েবসাইট HTTPS Hosting-এ চালাতে হবে।
- ছবি ব্যবহার করতে সরাসরি ছবি দেখায় এমন Image URL দিন।
- এই প্রজেক্টে Firebase Storage Image Upload যুক্ত নেই।
- Orders-এ Guest Checkout চালু আছে। Production-এ
  spam protection, validation এবং App Check যোগ করুন।
- Database Rules-এ যেকোনো visitor নতুন Order তৈরি করতে
  পারে। তাই এটি পরীক্ষামূলক ব্যবহারের জন্য; বাস্তবে
  অতিরিক্ত server-side যাচাই প্রয়োজন।
