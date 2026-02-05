/**
 * Portal Auth Handler
 * Manages Admin Login via Google Auth.
 */
import { app } from '../../Shared/firebase-init.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function initAuth(onUserChange) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Admin Logged In:", user.email);
            // In a real app, check if user.email is in allowed admin list
        } else {
            console.log("Admin Logged Out");
        }
        onUserChange(user);
    });
}

export async function login() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Failed:", error);
        alert("Login Failed: " + error.message);
    }
}

export async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Failed:", error);
    }
}
