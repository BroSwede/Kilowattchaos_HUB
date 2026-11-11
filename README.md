# Kilowattchaos Hub

The team website for FTC team Kilowattchaos: the robot in 3D, build ideas and prints, learning paths, code, crew and the season logbook.

## What's in it

- **Accounts for students and mentors.** These are mentor-supervised team accounts:
  - Students sign up with the team's Team Code, a nickname and a robot avatar.
  - A parent or guardian gives permission through a link the mentor sends.
  - A mentor turns the account on.
  - There are no real names, no private messages, and nothing public.
- **Mentor tools at `/mentor`:**
  - approve students
  - parent permission status
  - turn accounts off
  - new passwords
  - the Team Code
  - the chat switch, which needs a second youth-protection-trained adult
  - recent activity
- **Check-in:** the shop TV shows a daily code and QR code, and students scan it with their own phones.
- **The hub (`/hub`):** Home, Robot, Build, Learn, Code, Crew and Logbook. Everything the team adds is saved in the database.
- **The robot:** goBILDA's StarterBot, converted straight from goBILDA's STEP file at full detail.
  - 418 parts and 28.1 million triangles.
  - It is served as four gzip parts (107 MB) and cached by the browser after the first load.

## Testing and building mode (on by default)

Until the team goes live, the hub runs in **testing and building mode**:

- The site opens on a pretend sign-in page. Any nickname (or none) gets in, and no password is checked.
- Everything inside is sample content (chat, build ideas, meetings, tasks, prints). Anything a visitor adds stays in their own browser tab and is gone on reload.
- Setup, join, the mentor console and the data API are switched off, so nothing reaches the database.

To go live, add `HUB_MODE` = `live` in Vercel (**Settings → Environment Variables**) and redeploy. Then follow the steps below.

## Put it online (Vercel)

1. On vercel.com: **Add New → Project**, then import this GitHub repo. Keep the defaults and deploy.
2. In the project, open **Storage → Create → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL`.
3. Open **Settings → Environment Variables** and add:
   - `SETUP_KEY`: any secret phrase.
   - `TEAM_TIMEZONE`: optional. The default is `America/New_York`.
4. Redeploy (**Deployments → ⋯ → Redeploy**).
5. Open the site. It goes to `/setup`. Enter the setup key and make your mentor account.
6. In `/mentor`, copy the Team Code and the `/join` link for the students.

Without `DATABASE_URL`, the site runs on a temporary built-in database and says so in a banner. That's fine for a look around, but data can disappear.

## Run it on a laptop

```
npm install
npm run build && SETUP_KEY=anything npm start   # http://localhost:3000
```

On a laptop the database lives in `.data/`. Delete that folder to start fresh.

## How it's built

- **App:** Next.js (App Router). The server code is in `src/`:
  - `lib/db.ts`: the Postgres or PGlite driver.
  - `lib/schema.ts`: the tables.
  - `lib/auth.ts`: sessions.
  - `lib/kinds.ts`: what can be saved, and who can see, add and edit it.
  - `app/api/records/*`: one small API for all team data.
  - `app/actions.ts`: sign-up, sign-in, consent, check-in and the mentor tools.
- **The hub's screens** are plain JavaScript modules in `public/hub/`. They are the approved design preview, now reading and writing the API through `public/hub/api.js`. Each zone is one file in `public/hub/zones/`.
- **Robot model files:** `public/hub/model/`. The conversion scripts live with the team's project files.
- **End-to-end check:** `node scripts/e2e.cjs http://localhost:3000`. It needs Playwright and a fresh database, and runs setup, join, consent, approve, sign-in, check-in and permission checks.

## BioBuzz XR (`/biobuzz-xr`)

`public/biobuzz-xr/` is a static build of the laptop site from the BioBuzzXR project (`web/` folder): its hub, Robot Lab, Match Day, Driver Academy and Code Lab. The Code zone's **BioBuzz XR** page links to it. It is built on the open-source BIOBUZZ Digital Twin by the Camels Hump Coders (MIT, see `public/biobuzz-xr/LICENSE.txt`).

To update it, rebuild from the BioBuzzXR project and replace the folder:

```
cd BioBuzzXR/web
pnpm install
BASE_PATH=/biobuzz-xr/ pnpm exec vite build
# then copy everything in dist/ over public/biobuzz-xr/ in this repo
```

The Quest app is not hosted here. It installs from the shop laptop with `install-quest.bat` in the BioBuzzXR project.

## Sample data on Home

While a team has no records of a kind yet, the Home dashboard and the Shop TV show sample events, tasks, a plan, prints, session notes and shoutouts (`public/hub/sample.js`), each card tagged "Sample". They are never saved. As soon as the team saves its first real record of a kind, that list switches to the real ones.

