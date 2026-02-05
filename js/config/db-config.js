import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVXZUnw5oiTLqCG00GYdtPTwzOubCSe1o",
    authDomain: "ani-end-94710.firebaseapp.com",
    projectId: "ani-end-94710",
    storageBucket: "ani-end-94710.firebasestorage.app",
    messagingSenderId: "374608108501",
    appId: "1:374608108501:web:19a4767c41a020bfb03b5c",
    measurementId: "G-VZM1XTPMYL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
export const appId = firebaseConfig.projectId;
