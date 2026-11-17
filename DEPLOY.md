# Deploy Clyra (about 60 minutes)

Frontend on **Vercel**, backend on **Render**, database on your existing **Atlas** cluster. All free. The seed data is already in Atlas, so nothing needs copying.

## 0. Check before you push
- [ ] `server`: `for f in $(find src -name '*.js'); do node --check "$f" || echo BROKEN $f; done` prints nothing.
- [ ] `client`: `npm run build` ends with the route list and no errors.
- [ ] `git status` shows no `.env` or `.env.local` files, and `.gitignore` lists `node_modules`, `.env`, `.env.local`, `.next`.
- [ ] Import capitals match file names exactly (Linux is case-sensitive, your Mac is not).
- [ ] The Atlas string has `/clyra` after the host, and Atlas **Network Access** allows `0.0.0.0/0`.

## 1. Push to GitHub
```bash
cd ~/Downloads/clyra-events
git add -A
git commit -m "feat: remove email verification, realistic seed data"
git push
```
(First time only: `git init`, create an empty repo on github.com, then `git remote add origin <url>` and `git push -u origin main`.)

## 2. Backend on Render
1. render.com > **New** > **Web Service** > pick the repo.
2. **Root Directory** `server`, **Build** `npm install`, **Start** `npm start`, **Instance** Free, **Health Check Path** `/api/v1/health`.
3. Environment variables (do not set `PORT`):

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas string with `/clyra` |
| `JWT_SECRET` | a new long random string |
| `ALLOWED_EMAIL_DOMAINS` | `lpu.in` |
| `CLIENT_URL` | your Vercel address (set after step 3) |

4. Deploy, then open `https://YOUR-APP.onrender.com/api/v1/health`: it must show `{"ok":true}`.

## 3. Frontend on Vercel
1. vercel.com > **Add New** > **Project** > import the repo.
2. **Root Directory** `client` (Framework: Next.js).
3. Environment variable `API_URL` = your Render address, no trailing slash.
4. Deploy and copy the address, for example `https://clyra-xyz.vercel.app`.

## 4. Connect them
In Render set `CLIENT_URL` to the Vercel address (no trailing slash). It redeploys by itself. The browser only talks to Vercel, which forwards `/api` to Render, so the login cookie stays same-origin.

## 5. Test the live site
```bash
cd server
SMOKE_STUDENT_EMAIL=student.dev@lpu.in SMOKE_STUDENT_PASSWORD='YOUR-SEED-PASSWORD' SMOKE_ADMIN_EMAIL=admin.dev@lpu.in SMOKE_ADMIN_PASSWORD='YOUR-SEED-PASSWORD' node src/smokeTest.js https://YOUR-SITE.vercel.app
```
Then in the browser:
- [ ] Create a student account: you are signed in straight away.
- [ ] Create an organizer account: you land on the request form. Approve it as admin.
- [ ] Organizer creates and submits an event, admin approves it, it appears on `/events`.
- [ ] A student registers and sees the QR ticket in My bookings.

The free Render service sleeps after 15 minutes idle, so the first request can take up to a minute. A free UptimeRobot monitor on the health URL keeps it awake.

## Optional: email
Without an email service the app still works. In-app notifications work, but password reset and notification emails are not sent. To enable them: create a free Brevo account, confirm a sender address, and add `BREVO_API_KEY`, `MAIL_SENDER_EMAIL` and `MAIL_SENDER_NAME` on Render. Add `NEXT_PUBLIC_PASSWORD_RESET=true` on Vercel to show the forgot-password link. Redeploy both.

## Updating later
`git add -A`, `git commit -m "fix: ..."`, `git push`. Vercel and Render redeploy on their own.
