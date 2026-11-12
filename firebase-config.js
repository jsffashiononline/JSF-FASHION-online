
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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();

const ADMIN_UID = "MYGho0eVmHMWPV9n9GFSmO3XvC62";
