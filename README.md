# Clyra campus events: Slice 0 (accounts)

Next.js client (`/client`) + Express API (`/server`) + MongoDB Atlas.
This slice delivers: register with a college email, email verification, sign in/out, current user, role middleware, and the shared UI tokens from the Stitch design.

## 1. MongoDB Atlas (free tier)
1. Create an account at mongodb.com/atlas, then create a free **M0** cluster.
2. **Database Access** > add a database user (username + password).
3. **Network Access** > add your current IP (or `0.0.0.0/0` for development only).
4. **Connect** > Drivers > copy the connection string. Put your user/password in it and add `/clyra` before the `?`.

## 2. Run the API
```bash
cd server
cp .env.example .env     # fill MONGODB_URI and JWT_SECRET (any long random string)
npm install
npm run seed             # optional: admin.dev / organizer.dev / student.dev @lpu.in
npm run dev              # http://localhost:5000
```
With no SMTP settings, verification links are **printed in the server console**.

## 3. Run the client
```bash
cd client
npm install
npm run dev              # http://localhost:3000
```
Next.js proxies `/api/*` to `http://localhost:5000` (set `API_URL` to change it).

## Slice 0 acceptance checklist
- [ ] Registering with a non-`@lpu.in` email is rejected with a clear message.
- [ ] Registering with an `@lpu.in` email creates the user and prints a verification link.
- [ ] Signing in before verifying shows "Verify your email" and offers a new link.
- [ ] Opening the link verifies the email; opening it a second time shows an error.
- [ ] Signing in sets an httpOnly cookie; the header shows your name and role; refresh keeps you signed in.
- [ ] Sign out clears the cookie and the header returns to Sign in.
- [ ] `GET /api/v1/users/me` returns 401 when signed out and the user when signed in.
- [ ] In MongoDB, `passwordHash` is a bcrypt hash and no plain password or raw token is stored.
- [ ] A student account has role `student` (nothing on the sign-up form can change that).

## Design notes (deliberate changes to the Stitch screens)
- Campus selector replaced by a static "LPU" label (single campus).
- Affiliation chips, magic code, SSO/Google buttons and compliance badges are left out for now.
- Coral buttons use **onyx** text (Stitch's light text on coral is ~3.1:1, below AA).
- `ink-muted` (#5B5B66) replaces Ink Ghost for readable small text.

## Not in this slice
Forgot/reset password, automated tests (Supertest), Google sign-in. Events, venues and the organizer form start in Slice 1.
