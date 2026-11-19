# Clyra

Clyra is a campus events platform for Lovely Professional University. Organizers put events up, an admin approves them, students find them and register, and the system stops two events from being booked into the same hall at the same time.

It is built as a single, unified Next.js 14 application (App Router) with full backend Route Handlers and MongoDB Atlas.

---

## The team

| Module | What it covers | Built by |
|---|---|---|
| **1. Event management** | Organizer sign-up and approval, creating and editing events with autosaved drafts, admin review, gate check-in | Pranjal Soni |
| **2. Student discovery** | Landing page, search and filters, event pages, registration, My bookings, QR tickets, atomic seat counting | Yashika |
| **3. Venue and clash management** | Venue data, double-booking checks, admin override with saved reason, venue timetable | Arpit Sharma |

Sign-in, notifications, database connection caching, and shared models are shared code that all three modules use.

---

## Architecture & Layout

Clyra is organized as a modular Next.js application:

```
src/
  app/
    api/v1/                   # Thin Route Handlers (GET/POST/PUT/PATCH/DELETE)
    (pages)/                  # Next.js App Router pages (events, organizer, admin, etc.)
  modules/
    event-management/         # Module 1 (services, gate check-in, organizer applications)
    student-discovery/        # Module 2 (faceted event discovery, atomic registration)
    venue-clash/              # Module 3 (overlap math, peak concurrency, clash check API)
  shared/
    server/                   # Cached DB connection, auth/role guards, response helpers, email, notifications
    models/                   # Mongoose schemas (User, Event, Venue, Registration, etc.)
    lib/                      # Shared rules, DTO formatters, password validators, client API
    components/               # Header, Footer, NotificationBell, Auth forms, Dialogs
  scripts/                    # Seed scripts, backfill utilities, clash math test
  smokeTest.js                # 32 end-to-end API verification checks
docs/                         # Module documentation notes and test checklists
```

---

## Running locally

You need **Node.js 18 or newer** and a free **MongoDB Atlas** cluster.

1. **Clone and install dependencies** (single command):
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (database name `/clyra`).
   - `JWT_SECRET`: Any random 32+ character string.
   - `ALLOWED_EMAIL_DOMAINS`: Allowed college domains (defaults to `lpu.in`).
   - `SEED_PASSWORD`: Temporary password for seeded dev accounts (e.g. `ChangeMe123!`).

3. **Seed base data and demo events**:
   ```bash
   npm run seed                 # Seeds categories, venues, demo admin/organizer/student accounts
   node src/scripts/seedShowcase.js
   node src/scripts/seedRealistic.js
   ```

4. **Start the application** (single command):
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Checking that it works

1. **Automated smoke test** (32 checks covering public data, access controls, input rules, and role permissions):
   ```bash
   npm run test:smoke
   ```
   To run with authenticated student and admin checks:
   ```bash
   SMOKE_STUDENT_EMAIL=student.dev@lpu.in SMOKE_STUDENT_PASSWORD=ChangeMe123! SMOKE_ADMIN_EMAIL=admin.dev@lpu.in SMOKE_ADMIN_PASSWORD=ChangeMe123! npm run test:smoke
   ```

2. **Venue clash mathematical tests**:
   ```bash
   node src/scripts/checkClashRules.js
   ```

3. **Production build check**:
   ```bash
   npm run build
   ```

---

## Demo accounts

| Role | Email |
|---|---|
| Admin | `admin.dev@lpu.in` |
| Organizer | `organizer.dev@lpu.in` |
| Student | `student.dev@lpu.in` |

The password is whatever `SEED_PASSWORD` was set to when the data was created. Dev accounts are for development only.

---

## Deploying to Vercel

Clyra runs entirely on **Vercel** with **MongoDB Atlas**. There is no separate backend server.

1. **Push repository to GitHub**.
2. **MongoDB Atlas Network Access**:
   - In MongoDB Atlas, go to **Network Access** > **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) because Vercel serverless function IPs are dynamic.
3. **Deploy on Vercel**:
   - Import the repository in Vercel.
   - Framework Preset: **Next.js**.
   - Root Directory: `./` (project root).
   - Set Environment Variables:
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `ALLOWED_EMAIL_DOMAINS` (`lpu.in`)
     - `SEED_PASSWORD` (if running seeds)
     - Optional Brevo email keys (`BREVO_API_KEY`, `MAIL_SENDER_EMAIL`, `MAIL_SENDER_NAME`)
   - Click **Deploy**.

The Next.js App Router serves both the frontend website and the backend API (`/api/v1/...`) seamlessly under the same origin.

---

## Architectural Notes for Serverless

- **Database Connection Caching**: MongoDB Atlas connections are cached on the Node global object (`global.mongoose`) across serverless invocations to prevent exhausting Atlas connection limits.
- **Atomic Operations**: Registrations reserve seats with atomic MongoDB updates (`$inc: { registeredCount: 1 }` guarded by capacity). Double-submits and concurrent registrations are blocked at the database layer.
- **Stateless Authentication**: Signed JWTs are stored in `httpOnly`, `SameSite=Lax` cookies named `clyra_token`.
- **Notification Polling**: The notification bell polls `/api/v1/notifications/unread-count` every 25 seconds when the browser tab is visible. The query is indexed (`{ userId: 1, readAt: 1 }`) and lightweight.

---

## Credits
Repository owner: Pranjal Soni, [GitHub](https://github.com/pranjalll1), [LinkedIn](https://www.linkedin.com/in/pranjal-soni24/), pranjalsoni1290@gmail.com
Module 1: Pranjal Soni
Module 2: Yashika
Module 3: Arpit Sharma
