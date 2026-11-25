// Module 3: Venue and Clash Management
// Public module interface exporting clash detection services and overlap helpers

export {
  BLOCKING,
  findOverlaps,
  checkVenueClash,
  conflictDto,
  formatConflict,
} from './services/clash.js';

export {
  overlaps,
  peakConcurrency,
} from './services/overlap.js';
