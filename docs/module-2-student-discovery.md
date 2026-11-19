# Module 2: Student Discovery (Yashika)

## 1. What It Does
Module 2 powers student exploration, search, event registration, and ticket lifecycle.

- **Landing Page & Discovery**: Provides aggregate counts (`/api/v1/stats`) and event card feeds with faceted search, query text matching, category multi-select, mode (`in_person`, `online`, `hybrid`), venue type filter, time windows (`today`, `week`, `weekend`), and sorting (`soonest`, `newest`, `popular`).
- **Event Details**: Displays full public event details by URL slug, calculating remaining capacity, real-time registration state (`ended`, `paused`, `not_open_yet`, `closed`, `full`, `open`), and embedding personal registration status for authenticated students.
- **Atomic Seat Booking**: Enforces single-operation capacity reservation using MongoDB atomic queries (`$expr: { $lt: ['$registeredCount', '$capacity'] }`) to prevent race conditions when simultaneous clicks compete for the final seat.
- **My Bookings & QR Tickets**: Provides student dashboard for upcoming and past tickets with unique cryptographic codes (`TK-XXXXXXXX`), QR visualization, and registration cancellation (guarded by event start time).

## 2. Folders & File Layout
```
src/
  modules/student-discovery/
    handlers/
      discovery.js           # Stats counter, public event list with facets, detail by slug
      registration.js        # Atomic registration, cancellation, my bookings
    components/
      Landing.jsx
      EventsExplorer.jsx
      EventFilters.jsx
      EventCard.jsx
      EventDetail.jsx
      MyBookings.jsx
      Pagination.jsx
  app/
    api/v1/
      stats/route.js                         # GET: landing page counts
      events/route.js                        # GET: public faceted event search
      events/by-slug/[slug]/route.js         # GET: event detail with student reg state
      events/[id]/register/route.js          # POST: register, DELETE: cancel
      events/mine/registrations/route.js     # GET: my tickets (upcoming/past)
```

## 3. Models Owned
- `Registration`: Student registration records linking `eventId` and `userId` with unique index `(eventId, userId)`. Stores secure `ticketCode`, cancellation timestamp, and gate check-in status.

## 4. Dependencies on Other Modules
- **Module 1 (Event Management)**:
  - Consumes published events created by organizers.
  - Updates `Event.registeredCount` atomically during booking and cancellation.
- **Module 3 (Venue & Clash Management)**:
  - Displays venue metadata (`Venue.name`, `type`, `capacity`) on event cards and details.
- **Shared**:
  - `Event`, `Category`, and `User` models; auth middleware (`withRole('student')`, `optionalAuth`); notifications (`notify`).

## 5. Manual Test Checklist
1. Navigate to `/` (landing page); verify event counts, club numbers, and category highlights render correctly.
2. Go to `/events`; search for keywords and verify case-insensitive partial title matching.
3. Apply filters (Price: Free, Mode: In-person, When: This weekend); verify URL query parameters update and results match all selected criteria.
4. Select a published event to open `/events/[slug]`; verify all public fields display and private organizer fields (`createdBy`, `rejectionNote`, `conflictOverride`) are omitted.
5. As an unauthenticated user, click Register; verify redirect to sign-in page.
6. Sign in as a student (`student.dev@lpu.in`), return to event page, and click Register; verify confirmation toast and remaining seats decrement by 1.
7. Attempt to click register a second time; verify 409 `ALREADY_REGISTERED` error is received.
8. Visit `/my-bookings`; verify registered event appears under Upcoming tab with QR code and readable ticket code (`TK-XXXXXXXX`).
9. Click Cancel Registration for an event that has not started; verify ticket moves to cancelled state and seat count increments back.
10. Verify that cancelling an event whose `startAt` is in the past fails with 409 `TOO_LATE`.
