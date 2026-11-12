// Firebase Console > Project settings > General > Your apps > Web app config
// Replace the placeholder values below with your Firebase Web App configuration.
const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "mr-game-shop-9f914.firebaseapp.com",
  databaseURL: "https://mr-game-shop-9f914-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mr-game-shop-9f914",
  storageBucket: "mr-game-shop-9f914.appspot.com",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_WEB_APP_ID"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
