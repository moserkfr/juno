/**
 * The shared chat: chats/main/messages/{id}
 *   { uid, name, text, type: "text"|"nudge"|"progress", createdAt: serverTimestamp }
 *
 * Rules enforce: my own uid, 1–500 chars, known type, exact fields, server time.
 * Read position ("read up to") lives on MY user doc as chatReadAt, so unread
 * counts follow the account across devices.
 */
import {
  collection, doc, onSnapshot, query, orderBy, limit, addDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "./init.js";

export const MAX_LEN = 500;
const LOAD = 200;
const messagesCol = () => collection(db, "chats", "main", "messages");

/**
 * Live last-200 messages, oldest first.
 * onMessages([{ id, uid, name, text, type, at, pending }])
 */
export function watchChat(onMessages, onError) {
  // Newest-first + limit keeps the NEWEST 200; then reverse for display.
  const q = query(messagesCol(), orderBy("createdAt", "desc"), limit(LOAD));
  return onSnapshot(q, { includeMetadataChanges: true }, snap => {
    const list = snap.docs.map(d => {
      const x = d.data({ serverTimestamps: "estimate" });
      return {
        id: d.id, uid: x.uid, name: x.name, text: x.text, type: x.type || "text",
        at: x.createdAt?.toMillis?.() ?? Date.now(),
        pending: d.metadata.hasPendingWrites,  // not yet confirmed by the server
      };
    });
    onMessages(list.reverse());
  }, onError);
}

/** Send a message. Resolves when queued locally (works offline). Throws on validation. */
export function sendMessage(user, text, type = "text") {
  const t = String(text || "").trim();
  if (!t) throw new Error("Type something first.");
  if (t.length > MAX_LEN) throw new Error(`Max ${MAX_LEN} characters.`);
  // Don't await the server: offline, addDoc's promise waits until reconnect.
  // The write is already safely queued once addDoc() is called.
  const p = addDoc(messagesCol(), {
    uid: user.uid,
    name: String(user.displayName || "Player").slice(0, 30),
    text: t,
    type,
    createdAt: serverTimestamp(),
  });
  return p; // caller may .catch() server rejections (e.g. permission-denied)
}

/** Mark chat as read up to now (on MY user doc). */
export function markRead(uid) {
  return setDoc(doc(db, "users", uid), { chatReadAt: serverTimestamp() }, { merge: true });
}
