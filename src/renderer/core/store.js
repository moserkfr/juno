/**
 * Minimal observable store: one state object, set() merges a patch and
 * notifies subscribers. This is all the "framework" the app needs —
 * Firebase listeners call set(), the UI subscribes and redraws.
 */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : patch;
      state = { ...state, ...next };
      subs.forEach(fn => fn(state, next));
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
