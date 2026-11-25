// Unit III: Math and time helpers for venue clash calculations
// Clean, pure functions without database dependencies - easy to test and verify.

/**
 * Checks whether two time ranges [aStart, aEnd) and [bStart, bEnd) overlap.
 * Back-to-back events (where event A ends exactly when event B starts) do NOT overlap.
 */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  const aStartTime = new Date(aStart).getTime();
  const aEndTime = new Date(aEnd).getTime();
  const bStartTime = new Date(bStart).getTime();
  const bEndTime = new Date(bEnd).getTime();

  // Overlap condition: A starts before B ends, AND A ends after B starts
  return aStartTime < bEndTime && aEndTime > bStartTime;
}

/**
 * Calculates the maximum number of simultaneous events happening at any single moment.
 * Uses a Line-Sweep algorithm:
 * 1. Mark each event start with +1 (adds an event to current running count)
 * 2. Mark each event end with -1 (removes an event from running count)
 * 3. Sort chronologically: if an end and start happen at the same instant,
 *    process the end (-1) first so back-to-back events do not falsely clash.
 */
export function peakConcurrency(intervals) {
  if (!intervals || intervals.length === 0) {
    return 0;
  }

  const timelinePoints = [];

  for (const event of intervals) {
    const startTime = new Date(event.startAt).getTime();
    const endTime = new Date(event.endAt).getTime();

    timelinePoints.push({ time: startTime, change: 1 });  // event begins
    timelinePoints.push({ time: endTime, change: -1 });  // event finishes
  }

  // Sort by time ascending
  // When timestamps are identical, -1 comes before +1 (end before start)
  timelinePoints.sort((a, b) => {
    if (a.time !== b.time) {
      return a.time - b.time;
    }
    return a.change - b.change;
  });

  let currentActiveEvents = 0;
  let peak = 0;

  for (const point of timelinePoints) {
    currentActiveEvents += point.change;
    if (currentActiveEvents > peak) {
      peak = currentActiveEvents;
    }
  }

  return peak;
}
