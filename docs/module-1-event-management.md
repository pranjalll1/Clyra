# Module 1: Event Management (Pranjal Soni)

## 1. What It Does
Module 1 handles organizer onboarding, draft creation, autosave, submission for review, admin approval/rejection, and event gate management (QR ticket scanner & roster check-in).

- **Organizer Application & Verification**: Students apply for organizer privileges by submitting organizational details, institution credentials, and faculty coordinator contacts. Admins review applications in a dedicated queue, approving (promoting role and attaching organization) or rejecting with a mandatory note.
- **Draft Creation & Autosaved Editing**: Organizers create events which receive a campus-unique shortCode (`LPU-0001`) and slug. Edits are autosaved for drafts and rejected events, validating capacity against venue limits and scheduling constraints.
- **Event Submission**: Organizers submit events when the 6-field completeness criteria are satisfied. The system enforces future scheduling and calls Module 3's clash check.
- **Gate Check-In & Roster**: Organizers and admins open the gate console on event day to scan student QR codes or type ticket codes (`TK-XXXXXXXX`). Check-ins are marked atomically. Includes full attendee search, attendance stats, and check-in undo capabilities.

## 2. Folders & File Layout
```
src/
  modules/event-management/
    services/
      eventService.js        # Drafts, autosave, submission, organizer dashboard, orgs
      gateService.js         # Gate ticket validation, roster search, stats, undo
      applicationService.js  # Organizer applications, admin review, role promotion
      adminService.js        # Admin event review queue, approval with override, reject
    components/
      EventForm.jsx
      GateConsole.jsx
      OrganizerDashboard.jsx
      OrganizerRequests.jsx
      AdminReview.jsx
      AdminDashboard.jsx
      BecomeOrganizerForm.jsx
  app/
    api/v1/
      events/route.js                        # POST: create draft
      events/[id]/route.js                   # GET, PATCH: manage/autosave draft
      events/[id]/submit/route.js            # POST: submit for review
      events/[id]/check-in/route.js          # POST: gate check-in
      events/[id]/check-in/[registrationId]/route.js # DELETE: undo check-in
      events/[id]/roster/route.js            # GET: attendee roster & stats
      organizer/events/route.js              # GET: organizer dashboard
      organizations/mine/route.js            # GET: user's organizations
      organizer-applications/route.js        # POST: apply, GET: admin queue
      organizer-applications/mine/route.js   # GET: my application
      organizer-applications/[id]/approve/route.js # POST: admin approve
      organizer-applications/[id]/reject/route.js  # POST: admin reject
      admin/events/route.js                  # GET: admin review queue
      admin/events/[id]/approve/route.js     # POST: admin approve event
      admin/events/[id]/reject/route.js      # POST: admin reject event
      admin-dashboard/stats/route.js         # GET: admin dashboard counters
```

## 3. Models Owned
- `OrganizerApplication`: Applicant information, verification details, review status, reviewer ID, review note, and associated organization.
- `Organization`: Club/department entity with slug, verification status, and member roster with roles (`owner`, `member`).

## 4. Dependencies on Other Modules
- **Module 3 (Venue & Clash Management)**:
  - `submitEventForReview` calls `checkVenueClash` from `@/modules/venue-clash` before allowing an event to enter `pending_approval`.
  - `listAdminReviewEvents` calls `checkVenueClash` to display existing venue conflicts to the admin.
  - `approveEvent` re-evaluates `checkVenueClash({ statuses: ['published'] })` and requires an `overrideReason` if a clash exists.
- **Module 2 (Student Discovery)**:
  - Gate check-in marks `Registration.checkedInAt` and counts attendance against registrations.
- **Shared**:
  - `User` model, `Event` model, authentication helpers (`withAuth`, `withRole`), notifications (`notify`).

## 5. Manual Test Checklist
1. Sign in as student (`student.dev@lpu.in`), visit `/become-organizer`, submit form with missing fields (verify 400 validation error).
2. Complete all required fields and submit; verify notification dispatched to admin and `/organizer-applications/mine` shows pending status.
3. Sign in as admin (`admin.dev@lpu.in`), visit `/admin/organizers`, approve the request; verify user role changes to organizer.
4. Sign in as newly approved organizer, go to `/organizer/events/new`, create draft event; verify short code format (`LPU-XXXX`).
5. Fill event fields partially, verify autosave indicator updates without errors.
6. Attempt to submit with incomplete fields; verify 400 error listing missing required items.
7. Set venue and conflicting time slot; verify 409 `VENUE_CLASH` blocks submission.
8. Set valid non-clashing time and submit; verify status becomes `pending_approval`.
9. In admin `/admin/review`, verify pending event appears; approve or reject with note and check notification delivered to organizer.
10. Open `/organizer/events/[id]/gate`, type valid ticket code `TK-XXXXXXXX`; verify check-in succeeds with live counter update.
11. Scan/type same ticket code again; verify duplicate ticket warning without double-counting.
12. Click Undo check-in; verify attendee status resets and attendance decrements.
