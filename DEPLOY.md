# Deploy Clyra tonight (about 60 to 90 minutes)

Frontend on **Vercel**, backend on **Render**, database on your existing **Atlas** cluster. All three have free tiers.

## 0. Before you start
- [ ] `git status` shows no `.env` or `.env.local` files. Push the project to GitHub (private repo is fine).
- [ ] Atlas **Network Access** allows `0.0.0.0/0` (Render's free outbound IPs change).
- [ ] You can sign in locally with the new Batch 1 and Batch 2 code.

## 1. Edits in `server/src/index.js` (if you have not made them yet)
```js
import notificationRoutes from './routes/notifications.js';
import organizerApplicationRoutes from './routes/organizerApplications.js';
import adminDashboardRoutes from './routes/adminDashboard.js';

app.set('trust proxy', 1);   // right after `const app = express();`

app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/organizer-applications', organizerApplicationRoutes);
app.use('/api/v1/admin-dashboard', adminDashboardRoutes);
```
`trust proxy` is needed behind Render's load balancer so rate limiting sees real visitor IPs.

## 2. Email that works on Render (Brevo, free)
Render's free tier **blocks SMTP ports (25, 465, 587)**, so Gmail SMTP will not work there. Use Brevo's HTTP API (300 emails a day free):
1. Create a free account at brevo.com.
2. **Senders & IP** > add `pranjalsoni1290@gmail.com` as a sender and click the confirmation link in your inbox.
3. **SMTP & API** > **API keys** > create a key and copy it.
Server env vars: `BREVO_API_KEY`, `MAIL_SENDER_EMAIL=pranjalsoni1290@gmail.com`, `MAIL_SENDER_NAME=Clyra`.
Emails from a Gmail sender may land in spam. Tell reviewers to check spam, or show the flow with a screenshot.

## 3. Backend on Render
1. render.com > **New** > **Web Service** > connect your GitHub repo.
2. **Root Directory**: `server`. **Build Command**: `npm install`. **Start Command**: `npm start`. **Instance type**: Free.
3. **Health Check Path**: `/api/v1/health`.
4. Environment variables:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas string (with `/clyra`) |
| `JWT_SECRET` | a new long random string (not your dev one) |
| `CLIENT_URL` | your Vercel URL, set in step 5 (no trailing slash) |
| `ALLOWED_EMAIL_DOMAINS` | `lpu.in` |
| `BREVO_API_KEY`, `MAIL_SENDER_EMAIL`, `MAIL_SENDER_NAME` | from step 2 |

5. Deploy. Open `https://YOUR-APP.onrender.com/api/v1/health`. It must show `{"ok":true}`.

Free instances **sleep after 15 minutes idle**, so the first visit can take up to a minute. Create a free monitor at uptimerobot.com that calls the health URL every 5 minutes to keep it awake during evaluation.

## 4. Frontend on Vercel
1. vercel.com > **Add New** > **Project** > import the same repo.
2. **Root Directory**: `client`. Framework: Next.js (auto-detected).
3. Environment variables:

| Name | Value |
|---|---|
| `API_URL` | `https://YOUR-APP.onrender.com` (no trailing slash) |

4. Deploy and copy the URL, for example `https://clyra-xyz.vercel.app`.

## 5. Connect them
In Render, set `CLIENT_URL` to the Vercel URL and let the service redeploy. This makes email links and CORS point at the right place. Because the browser only talks to Vercel (which forwards `/api` to Render), the login cookie stays same-origin and works.

## 6. Data
Your local and deployed apps share the same Atlas database, so the data already exists. Run `npm run seed` and `node src/seedShowcase.js` (from `server`) if you have not.

## 7. Smoke test on the live URL
- [ ] Home page and `/events` load with events and images.
- [ ] Create an account with an `@lpu.in` email; the verification email arrives (check spam).
- [ ] Sign in, header shows your name; refresh keeps you signed in.
- [ ] Forgot password email arrives and the reset works.
- [ ] Organizer: create an event, submit it. Admin: approve it. It appears on `/events`.
- [ ] Student: register for an event; the ticket shows in My bookings; the bell shows a notification (after the triggers below are added).
- [ ] Student applies at `/become-organizer`; the admin sees it under **Organizer requests** and in the bell.
- [ ] Admin approves: the student gets a notification and an email, and can now open **Your events**.
- [ ] Admin rejects another request with a reason: the student sees the reason and still cannot create events.
- [ ] Sign out works.

Automated checks against the live API (from the `server` folder):
```bash
node src/smokeTest.js https://YOUR-APP.onrender.com
```
To include the signed-in checks, add the `SMOKE_STUDENT_*` and `SMOKE_ADMIN_*` variables (see the top of `smokeTest.js`).

## Known limits (say these in the viva)
- Free backend sleeps when idle; reminders on a schedule are not included for that reason.
- Notifications update by polling every 25 seconds, not a permanent connection.
- Email comes from a single verified sender address.
