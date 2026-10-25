/**
 * ============================================================================
 * FIREBASE CONFIGURATION GUIDE FOR STEPHEN ALEJE / SOLVEAI
 * ============================================================================
 * 
 * If you want to connect your own brand-new free Firebase project:
 * 
 * 1. Visit https://console.firebase.google.com/ and sign in with your Google account.
 * 2. Click "Add project" and give it a name (e.g. "solveai-campus" or "zangamarket").
 * 3. In the project dashboard, click the Web icon (</>) to create a Web App.
 * 4. Register the app (no need to check Firebase Hosting for now).
 * 5. Copy the values from "const firebaseConfig = { ... }" and paste them below:
 *    - apiKey
 *    - authDomain
 *    - projectId
 *    - storageBucket
 *    - messagingSenderId
 *    - appId
 * 6. Under Firebase Console > Build:
 *    - Click "Firestore Database" -> "Create database" -> Start in test mode.
 *    - Click "Storage" -> "Get started" -> Start in test mode.
 * 7. Paste your keys in the CUSTOM_FIREBASE_CONFIG object below!
 * ============================================================================
 */

import defaultConfig from '../../firebase-applet-config.json';

// PASTE YOUR OWN KEYS HERE (OR LEAVE AS DEFAULT TO USE THE AUTO-CONFIGURED PROJECT):
export const CUSTOM_FIREBASE_CONFIG = {
  apiKey: "",             // <-- PASTE YOUR apiKey HERE (e.g. "AIzaSy...")
  authDomain: "",         // <-- PASTE YOUR authDomain HERE (e.g. "my-project.firebaseapp.com")
  projectId: "",          // <-- PASTE YOUR projectId HERE (e.g. "my-project-id")
  storageBucket: "",      // <-- PASTE YOUR storageBucket HERE (e.g. "my-project.firebasestorage.app")
  messagingSenderId: "",  // <-- PASTE YOUR messagingSenderId HERE (e.g. "1234567890")
  appId: "",              // <-- PASTE YOUR appId HERE (e.g. "1:123456789:web:abcdef")
  firestoreDatabaseId: "" // <-- Leave blank ("") for default database
};

// Automatically merges custom keys with existing applet configuration
export const activeFirebaseConfig = {
  projectId: CUSTOM_FIREBASE_CONFIG.projectId || defaultConfig.projectId || "zangamarket1",
  appId: CUSTOM_FIREBASE_CONFIG.appId || defaultConfig.appId || "",
  apiKey: CUSTOM_FIREBASE_CONFIG.apiKey || defaultConfig.apiKey || "",
  authDomain: CUSTOM_FIREBASE_CONFIG.authDomain || defaultConfig.authDomain || "zangamarket1.firebaseapp.com",
  storageBucket: CUSTOM_FIREBASE_CONFIG.storageBucket || defaultConfig.storageBucket || "zangamarket1.firebasestorage.app",
  messagingSenderId: CUSTOM_FIREBASE_CONFIG.messagingSenderId || defaultConfig.messagingSenderId || "",
  firestoreDatabaseId: CUSTOM_FIREBASE_CONFIG.firestoreDatabaseId || defaultConfig.firestoreDatabaseId || ""
};

export default activeFirebaseConfig;
