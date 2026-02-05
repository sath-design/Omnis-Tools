/**
 * LogicHub Shared: Firebase Initialization
 * Initializes Firebase App and exports Auth, Firestore, and Analytics instances.
 * Consolidated for portal and shared usage.
 */

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase Config (Updated 2026-02-05)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Enable Offline Persistence
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db)
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Persistence failed: Multiple tabs open');
            } else if (err.code == 'unimplemented') {
                console.warn('Persistence not supported by browser');
            }
        });
}

export { app, auth, db, analytics, onAuthStateChanged, signOut, signInWithEmailAndPassword };
