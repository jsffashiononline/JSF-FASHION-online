import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// আপনার দেওয়া Firebase Web App configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSZDoy8qcAgGR_qk4vZ5rWGlvID4t8B7Q",
  authDomain: "mr-game-shop-9f914.firebaseapp.com",
  databaseURL: "https://mr-game-shop-9f914-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mr-game-shop-9f914",
  storageBucket: "mr-game-shop-9f914.firebasestorage.app",
  messagingSenderId: "709309210572",
  appId: "1:709309210572:web:ae2ad7a67220ebc8874769",
  measurementId: "G-9BF47YSV2L"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
