/**
 * Sign-up / sign-in / verification flow.
 *
 * Auth status drives which screen is shown:
 *   loading     – Firebase is restoring a saved session
 *   signedOut   – show the sign-in / sign-up form
 *   unverified  – signed in, email link not clicked yet
 *   denied      – verified, but the rules refused this account (not on the list)
 *   ready       – fully in
 *
 * Note: the rules check `email_verified` inside the ID TOKEN. A token issued
 * before you clicked the link still says false, so after verifying we force a
 * token refresh — otherwise Firestore would say "permission denied" for up to an hour.
 */
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./init.js";

const cleanName = n => String(n || "").trim().slice(0, 30);
const fallbackName = user => cleanName(user.displayName) || user.email.split("@")[0].slice(0, 30);

/**
 * Watch auth and report { status, user, error } through onChange.
 * Returns an unsubscribe function.
 */
export function watchAuth(onChange) {
  return onAuthStateChanged(auth, async user => {
    if (!user) return onChange({ status: "signedOut", user: null });
    if (!user.emailVerified) return onChange({ status: "unverified", user: pick(user) });
    onChange(await enter(user));
  });
}

const pick = u => ({ uid: u.uid, email: u.email, displayName: fallbackName(u) });

/**
 * Verified user: make sure users/{uid} exists. If the rules reject us,
 * the email isn't on the allowed list.
 */
async function enter(user, retried = false) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const displayName = snap.exists() ? (snap.data().displayName || fallbackName(user)) : fallbackName(user);
    // merge: never clobber prefs written from another device
    await setDoc(ref, { displayName, lastActive: serverTimestamp() }, { merge: true });
    return { status: "ready", user: { ...pick(user), displayName } };
  } catch (e) {
    if (e.code === "permission-denied") {
      // The account can say "verified" while the ID token the rules check was
      // minted before verification (valid for up to an hour). Refresh it and
      // retry once before concluding this email isn't on the guest list.
      if (!retried) {
        try { await user.getIdToken(true); return enter(user, true); } catch { /* fall through */ }
      }
      return { status: "denied", user: pick(user) };
    }
    // Offline on first ever launch: getDoc has nothing cached. Let the user in;
    // writes queue up and sync later.
    if (e.code === "unavailable") return { status: "ready", user: pick(user), offline: true };
    return { status: "denied", user: pick(user), error: e };
  }
}

export async function signUp(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: cleanName(name) || email.split("@")[0] });
  await sendEmailVerification(cred.user);
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function resendVerification() {
  return sendEmailVerification(auth.currentUser);
}

/**
 * "I've verified" button: reload the account from the server, force a fresh
 * token (so the rules see email_verified = true), then run the normal entry flow.
 */
export async function checkVerified() {
  const user = auth.currentUser;
  if (!user) return { status: "signedOut", user: null };
  await user.reload();
  if (!auth.currentUser.emailVerified) return { status: "unverified", user: pick(user) };
  await auth.currentUser.getIdToken(true);
  return enter(auth.currentUser);
}

export async function setDisplayName(name) {
  const user = auth.currentUser;
  const n = cleanName(name);
  if (!user || !n) return;
  await updateProfile(user, { displayName: n });
  await setDoc(doc(db, "users", user.uid), { displayName: n }, { merge: true });
  return n;
}

export const signOut = () => fbSignOut(auth);
