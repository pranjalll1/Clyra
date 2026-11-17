# Clyra: campus events platform

Find, register for and run events at Lovely Professional University. Students discover events and get QR tickets, organizers publish events after an admin approves them, and the system blocks venue double-bookings before they reach students.

> Live demo: _add your Vercel URL here_  |  Screenshots: _add images to `docs/screenshots/` and link them here_

## Features

**Accounts and security**
- Sign-up limited to college email addresses. New accounts are active immediately and signed in.
- Strong password rules (8 to 72 characters, upper and lower case, number, special character) enforced on the server.
- Forgot and reset password with one-time links that expire in 1 hour (needs an email service, so the link is hidden unless `NEXT_PUBLIC_PASSWORD_RESET=true`).
- Sign-ups are limited by the college-domain restriction and rate limiting on the auth routes.
- Three roles (student, organizer, admin) with role and ownership checks on every protected route.

**Organizer access workflow**
1. A person signs up choosing **Organizer** (or applies later from a student account), signs in, and submits organizer details (organization, institution, registration number, faculty coordinator). Until approved they can use Clyra as a student but cannot create events.
2. An admin reviews the request in the admin dashboard.
3. Approved: the account gets organizer access and can create and manage events. Rejected: access is denied with a reason, and the account cannot create or publish events. Students need no approval. Admins can create events too, and theirs publish immediately.

**Module 1: event management (organizers and admins)**
- Create, edit and autosave draft events: description, category, schedule, venue, capacity, waitlist, registration window, price label.
- Submit for approval; admins approve or reject with a note.
- Organizer dashboard with status tabs, search and per-event actions.

**Module 2: student discovery**
- Landing page, event search, filters (category, price, mode, venue type, date) and sorting, all kept in the URL.
- Event detail pages with a registration panel, registration and cancellation, My bookings with QR tickets.
- Gate console for QR check-in and attendance.

**Module 3: venue and clash management**
- 12 real campus venues with capacity, amenities and parallel-space counts.
- Clash detection when submitting or approving an event, venue timetable, and an admin override that requires a reason.

**Notifications**
- In-app bell with unread count, notification page, toasts, and email for key events (registration, approval, rejection, cancellation, organizer decisions) when an email service is configured.

## Tech stack
Next.js 14 (App Router) and Tailwind CSS, Node.js and Express, MongoDB Atlas with Mongoose, Zod validation, JWT in httpOnly cookies, Nodemailer and the Brevo API for email. Hosted on Vercel (frontend) and Render (backend).

```
Browser  ->  Next.js (Vercel)  --/api proxy-->  Express (Render)  ->  MongoDB Atlas
                                                      |-> Email (Brevo)
```
The browser only talks to Next.js, which forwards `/api/*` to Express, so the login cookie stays same-origin.

## Data model
`users`, `organizations` (clubs and their members), `organizerapplications`, `categories`, `venues`, `events`, `registrations` (one per student per event, unique index), `notifications` (deleted after 90 days), `counters` (event codes such as LPU-0007).

## Project structure
```
server/src
  models/        Mongoose schemas
  routes/        auth, users, events, admin, venues, notifications, organizer applications, admin dashboard
  middleware/    auth and role checks
  utils/         validation rules, clash maths, mail, notify
  seed.js, seedShowcase.js, smokeTest.js
client/src
  app/           pages (App Router)
  components/    UI components
  lib/           API helper, hooks, formatting
```

## Run it locally
Requirements: Node.js 18 or newer and a free MongoDB Atlas cluster.

1. **Atlas:** create a database user, allow your IP under Network Access, and copy the connection string. Add `/clyra` after the host.
2. **Backend**
   ```bash
   cd server
   cp .env.example .env      # fill MONGODB_URI and JWT_SECRET (and SEED_PASSWORD)
   npm install
   npm run seed              # users, categories, venues, a starter club
   node src/seedShowcase.js  # demo clubs and events
   npm run dev               # http://localhost:5001
   ```
3. **Frontend**
   ```bash
   cd client
   cp .env.local.example .env.local
   npm install
   npm run dev               # http://localhost:3000
   ```
With no email settings, emails are printed in the server console instead of being sent.

**Demo accounts** (created by `npm run seed`, password is your `SEED_PASSWORD`): `admin.dev@lpu.in`, `organizer.dev@lpu.in`, `student.dev@lpu.in`. Delete or re-password them on a public site.

## Environment variables
| Where | Name | Purpose |
|---|---|---|
| server | `MONGODB_URI`, `JWT_SECRET` | Database and cookie signing (required) |
| server | `CLIENT_URL`, `ALLOWED_EMAIL_DOMAINS` | Email links and CORS; allowed sign-up domains |
| server | `BREVO_API_KEY`, `MAIL_SENDER_EMAIL`, `MAIL_SENDER_NAME` | Optional: email in production |
| client | `NEXT_PUBLIC_PASSWORD_RESET` | Set to `true` to show the forgot-password link (needs email) |
| client | `API_URL` | Where Next.js forwards `/api` |

## Testing
- Automated API checks: `node src/smokeTest.js [api-url]` from `server` (public data, no private fields leaking, access control, input rules; optional signed-in checks with `SMOKE_*` variables).
- Manual checklists for each module are in `DEPLOY.md` and `CLYRA_PROJECT_GUIDE.md`.

## Security notes
Passwords are bcrypt-hashed. Password-reset tokens are stored hashed and are single-use. Cookies are httpOnly and secure in production. Auth routes are rate limited. Public endpoints return an allow-listed set of fields. Login, reset and resend responses do not reveal whether an email has an account.

## Deployment
See `DEPLOY.md` (Vercel + Render + Atlas, optional email, smoke test).

## Known limitations and future work
- The free backend sleeps when idle, so the first request can be slow. Scheduled reminders are not included for that reason.
- Notifications refresh by polling (every 25 seconds), not a permanent connection.
- Not built yet: settings page with change password, admin tool to revoke organizer access, dark theme, the Clyra chatbot, saved events, CSV export.
- Poster images are sample AI-generated art.
- Email is optional. Without an email service, password reset and notification emails are not sent (in-app notifications still work).

## Author
Pranjal Soni (Pranjal) | [GitHub](https://github.com/pranjalll1) | [LinkedIn](https://www.linkedin.com/in/pranjal-soni24/) | pranjalsoni1290@gmail.com
