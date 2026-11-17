# Clyra: Campus Events Platform

Find, register for and run events at **Lovely Professional University**. Students discover events and get QR tickets, organizers publish events after an admin approves them, and the system blocks venue double-bookings before they reach students.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Node.js](https://img.shields.io/badge/Node.js-Express-339933) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8)

## Table of contents
1. [Overview](#overview)
2. [Live demo](#live-demo)
3. [Features by module](#features-by-module)
4. [Roles and permissions](#roles-and-permissions)
5. [How it works](#how-it-works)
6. [Architecture and tech stack](#architecture-and-tech-stack)
7. [Data model](#data-model)
8. [API overview](#api-overview)
9. [Project structure](#project-structure)
10. [Getting started](#getting-started)
11. [Seed data](#seed-data)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Security](#security)
15. [Accessibility](#accessibility)
16. [Known limitations and future work](#known-limitations-and-future-work)
17. [Documentation](#documentation)
18. [Author](#author)

## Overview
Campus events are usually shared through posters and chat groups. Two clubs can book the same hall at the same time, students miss events, and organizers have no single place to manage them. Clyra gives every event one lifecycle: **create, validate, approve, discover, register, attend**.

The project is split into three modules:

| Module | Audience | What it covers |
|---|---|---|
| **1. Event management** | Organizers and admins | Organizer onboarding, event creation and editing, admin approval, gate check-in |
| **2. Student discovery** | Students | Landing page, search and filters, event pages, registration, QR tickets |
| **3. Venue and clash management** | Organizers and admins | Venue data, double-booking detection, override with a reason, venue timetable |

## Live demo
- **Website:** https://clyra-wheat.vercel.app
- **API health check:** https://clyra-ruid.onrender.com/api/v1/health

The backend runs on a free plan and sleeps when idle, so the first request can take up to a minute.

| Role | Email | Password |
|---|---|---|
| Admin | `admin.dev@lpu.in` | _shared separately (set with `SEED_PASSWORD`)_ |
| Organizer | `organizer.dev@lpu.in` | _same_ |
| Student | `student.dev@lpu.in` | _same_ |

All names, clubs, events and registration numbers in the demo are generated sample data.

## Features by module

### Accounts and security (shared)
- Sign-up limited to college email addresses (`@lpu.in`). New accounts are active immediately.
- Strong password rules enforced on the server (8 to 72 characters, upper and lower case, a number, a special character).
- Three roles: student, organizer, admin. Role and ownership checks on every protected route.
- Forgot and reset password with single-use links that expire in 1 hour (needs an email service; hidden unless `NEXT_PUBLIC_PASSWORD_RESET=true`).
- Notifications: bell with unread count, notification page, toasts, optional email.

### Module 1: Event management ([details](docs/MODULE-1-EVENT-MANAGEMENT.md))
- Organizer onboarding: submit organization and institution details, admin approves or rejects with a reason.
- Create and edit events with autosave, a "required fields" counter and server-side validation.
- Submit for approval, admin review queue with clash information, approve or reject with a note.
- Organizer dashboard: status tabs, search, pause registration, cancel.
- Gate console: scan or type a QR ticket, one check-in per ticket, roster, undo.
- Admin dashboard with live counts.

### Module 2: Student discovery ([details](docs/MODULE-2-STUDENT-DISCOVERY.md))
- Landing page, event search, filters (category, price, mode, venue type, date) and sorting, all kept in the URL.
- Event detail page with a registration panel.
- Registration and cancellation with atomic seat counting, My bookings with QR tickets.

### Module 3: Venue and clash management ([details](docs/MODULE-3-VENUE-CLASH.md))
- 12 real campus venues with capacity, amenities and number of parallel spaces.
- Clash check when an event is submitted and again when an admin approves it.
- Admin override that needs a written reason, saved with who and when.
- Venue timetable and a "check this slot" tool.

## Roles and permissions

| Action | Student | Organizer (approved) | Admin |
|---|---|---|---|
| Browse and search events | Yes | Yes | Yes |
| Register for an event, view tickets | Yes | No | No |
| Apply for organizer access | Yes | n/a | n/a |
| Create, edit and submit own club's events | No | Yes | Yes |
| Approve or reject events | No | No | Yes |
| Review organizer requests | No | No | Yes |
| Check people in at the gate (own events) | No | Yes | Yes |
| See admin dashboard | No | No | Yes |

## How it works

**Organizer onboarding**
1. A person signs up choosing **Organizer** (or applies later from a student account).
2. They submit organization, institution, registration number and faculty coordinator details.
3. An admin reviews the request. **Approved:** the account becomes an organizer and can create events. **Rejected:** the reason is shown and the account cannot create or publish events.

**Event lifecycle**
```
draft --submit--> pending_approval --approve--> published --(event ends)--> completed
  ^                    |                            |
  |                    | reject                     | cancel
  +---- edit and resubmit (rejected)                +--> cancelled
```

**Student journey:** browse, open an event, register (seat is reserved atomically), receive a QR ticket, check in at the gate.

## Architecture and tech stack
```
Browser --> Next.js (Vercel) --/api proxy--> Express (Render) --> MongoDB Atlas
                                                  |--> email service (optional)
```
The browser only talks to Next.js, which forwards `/api/*` to Express, so the login cookie stays same-origin.

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, Fontsource fonts |
| Backend | Node.js, Express, Zod validation |
| Database | MongoDB Atlas with Mongoose |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Email (optional) | Nodemailer or the Brevo API |
| Hosting | Vercel (frontend), Render (backend), Atlas (database) |

## Data model

| Collection | Holds |
|---|---|
| `users` | Name, email, password hash, role, department, year, interests |
| `organizations` | Club name, verified flag, members and their club role |
| `organizerapplications` | Organizer requests with details and the admin's decision |
| `categories` | Event categories |
| `venues` | Code, name, location, type, capacity, `units`, amenities |
| `events` | Everything about an event, status, seats taken, registration window |
| `registrations` | One row per student per event: status, ticket code, check-in time |
| `notifications` | In-app alerts (deleted after 90 days) |
| `counters` | Running number behind event codes such as `LPU-0007` |

**Relationships:** an organization has many events; an event has one category and at most one venue; a student has many registrations; each registration belongs to one event. A unique index on `eventId + userId` stops duplicate registrations.

## API overview
All paths start with `/api/v1`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /users/me` |
| Catalog | `GET /categories`, `GET /venues`, `GET /organizations/mine` |
| Public events | `GET /events`, `GET /events/by-slug/:slug` |
| Registration (students) | `POST /events/:id/register`, `DELETE /events/:id/register`, `GET /events/mine/registrations` |
| Event management | `POST /events`, `GET /events/:id`, `PATCH /events/:id`, `POST /events/:id/submit`, `GET /organizer/events` |
| Gate | `POST /events/:id/check-in`, `GET /events/:id/roster`, `DELETE /events/:id/check-in/:registrationId` |
| Admin review | `GET /admin/events`, `POST /admin/events/:id/approve`, `POST /admin/events/:id/reject` |
| Organizer requests | `POST /organizer-applications`, `GET /organizer-applications/mine`, `GET /organizer-applications` (admin), `POST /organizer-applications/:id/approve`, `POST /organizer-applications/:id/reject` |
| Admin dashboard | `GET /admin-dashboard/stats` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /notifications/:id/read` |

## Project structure
```
clyra-events/
  server/src/
    models/        Mongoose schemas
    routes/        auth, users, events, admin, catalog, notifications, organizer applications, admin dashboard
    middleware/    authentication and role checks
    utils/         validation rules, clash maths, mail, notify
    seed.js, seedShowcase.js, seedRealistic.js, smokeTest.js
  client/src/
    app/           pages (App Router)
    components/    UI components
    lib/           API helper, hooks, formatting
  docs/            module documentation
```

## Getting started
Requirements: Node.js 18 or newer and a free MongoDB Atlas cluster.

1. **Atlas:** create a database user, allow your IP under Network Access, and copy the connection string. Add `/clyra` after the host.
2. **Backend**
   ```bash
   cd server
   cp .env.example .env          # fill MONGODB_URI and JWT_SECRET
   npm install
   npm run seed
   node src/seedShowcase.js
   node src/seedRealistic.js
   npm run dev                   # http://localhost:5001
   ```
3. **Frontend**
   ```bash
   cd client
   cp .env.local.example .env.local
   npm install
   npm run dev                   # http://localhost:3000
   ```

| Where | Variable | Purpose |
|---|---|---|
| server | `MONGODB_URI`, `JWT_SECRET` | Database and cookie signing (required) |
| server | `CLIENT_URL`, `ALLOWED_EMAIL_DOMAINS` | Links in emails and CORS; allowed sign-up domains |
| server | `SEED_PASSWORD` | Password for the demo accounts |
| server | `BREVO_API_KEY`, `MAIL_SENDER_EMAIL`, `MAIL_SENDER_NAME` | Optional: email in production |
| client | `API_URL` | Where Next.js forwards `/api` |
| client | `NEXT_PUBLIC_PASSWORD_RESET` | Set to `true` to show the forgot-password link |

## Seed data

| Command (in `server`) | Creates |
|---|---|
| `npm run seed` | Demo admin, organizer and student, 7 categories, 12 campus venues, a starter club |
| `node src/seedShowcase.js` | 8 demo clubs and 20 events |
| `node src/seedRealistic.js` | Demo students, registrations, check-ins, organizer requests, events awaiting review, notifications |
| `node src/seedRealistic.js --reset` | Removes the demo students and their data, then rebuilds |

## Testing
- **Automated:** `node src/smokeTest.js [api-url]` from `server` runs 32 checks: public data, no private fields leaking, signed-out access control, input rules, and student and admin permission rules.
- **Manual:** each module document has a test checklist.
- **Build:** `npm run build` in `client` compiles all pages.

## Deployment
Vercel (frontend), Render (backend), Atlas (database). Step-by-step instructions are in [`DEPLOY.md`](DEPLOY.md). Updating the live site is `git add -A`, `git commit`, `git push`.

## Security
- Passwords are hashed with bcrypt. The login token is an httpOnly cookie, secure in production.
- Every protected route checks the role on the server. Organizers can only manage their own club's events, and other people's event ids return "not found".
- Input is validated with Zod. Search text is escaped before it is used in a database query.
- Public endpoints return an allow-listed set of fields.
- Auth routes are rate limited.
- Status changes (submit, approve, register, check in) use single atomic database updates, so double clicks and simultaneous requests cannot corrupt the state.

## Accessibility
Labelled form fields, error messages tied to their fields, visible keyboard focus, status shown by text as well as colour, and a colour palette adjusted to meet contrast guidelines for body text.

## Known limitations and future work
- The free backend sleeps when idle, so the first request can be slow. Scheduled reminders are not included for that reason.
- Notifications refresh by polling (every 25 seconds), not a permanent connection.
- Email is optional. Without an email service, password reset and notification emails are not sent (in-app notifications still work).
- Not built yet: settings page with change password, admin tool to revoke organizer access, dark theme, chatbot, saved events, CSV export, payments.
- Demo images and data are sample content.

## Documentation
- [Module 1: Event management](docs/MODULE-1-EVENT-MANAGEMENT.md)
- [Module 2: Student discovery](docs/MODULE-2-STUDENT-DISCOVERY.md)
- [Module 3: Venue and clash management](docs/MODULE-3-VENUE-CLASH.md)
- [Deployment guide](DEPLOY.md)

## Author
Pranjal Soni | [GitHub](https://github.com/pranjalll1) | [LinkedIn](https://www.linkedin.com/in/pranjal-soni24/) | pranjalsoni1290@gmail.com

This project was built for academic purposes. Please contact the author before reusing it.

