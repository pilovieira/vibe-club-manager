import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {

    apiKey: "AIzaSyDDunr8FDvksMxRrLPsShZlwcdkrww68dw",
    authDomain: "offroad-maringa.firebaseapp.com",
    projectId: "offroad-maringa",
    storageBucket: "offroad-maringa.firebasestorage.app",
    messagingSenderId: "706507199021",
    appId: "1:706507199021:web:dee0d4582dfd3c37675ea4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
