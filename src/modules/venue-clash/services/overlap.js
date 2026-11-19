// Pure time helpers for venue clashes. No database code here, so they are easy to test.

// Do [aStart, aEnd) and [bStart, bEnd) overlap?
// Back-to-back events (one ends exactly when the next starts) do NOT overlap.
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

// The largest number of events running at the same moment.
// A venue with `units` separate spaces clashes only when this peak is ABOVE `units`.
export function peakConcurrency(intervals) {
  const edges = [];
  for (const { startAt, endAt } of intervals) {
    edges.push([new Date(startAt).getTime(), 1], [new Date(endAt).getTime(), -1]);
  }
  // At the same instant, an end (-1) is counted before a start (+1), so back-to-back events do not stack.
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0;
  let peak = 0;
  for (const [, change] of edges) {
    current += change;
    peak = Math.max(peak, current);
  }
  return peak;
}