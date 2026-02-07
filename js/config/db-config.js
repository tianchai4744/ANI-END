import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
