// Run with:  node src/checkClashRules.js   (from the server folder). No database needed.
import { overlaps, peakConcurrency } from '../modules/venue-clash/services/overlap.js';

const t = (h) => new Date(`2026-11-11T${String(h).padStart(2, '0')}:00:00Z`);
let failed = 0;
const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${actual}, expected ${expected})`}`);
};

check('partial overlap 9-11 vs 10-12', overlaps(t(9), t(11), t(10), t(12)), true);
check('back-to-back 9-10 vs 10-11 is NOT an overlap', overlaps(t(9), t(10), t(10), t(11)), false);
check('one inside another 9-12 vs 10-11', overlaps(t(9), t(12), t(10), t(11)), true);
check('separate 9-10 vs 14-15', overlaps(t(9), t(10), t(14), t(15)), false);

const clash = (existing, fresh, units) => peakConcurrency([...existing, fresh]) > units;
const ev = (a, b) => ({ startAt: t(a), endAt: t(b) });

check('1 unit, one overlapping event = clash', clash([ev(9, 11)], ev(10, 12), 1), true);
check('1 unit, back-to-back = no clash', clash([ev(9, 10)], ev(10, 11), 1), false);
check('2 units, two events that do not overlap each other + a long new one = no clash', clash([ev(9, 10), ev(11, 12)], ev(9, 12), 2), false);
check('2 units, two events overlapping each other + new one inside both = clash', clash([ev(9, 11), ev(10, 12)], ev(10, 11), 2), true);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll 8 checks passed');
process.exit(failed ? 1 : 0);
