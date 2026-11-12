const firebaseConfig = {
  apiKey: "AIzaSyD7ThTpHXOltyqDng_aTwXn3t35vxcR5VM",
  authDomain: "jsf-fashion.firebaseapp.com",
  databaseURL: "https://jsf-fashion-default-rtdb.firebaseio.com",
  projectId: "jsf-fashion",
  storageBucket: "jsf-fashion.firebasestorage.app",
  messagingSenderId: "545355825847",
  appId: "1:545355825847:web:49f701a22e68daa9298332",
  measurementId: "G-2C2FNMTPD7"
};

// Initialize Firebase using the Compat SDK loaded in index.html
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Make the Realtime Database available to store.js
window.db = firebase.database();

console.log("JSF FASHION Firebase Connected");
