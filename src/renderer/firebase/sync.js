/**
 * Two-way sync of MY data with Firestore.
 *
 *   users/{uid}                 { displayName, lastActive, prefs }
 *   users/{uid}/progress/main   { items, summary, updatedAt }
 *
 * Rules of the road:
 *  - Writes are debounced (800 ms) and only send what changed ("dirty").
 *  - Items are written with mergeFields + a FieldPath per item, which REPLACES
 *    that one item (so removed fields really disappear) without touching others
 *    (so edits on two devices to different items both survive).
 *  - Snapshot callbacks only update the store; they never write. While local
 *    edits are pending, incoming snapshots are ignored: our write wins and
 *    Firestore immediately emits a new snapshot that includes it.
 *  - Offline: Firestore's persistent cache queues writes and replays them later.
 */
import { doc, onSnapshot, setDoc, serverTimestamp, deleteField, FieldPath } from "firebase/firestore";
import { db } from "./init.js";
import { computeProgress, summarize } from "../../data/plan.js";
import { normalizePrefs } from "../core/prefs.js";

const DEBOUNCE_MS = 800;
const HEARTBEAT_MS = 5 * 60_000; // lastActive refresh while the app is open

/**
 * @param store           the app store (reads items/prefs/win at flush time)
 * @param hooks.onItems   (items) => void        remote items arrived
 * @param hooks.onPrefs   (prefs, first) => void remote prefs arrived
 * @param hooks.onStatus  ("saving"|"saved"|"offline"|"error") => void
 * @param hooks.onError   (err, what) => void
 */
export function createSync(store, hooks) {
  let uid = null;
  let refs = null;
  let unsubs = [];
  let timer = null;
  let heartbeat = null;
  let dirtyItems = new Set();
  let dirtyPrefs = false;
  let firstPrefs = true;
  let legacy = null;     // stage-4 local items to migrate once
  let inflight = 0;

  const pending = () => !!timer || dirtyItems.size > 0 || dirtyPrefs;

  function start(userId, legacyItems = {}) {
    stop();
    uid = userId;
    legacy = legacyItems;
    firstPrefs = true;
    refs = { user: doc(db, "users", uid), progress: doc(db, "users", uid, "progress", "main") };

    unsubs.push(onSnapshot(refs.progress, snap => {
      if (pending()) return;
      if (!snap.exists()) {
        // Only trust "doesn't exist" when the server said so (not an empty offline cache).
        if (!snap.metadata.fromCache && legacy && Object.keys(legacy).length) {
          hooks.onItems(legacy);
          Object.keys(legacy).forEach(id => dirtyItems.add(id));
          legacy = null;
          // flush() calls setDoc synchronously, which puts the upload in
          // Firestore's on-disk queue (survives restarts, sent when online).
          // So the localStorage copy can go right away, even offline.
          flush();
          hooks.onLegacyDone?.(uid);
        } else if (!snap.metadata.fromCache) {
          hooks.onItems({});
        }
        return;
      }
      if (legacy) { legacy = null; hooks.onLegacyDone?.(uid); } // account already has data
      hooks.onItems(snap.data().items || {});
    }, e => hooks.onError(e, "progress")));

    unsubs.push(onSnapshot(refs.user, snap => {
      if (pending()) return;
      const prefs = snap.exists() ? snap.data().prefs : null;
      if (!prefs) {
        // New account: upload whatever prefs this device has.
        if (!snap.metadata.fromCache) { dirtyPrefs = true; schedule(); }
        firstPrefs = false;
        return;
      }
      hooks.onPrefs(normalizePrefs(prefs), firstPrefs);
      firstPrefs = false;
    }, e => hooks.onError(e, "profile")));

    heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") touch();
    }, HEARTBEAT_MS);
  }

  function stop() {
    unsubs.forEach(u => u());
    unsubs = [];
    clearTimeout(timer); timer = null;
    clearInterval(heartbeat);
    dirtyItems = new Set(); dirtyPrefs = false;
    uid = null; refs = null;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  }

  /** Mark an item as changed (call after updating the store). */
  function markItem(id) { dirtyItems.add(id); schedule(); }
  /** Mark prefs (track/hours/theme/avatar/window) as changed. */
  function markPrefs() { dirtyPrefs = true; schedule(); }

  /** The prefs object stored in Firestore = app prefs + window state. */
  function prefsDoc(s) {
    const w = s.win || {};
    const e = w.expanded || {};
    const c = w.collapsed || {};
    return {
      ...s.prefs,
      // Window fields only once the main process has reported them.
      ...(w.expanded ? {
        opacity: w.opacity ?? 1,
        alwaysOnTop: w.alwaysOnTop ?? true,
        window: { x: e.x ?? null, y: e.y ?? null, w: e.w ?? null, h: e.h ?? null,
                  cx: c.x ?? null, cy: c.y ?? null, collapsed: !!w.isCollapsed },
      } : {}),
    };
  }

  /** Send everything dirty. Safe to call any time (e.g. before sign-out). */
  async function flush() {
    clearTimeout(timer); timer = null;
    if (!refs || (!dirtyItems.size && !dirtyPrefs)) return;
    const s = store.get();
    const ids = [...dirtyItems];
    const prefsChanged = dirtyPrefs;
    dirtyItems = new Set(); dirtyPrefs = false;

    // Summary always reflects the latest items AND track/hours.
    const summary = summarize(computeProgress(s.items, s.prefs.track, s.prefs.hours));
    const pdata = { summary, updatedAt: serverTimestamp(), items: {} };
    const fields = ["summary", "updatedAt"];
    for (const id of ids) {
      pdata.items[id] = s.items[id] ?? deleteField(); // empty item -> remove from map
      fields.push(new FieldPath("items", id));
    }

    const writes = [setDoc(refs.progress, pdata, { mergeFields: fields })];
    if (prefsChanged) {
      // One field path per pref (prefs.track, prefs.theme, ...) instead of
      // replacing the whole prefs map, so fields we don't know yet (e.g. the
      // window before the main process reported it) keep their saved values.
      const prefs = prefsDoc(s);
      writes.push(setDoc(refs.user, { prefs, lastActive: serverTimestamp() }, {
        mergeFields: [...Object.keys(prefs).map(k => new FieldPath("prefs", k)), "lastActive"],
      }));
    }

    inflight++;
    hooks.onStatus(navigator.onLine ? "saving" : "offline");
    try {
      // Resolves when the SERVER confirms. Offline, this waits until reconnect
      // (the write is already safe in the local cache).
      await Promise.all(writes);
      if (--inflight === 0) hooks.onStatus("saved");
    } catch (e) {
      inflight--;
      hooks.onStatus("error");
      hooks.onError(e, "save");
    }
  }

  /** Update lastActive (sign-in, heartbeat). */
  function touch() {
    if (!refs) return;
    setDoc(refs.user, { lastActive: serverTimestamp() }, { merge: true })
      .catch(e => hooks.onError(e, "heartbeat"));
  }

  return { start, stop, flush, markItem, markPrefs, touch, isPending: pending };
}
