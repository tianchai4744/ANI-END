// auth-user.js
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db, appId } from "../config/firebase.js";

const googleProvider = new GoogleAuthProvider();

// --- Helper: แปลง Error Code เป็นข้อความไทย ---
export function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use': return 'อีเมลนี้มีผู้ใช้งานแล้ว';
        case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง';
        case 'auth/user-not-found': return 'ไม่พบผู้ใช้งานอีเมลนี้';
        case 'auth/weak-password': return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        case 'auth/invalid-email': return 'รูปแบบอีเมลไม่ถูกต้อง';
        case 'auth/popup-closed-by-user': return 'คุณปิดหน้าต่างล็อกอินก่อนทำรายการสำเร็จ';
        case 'auth/too-many-requests': return 'ทำรายการถี่เกินไป โปรดรอสักครู่';
        default: return 'เกิดข้อผิดพลาด: ' + errorCode;
    }
}

// --- Save User Data ---
async function saveUserToFirestore(user) {
    if (!user) return;
    try {
        const userRef = doc(db, `artifacts/${appId}/users/${user.uid}`);
        const userSnap = await getDoc(userRef);
        
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "User",
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=random`,
            lastLoginAt: serverTimestamp(),
            authProvider: user.providerData[0]?.providerId || 'password'
        };

        if (!userSnap.exists()) {
            userData.createdAt = serverTimestamp();
            userData.role = 'user';
        }

        await setDoc(userRef, userData, { merge: true });
    } catch (error) {
        console.error("Error saving user:", error);
    }
}

// --- Auth Functions ---

export async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user); 
    return result.user;
}

export async function registerWithEmail(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, {
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });
    await saveUserToFirestore(result.user); 
    return result.user;
}

export async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(result.user); 
    return result.user;
}

export async function resetPasswordEmail(email) {
    await sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
    await signOut(auth);
    window.location.reload();
}

export function monitorUserAuth(callback) {
    onAuthStateChanged(auth, (user) => {
        if (callback) callback(user);
    });
}
