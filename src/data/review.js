/**
 * Spaced-review scheduling (pure functions, like plan.js).
 *
 * When a subtopic is flagged ★ REVIEW we schedule three reviews at
 * +1, +7 and +30 days after the flag. `stage` counts reviews completed:
 *   stage 0 -> due flaggedAt + 1d
 *   stage 1 -> due flaggedAt + 7d
 *   stage 2 -> due flaggedAt + 30d
 *   stage 3 -> all reviews done; the UI asks whether to clear the flag
 * If you review late, the next date is still measured from the flag, but never
 * earlier than tomorrow, so you never get two reviews of the same item in one day.
 *
 * All times are epoch milliseconds.
 */

export const DAY = 86_400_000;
export const INTERVALS = [1, 7, 30]; // days after flagging

/** Item flagged now. Keeps done/note untouched. */
export function flag(item = {}, now = Date.now()) {
  return { ...item, review: true, flaggedAt: now, stage: 0, nextReviewAt: now + INTERVALS[0] * DAY, updatedAt: now };
}

/** Item with the review flag and its schedule removed (note is kept). */
export function unflag(item = {}, now = Date.now()) {
  const { review, flaggedAt, stage, nextReviewAt, ...rest } = item;
  return { ...rest, updatedAt: now };
}

/** "Reviewed" pressed: advance to the next interval (or finish at stage 3). */
export function reviewed(item, now = Date.now()) {
  const stage = Math.min(INTERVALS.length, (item.stage || 0) + 1);
  if (stage >= INTERVALS.length) return { ...item, stage, nextReviewAt: null, updatedAt: now };
  const due = Math.max((item.flaggedAt || now) + INTERVALS[stage] * DAY, startOfDay(now) + DAY);
  return { ...item, stage, nextReviewAt: due, updatedAt: now };
}

export const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Due today or overdue (compared by calendar day, not exact time). */
export const isDue = (item, now = Date.now()) =>
  !!item && item.review && item.nextReviewAt != null && item.nextReviewAt < startOfDay(now) + DAY;

/** All schedule steps finished. */
export const isFinished = item => !!item && item.review && (item.stage || 0) >= INTERVALS.length;

/** True if the item carries no information and can be deleted from the map. */
export const isEmpty = item => !item || (!item.done && !item.review && !item.note);
