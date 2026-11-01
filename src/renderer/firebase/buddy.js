/**
 * READ-ONLY view of everyone else, plus my own activity log.
 *
 *   users (collection)          -> who exists, names, prefs, lastActive
 *   users/{other}/progress/main -> their items (we compute their % with THEIR track/hours)
 *   users/{any}/activity        -> feed events, newest first
 *
 * Writing: only logActivity() for MY OWN events (and trimming my old ones).
 * The security rules make sure nothing here can touch the buddy's data.
 */
import {
  collection, doc, onSnapshot, query, orderBy, limit, addDoc, getDocs, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "./init.js";
import { normalizePrefs } from "../core/prefs.js";

const FEED_PER_USER = 20;   // shown
const KEEP_EVENTS = 50;     // stored (older ones are deleted by their owner)

const ms = ts => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : null);

/**
 * hooks.onPeople(people)  people = { [uid]: { uid, displayName, prefs, lastActive, items?, summary?, feed[] } }
 * hooks.onError(err)
 */
export function createBuddyWatch(hooks) {
  let me = null;
  let people = {};
  let unsubUsers = null;
  const perUser = {}; // uid -> [unsub...]

  const emit = () => hooks.onPeople({ ...people });

  function watchUser(uid) {
    if (perUser[uid]) return;
    perUser[uid] = [];
    // Their progress (skip mine: the app already has it live).
    if (uid !== me) {
      perUser[uid].push(onSnapshot(doc(db, "users", uid, "progress", "main"), snap => {
        const d = snap.exists() ? snap.data() : {};
        people[uid] = { ...people[uid], items: d.items || {}, summary: d.summary || null };
        emit();
      }, hooks.onError));
    }
    // Everyone's recent activity (mine too, for the shared feed).
    const q = query(collection(db, "users", uid, "activity"), orderBy("createdAt", "desc"), limit(FEED_PER_USER));
    perUser[uid].push(onSnapshot(q, snap => {
      const feed = snap.docs.map(d => {
        const x = d.data({ serverTimestamps: "estimate" });
        return { id: d.id, uid, text: x.text, type: x.type, at: ms(x.createdAt) };
      });
      people[uid] = { ...people[uid], feed };
      emit();
    }, hooks.onError));
  }

  function start(myUid) {
    stop();
    me = myUid;
    unsubUsers = onSnapshot(collection(db, "users"), snap => {
      snap.docs.forEach(d => {
        // serverTimestamps:"estimate" so a just-written lastActive isn't null
        const x = d.data({ serverTimestamps: "estimate" });
        people[d.id] = {
          ...people[d.id],
          uid: d.id,
          displayName: x.displayName || "Player",
          prefs: normalizePrefs(x.prefs || {}),
          lastActive: ms(x.lastActive),
        };
        watchUser(d.id);
      });
      emit();
    }, hooks.onError);
  }

  function stop() {
    unsubUsers?.(); unsubUsers = null;
    Object.values(perUser).forEach(list => list.forEach(u => u()));
    for (const k in perUser) delete perUser[k];
    people = {};
    me = null;
  }

  return { start, stop };
}

/* ---------------- my activity log ---------------- */

const loggedThisSession = new Set();

/**
 * Add an event to MY feed, e.g. { type: "topic", key: "bs", text: "finished Binary search" }.
 * `key` dedupes: ticking a topic off and on again won't log twice per session.
 * Afterwards, delete my events beyond the newest KEEP_EVENTS.
 */
export async function logActivity(uid, { type, key, text }) {
  const k = type + ":" + key;
  if (!uid || loggedThisSession.has(k)) return;
  loggedThisSession.add(k);
  const col = collection(db, "users", uid, "activity");
  await addDoc(col, { type, text: String(text).slice(0, 200), createdAt: serverTimestamp() });
  // Trim. Runs after a user action, never inside a snapshot callback.
  const all = await getDocs(query(col, orderBy("createdAt", "desc")));
  await Promise.all(all.docs.slice(KEEP_EVENTS).map(d => deleteDoc(d.ref)));
}
