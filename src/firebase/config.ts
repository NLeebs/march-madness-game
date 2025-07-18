import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD3sDP1KhZNPNSiAeC0Xp3g3e-gZFbEFao",
  authDomain: "march-madness-game.firebaseapp.com",
  databaseURL: "https://march-madness-game-default-rtdb.firebaseio.com",
  projectId: "march-madness-game",
  storageBucket: "march-madness-game.appspot.com",
  messagingSenderId: "408850679702",
  appId: "1:408850679702:web:c3a029994692cc2007bfb7",
  measurementId: "G-H5SQQ7WR5C",
};

// Initialize Firebase
const firebase_app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db: Firestore = getFirestore(firebase_app);

export default db;
