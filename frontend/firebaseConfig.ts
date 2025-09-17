import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArPIfHsQrahEVK47iIZdlpy4gjxyDXtY8",
  authDomain: "fir-auth01-10f58.firebaseapp.com",
  projectId: "fir-auth01-10f58",
  storageBucket: "fir-auth01-10f58.firebasestorage.app",
  messagingSenderId: "1066517448696",
  appId: "1:1066517448696:android:3e947ef25aa2a370d7380d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;
