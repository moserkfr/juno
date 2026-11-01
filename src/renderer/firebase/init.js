/**
 * Firebase setup. Imported once; everything else imports { auth, db } from here.
 *
 * - Auth persists the session in IndexedDB, so you stay signed in across restarts.
 * - Firestore uses the persistent local cache: data loads instantly from disk,
 *   and writes made offline are queued and sent when the connection returns.
 */
import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import config from "../../../firebase.config.js";

export const app = initializeApp(config);

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

export const db = initializeFirestore(app, {
  // Single tab manager: the widget only ever has one window, so no
  // cross-tab coordination is needed.
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});
