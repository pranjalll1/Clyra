# Module 3: Venue and Clash Management (Arpit Sharma)

## 1. What It Does
Module 3 is the spatial and temporal guardian of Clyra. It models campus venues, prevents venue double-bookings, calculates peak concurrent usage, and manages conflict overrides.

- **Venue Master Data**: Manages 12 campus venues with classifications (`auditorium`, `sports`, `hub`, `academic`), total capacities, amenities, and concurrent unit counts (`units`). Venues like Central OpenAir Theaters (OAT) with 6 clusters have `units: 6`, allowing up to 6 simultaneous independent events without clashing.
- **Interval Overlap & Concurrency Algorithm**: Implements line-sweep peak concurrency calculations in `services/overlap.js`. Back-to-back events (where event A ends exactly when event B starts) do not overlap.
- **Double-Booking Prevention**:
  - Live preview endpoint `/api/v1/venues/:id/clash-check` used by the event creation form.
  - Mandatory pre-submission check in Module 1 rejecting clashing draft submissions.
  - Final approval validation when an admin publishes an event.
- **Admin Clash Override**: Admins can override clashes with other published events only by submitting an explicit `overrideReason` (min 5 characters), which is saved in `Event.conflictOverride` with timestamp and admin ID.
- **Venue Timetable**: Endpoint `/api/v1/venues/:id/schedule` provides 14-day (configurable up to 62 days) venue booking visualization.

## 2. Folders & File Layout
```
src/
  modules/venue-clash/
    index.js                 # Public module API: exports checkVenueClash, findOverlaps, conflictDto, BLOCKING
    services/
      overlap.js             # Pure mathematical line-sweep overlap & peak concurrency functions
      clash.js               # Database-backed clash checking against blocking statuses
    handlers/
      venues.js              # List venues, live clash check, venue schedule
    components/
      VenueAvailability.jsx  # Visual timeline and timetable component
  scripts/
    checkClashRules.js       # Standalone mathematical unit test for overlap rules
  app/
    api/v1/
      venues/route.js                        # GET: active venues list
      venues/[id]/clash-check/route.js       # GET: live clash check for event editor
      venues/[id]/schedule/route.js          # GET: venue schedule / timetable
```

## 3. Models Owned
- `Venue`: Campus venue entity with unique code (`VNU-SDMAUD-02`), location, type, capacity, amenities, active status, and `units` (number of independent simultaneous stages/spaces).

## 4. Dependencies on Other Modules
- **Exports to Module 1 (Event Management)**:
  - Exports `checkVenueClash` used by `submitEventForReview` in `eventService.js`.
  - Exports `checkVenueClash` and `conflictDto` used by `listAdminReviewEvents` and `approveEvent` in `adminService.js`.
- **Exports to Module 2 (Student Discovery)**:
  - Supplies venue metadata for event filtering and event detail pages.
- **Shared**:
  - `Event` model for finding overlapping bookings; auth guards (`withRole(['organizer', 'admin'])`).

## 5. Manual Test Checklist
1. Run standalone maths test: `node src/scripts/checkClashRules.js`; verify all 8 interval and peak concurrency checks pass.
2. Sign in as organizer, open venue list `/organizer/venues`; verify all 12 venues appear with location, capacity, and amenities.
3. Open a venue timetable `/organizer/venues` (select Shanti Devi Mittal Auditorium); verify booked slots render across the 14-day window.
4. Open `/organizer/events/new`, select a venue and set a time slot that overlaps an existing published event.
5. Verify live banner alerts the organizer of the clash with conflicting event title and shortCode.
6. Try to submit the clashing event; verify 409 `VENUE_CLASH` blocks submission.
7. Switch venue to OpenAir Theaters (OAT, units: 6) with 1 overlapping event; verify no clash is reported because peak concurrency (2) does not exceed units (6).
8. As admin in `/admin/review`, inspect an event flagged with `needsOverride: true`; verify Approve button requires typing a reason.
9. Approve with a reason (at least 5 characters); verify event publishes and `conflictOverride` records `by`, `reason`, and `at`.
