// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8_xAQJtvACs3F5qXGHnYMXY4dEldC2yA",
  authDomain: "co2-calculatet.firebaseapp.com",
  projectId: "co2-calculatet",
  storageBucket: "co2-calculatet.firebasestorage.app",
  messagingSenderId: "23756241592",
  appId: "1:23756241592:web:e15f5f63b1147ed1d7524d",
  measurementId: "G-P7D3R92Q4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Export for use in other files
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAnalytics = analytics;

console.log("🔥 Firebase initialized successfully!");
