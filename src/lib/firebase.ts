import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase.
// IMPORTANTE: Reemplaza estos valores con la configuración real de tu proyecto de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAbodpipD8AqX_M-MdmtyhpQS4A17s-VwA",
  authDomain: "casofs0426.firebaseapp.com",
  projectId: "casofs0426",
  storageBucket: "casofs0426.firebasestorage.app",
  messagingSenderId: "993099126094",
  appId: "1:993099126094:web:1b6c5fab2d57166f397a1f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary app instance specifically for creating new users
// This prevents the current admin user from being logged out when creating a new account
export const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);
