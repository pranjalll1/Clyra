# Clyra - Syllabus Mapping (Next.js & Full-Stack Web Development)

This document maps each topic from the course syllabus directly to its implementation in the Clyra project.

---

## Unit I: Fundamentals of Next.js, Routing and Navigation

### 1. Fundamentals of Next.js
* **Introduction & Features of Next.js**: Built using Next.js 14 App Router, React Server Components (RSC), hybrid rendering, and zero-config Route Handlers.
* **Project Structure**:
  * `src/app/`: Next.js App Router pages, nested layouts, loading/error UI, and Route Handlers.
  * `src/modules/`: Domain-driven feature separation (`student-discovery`, `event-management`, `venue-clash`).
  * `src/shared/`: Shared models, database connectivity, and authentication guards.
  * `src/components/`: Modular React components.
* **Development Workflow**: Run locally via `npm run dev` with Turbopack/Fast Refresh; production build via `npm run build`.

### 2. Routing and Navigation
* **File-based Routing**: Every page route maps to folder structure under `src/app/`:
  * `src/app/page.jsx` -> `/` (Home landing page)
  * `src/app/events/page.jsx` -> `/events` (Campus event discovery)
  * `src/app/login/page.jsx` -> `/login` (Student/Organizer authentication)
* **Dynamic Routes**:
  * `src/app/events/[slug]/page.jsx` -> Dynamic event details by slug (`/events/hackathon-2026`)
  * `src/app/organizer/events/[id]/page.jsx` -> Event management by Mongo ID
* **Nested Routes**:
  * `src/app/organizer/events/[id]/gate/page.jsx` -> QR ticket check-in gate
  * `src/app/admin/organizers/page.jsx` -> Admin organizer application review
* **Layouts**:
  * `src/app/layout.jsx` -> Root layout (Header, Footer, Global fonts, Toast provider)
  * `src/app/organizer/layout.jsx` -> Nested layout for organizer portal navigation
  * `src/app/admin/layout.jsx` -> Nested layout for admin dashboard navigation
* **Navigation**: Client-side SPA transitions with `next/link` (`<Link href="...">`) and Next.js hooks (`useRouter`, `usePathname`, `useSearchParams`).
* **Error and Loading UI**:
  * `src/app/loading.jsx` -> App Router instant skeleton loading fallback.
  * `src/app/error.jsx` -> App Router error boundary (`'use client'`) with retry trigger.
  * `src/app/not-found.jsx` -> Custom 404 page for unmatched routes.

---

## Unit II: Rendering Strategies & Data Fetching

### 1. Rendering Strategies
* **Server-Side Rendering (SSR) & Dynamic Rendering**:
  * API route handlers set `export const dynamic = 'force-dynamic'` for live database queries.
* **Static Site Generation (SSG)**:
  * Static marketing pages and metadata generation (`src/app/page.jsx`, `src/app/layout.jsx`).
* **Incremental Static Regeneration (ISR)**:
  * Cache revalidation via Next.js `revalidatePath` implemented in `src/app/actions.js`.
* **Client-side Rendering (CSR)**:
  * Interactive UI components use `'use client'` (`EventsExplorer.jsx`, `EventDetail.jsx`, `GateScanner.jsx`).
* **Rendering Strategy Selection**:
  * Server Components handle metadata and structural layouts; Client Components handle interactive state (filters, dialogs, forms).

### 2. Data Fetching
* **Server Components**: `src/app/page.jsx`, `src/app/events/page.jsx`, `src/app/events/[slug]/page.jsx`.
* **Client Components**: `src/components/EventsExplorer.jsx`, `src/components/AuthForm.jsx`.
* **Fetch API**: Unified API wrapper in `src/lib/api.js` consuming same-origin `/api/v1/...`.
* **Client-side Fetching**: React hooks (`useState`, `useEffect`, `useMe`) for live updates.
* **Caching and Revalidation**: On-demand cache invalidation via `revalidatePath('/events')` in `src/app/actions.js`.

---

## Unit III: API Development, Forms and Server Actions

### 1. API Development
* **Route Handlers (`src/app/api/v1/...`)**:
  * REST API endpoints built with Next.js App Router Route Handlers.
* **HTTP Methods**:
  * `GET`: `src/app/api/v1/events/route.js` (list events)
  * `POST`: `src/app/api/v1/events/route.js` (create event draft)
  * `PATCH`: `src/app/api/v1/events/[id]/route.js` (update draft)
  * `DELETE`: `src/app/api/v1/events/mine/registrations/route.js` (cancel booking)
* **Dynamic Route Handlers**:
  * `src/app/api/v1/events/[id]/route.js`
  * `src/app/api/v1/events/by-slug/[slug]/route.js`
  * `src/app/api/v1/venues/[id]/schedule/route.js`
* **Request and Response Handling**:
  * `src/shared/server/response.js` using `NextResponse.json()` and `req.json()`.

### 2. Forms and Server Actions
* **Server Actions**: `src/app/actions.js` uses `'use server'` for server-side form handling and data mutation.
* **Form Handling**:
  * `src/components/AuthForm.jsx` (Login / Register)
  * `src/components/BecomeOrganizerForm.jsx` (Multi-step application form)
  * `src/components/EventForm.jsx` (Event draft creation and editing)
* **Form Validation**:
  * Client and server validation using **Zod** (`src/shared/lib/validators.js`, `src/app/actions.js`).
* **Data Mutations**:
  * Atomic capacity decrement: `$expr: { $lt: ['$registeredCount', '$capacity'] }` in `registration.js`.
  * Status-guarded publishing: transitions from `draft` -> `pending_approval` -> `published`.
* **Optimistic UI Updates**: Instant registration state toggling and RSVP counts in `EventDetail.jsx`.

---

## Unit IV: Authentication, Authorization and Database Integration

### 1. Authentication and Authorization
* **Authentication Concepts & Session Management**:
  * JWT tokens signed and verified in `src/shared/server/auth.js`.
  * Secure session storage in HTTP-only `clyra_token` cookie.
* **Protected Routes**:
  * **Edge Middleware**: `src/middleware.js` intercepts `/my-bookings`, `/organizer/*`, `/admin/*` and redirects unauthenticated users to `/login`.
  * **Route Handler Guards**: `withAuth` in `src/shared/server/auth.js`.
  * **Client Guards**: `src/components/RequireOrganizer.jsx`.
* **Authorization & Role-Based Access Control (RBAC)**:
  * Three user roles: `student`, `organizer`, `admin`.
  * Guard wrapper: `withRole(['organizer', 'admin'], handler)` in `src/shared/server/auth.js`.

### 2. Database Integration
* **ORM / ODM Basics**:
  * Mongoose ODM models in `src/shared/models/`: `User.js`, `Event.js`, `Venue.js`, `Notification.js`, `Organization.js`.
* **Database Connectivity**:
  * Connection caching via `global.mongoose` in `src/shared/server/db.js` to reuse connections across serverless/dev invocations.
* **CRUD Operations**:
  * **Create**: `Event.create()`, `Registration.create()`.
  * **Read**: `Event.find()`, `Event.aggregate()` with facet filtering.
  * **Update**: `Event.findByIdAndUpdate()`, `User.updateOne()`.
  * **Delete**: `Registration.deleteOne()`.
* **Data Validation**:
  * Mongoose schema validations (`required`, `enum`, `trim`, `maxlength`).
  * Zod schema parsing for request payloads.
* **Environment Variables**:
  * Loaded from `.env.local` via `src/shared/server/config.js`:
    * `MONGODB_URI`: Atlas connection string
    * `JWT_SECRET`: Secret key for session signature
    * `ALLOWED_EMAIL_DOMAINS`: Domain restriction (`lpu.in`)
