/* ============================================================================
   Firebase configuration for the browser app.

   IMPORTANT:
   - Replace every FIREBASE_* placeholder with the values from
     Firebase Console > Project settings > Your apps > Web app.
   - Replace ADMIN_EMAIL with the exact email of the office owner.
   - Never put a Firebase Admin SDK service-account JSON in this file.
   ============================================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBWMbOb879qINbCpwce5D6ZvfVFz9Yxzh4",
  authDomain: "lawyer-mohamed.firebaseapp.com",
  projectId: "lawyer-mohamed",
  storageBucket: "lawyer-mohamed.firebasestorage.app",
  messagingSenderId: "346866325255",
  appId: "1:346866325255:web:d56431e8186461847757a2"
};

const ADMIN_EMAIL = "alsyd2162225@gmail.com";

const FIREBASE_CONFIG_READY =
  Object.values(firebaseConfig).every(v => typeof v === "string" && v.trim()) &&
  !Object.values(firebaseConfig).some(v => /FIREBASE_|YOUR_API_KEY|YOUR_PROJECT_ID|YOUR_MESSAGING|YOUR_APP_ID/i.test(v)) &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL);

if (!FIREBASE_CONFIG_READY) {
  console.warn("Firebase configuration is not complete. Edit firebase-config.js before testing the production site.");
}

if (typeof firebase === "undefined") {
  throw new Error("Firebase SDK was not loaded. Check the Firebase script tags in the HTML files.");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Keep the signed-in user across normal browser sessions.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
  console.warn("Firebase Auth persistence could not be enabled:", error);
});

function getFriendlyFirebaseCode(error) {
  return String(error?.code || "").replace(/^firebase\//, "");
}

function logVisit(page) {
  // Visit logging must never break the public website if Firestore is unavailable.
  if (!FIREBASE_CONFIG_READY) return Promise.resolve();

  return db.collection("visits").add({
    page: String(page || location.pathname).slice(0, 200),
    path: String(location.pathname || "/").slice(0, 200),
    ts: firebase.firestore.FieldValue.serverTimestamp(),
    ua: navigator.userAgent.slice(0, 120)
  }).catch((error) => {
    console.warn("Visit logging failed:", error);
  });
}

function requireAuth(redirectTo) {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (!user) {
        const target = redirectTo || "auth.html";
        location.replace(target);
        return;
      }
      resolve(user);
    });
  });
}

function isAdminUser(user) {
  return Boolean(
    user &&
    user.email &&
    ADMIN_EMAIL &&
    user.email.toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()
  );
}
