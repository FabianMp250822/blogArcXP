import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0JvhJfKX8UGcXQwxyT-oWHVeiBXW71CY",
  authDomain: "diamundia.firebaseapp.com",
  databaseURL: "https://diamundia-default-rtdb.firebaseio.com",
  projectId: "diamundia",
  storageBucket: "diamundia.appspot.com",
  messagingSenderId: "1063942596779",
  appId: "1:1063942596779:web:04348033260236d079afee",
  measurementId: "G-0XVLGP90BY",
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

export { app, db, auth, storage };
