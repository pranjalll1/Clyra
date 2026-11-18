# Clyra

Clyra is a campus events website for Lovely Professional University. Organizers put events up, an admin approves them, students find them and register, and the system stops two events from being booked into the same hall at the same time.

We built it as a three-person group project, and each of us took one module.

## The team

| Module | What it covers | Built by |
|---|---|---|
| 1. Event management | Organizer sign-up and approval, creating and editing events, admin review, gate check-in | Pranjal Soni |
| 2. Student discovery | Landing page, search and filters, event pages, registration, QR tickets | Yashika |
| 3. Venue and clash management | Venue data, double-booking checks, admin override, venue timetable | Arpit Sharma |

Sign-in, notifications and hosting are shared code that all three modules use.

## What each module does

**Module 1: event management (Pranjal).** Anyone can sign up as a student. To organize events, a person submits their club details, institution and faculty coordinator, and an admin approves or rejects the request. Once approved, an organizer can write an event as a draft (it saves automatically), submit it, and wait for an admin to publish it or send it back with a note. On the day, the organizer opens the gate page and scans student QR tickets. 

**Module 2: student discovery (Yashika).** Students can browse and search published events, filter by category, price, date and more, open an event page, register, and see their tickets under My bookings. Seats are counted carefully so an event cannot be overbooked even if many people click at once. 
**Module 3: venue and clash management (Arpit).** The campus venues are stored with their capacity and amenities. When an event is submitted, and again when an admin approves it, the system checks whether another event already holds that venue at that time. An admin can override a clash, but only by writing a reason, which is saved. There is also a timetable page for each venue. 

## How the parts fit together
An organizer's event goes through Module 1. When it is submitted or approved, it calls the clash check from Module 3. Once an admin publishes it, Module 2 shows it to students, who can register until the registration window closes. All three read and write the same event records in the database.

## Try it
- Website: https://clyra-wheat.vercel.app
- Backend health check: https://clyra-ruid.onrender.com/api/v1/health

The backend is on a free plan and goes to sleep when nobody uses it, so the first load can take up to a minute.

| Role | Email |
|---|---|
| Admin | admin.dev@lpu.in |
| Organizer | organizer.dev@lpu.in |
| Student | student.dev@lpu.in |

The password is whatever `SEED_PASSWORD` was set to when the data was created; ask us for it. These addresses are not real inboxes. All the names, clubs, events and numbers in the demo are made up.

## Running it on your own machine
You need Node.js 18 or newer and a free MongoDB Atlas cluster.

1. In Atlas, create a database user, allow your IP address under Network Access, and copy the connection string. Add `/clyra` after the host name.
2. Backend:
   ```bash
   cd server
   cp .env.example .env     # fill in MONGODB_URI and JWT_SECRET
   npm install
   npm run seed
   node src/seedShowcase.js
   node src/seedRealistic.js
   npm run dev              # http://localhost:5001
   ```
3. Frontend, in a second terminal:
   ```bash
   cd client
   cp .env.local.example .env.local
   npm install
   npm run dev              # http://localhost:3000
   ```

The three seed scripts add the demo accounts, 7 categories, the 12 campus venues, some clubs and events, and demo students with registrations. Run them in that order. `node src/seedRealistic.js --reset` clears the demo students and rebuilds them.

## Deploying
The database is Atlas, the backend is on Render and the website is on Vercel.

1. Push the repository to GitHub.
2. On Render, create a Web Service with root directory `server`, build command `npm install` and start command `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `ALLOWED_EMAIL_DOMAINS=lpu.in` and `CLIENT_URL` (the Vercel address, no slash at the end).
3. On Vercel, import the repository with root directory `client` and set `API_URL` to the Render address (no slash at the end).
4. Atlas must allow connections from `0.0.0.0/0`, because Render's addresses change.

The website only talks to Vercel, which forwards `/api` calls to Render, so the login cookie stays on one domain. After that, `git push` redeploys both.

## How the code is laid out
```
server/src
  models/       database schemas
  routes/       API routes (auth, events, admin, venues, notifications ...)
  middleware/   login and role checks
  utils/        validation rules, clash maths, email, notifications
  seed*.js, smokeTest.js
client/src
  app/          pages
  components/   screens and UI pieces
  lib/          API helper, hooks, formatting
docs/           one note per module
```
Tech: Next.js 14 and Tailwind CSS on the front, Express on the back, MongoDB with Mongoose, Zod for validation, and JWT in an httpOnly cookie for sign-in.

## Checking that it works
`node src/smokeTest.js` in `server` runs 32 automatic checks against a running API (add the live address to test the deployed one). It covers public data, private fields not leaking, signed-out access, input rules, and what students and admins are and are not allowed to do. Each module note also has a manual checklist. `npm run build` in `client` should finish without errors.

## Things that went wrong along the way
- Two students registering for the last seat at the same moment can both succeed unless the seat count is updated in a single database step. We fixed this in Module 2.
- Double-clicking Submit, or two admins approving the same event, could change its status twice. The status update now only works if the event is still in the expected state.
- Times are stored in UTC and shown in India time. Mixing the two caused wrong times early on.
- File names on Linux are case-sensitive, so imports that worked on a Mac failed on the host.
- Vercel's build failed when it tried to download Google Fonts, so the fonts are now bundled with the project.
- Render's free plan blocks outgoing email, so email is optional and the app works without it.

## What is not done
- Payments, recurring events, saved events and a chatbot.
- Settings page and change password, and a way for an admin to take organizer access back.
- Notifications update by checking every 25 seconds rather than instantly.
- Without an email service, password reset and notification emails are not sent. In-app notifications still work.

## Credits
The look is based on mockups made in Google Stitch. Demo names, images and numbers are samples.

Repository owner: Pranjal Soni, [GitHub](https://github.com/pranjalll1), [LinkedIn](https://www.linkedin.com/in/pranjal-soni24/), pranjalsoni1290@gmail.com
