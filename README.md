# TrailLedger

**Real-time bike rental visibility for mountain bike parks.** Staff-first rental control: scan out → 5-min buffer → 2-hour timer; scan in → closed. No rider app, no GPS. Just certainty.

## Stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS**
- **Firebase Auth** (staff login)
- **Cloud Firestore** (bikes, rentals, real-time dashboard)
- **QR scanning** via `@zxing/browser` (camera)
- **PWA** (manifest; installable on staff devices)

## Quick start

### 1. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore** database (start in test mode for local dev, then deploy rules).
4. Copy `.env.local.example` to `.env.local` and set:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 2. Firestore index (required for dashboard)

The active-rentals query needs a composite index. In Firestore → Indexes, add:

- **Collection:** `rentals`
- **Fields:** `status` (Ascending), `startedAt` (Descending)

Or run the app once; the console error will include a link to auto-create the index.

### 3. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

(Requires `firebase-tools` and `firebase init` in the project; rules file: `firestore.rules`.)

### 4. Create a staff user

In Firebase Console → Authentication → Users → Add user (email + password). Use this to sign in.

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in → **Setup** → **Seed bikes** (e.g. 20) → **Scan** to check out/in, **Dashboard** for live state.

## Features (MVP)

- **Staff login** (Firebase Auth)
- **Bike inventory** (Firestore `bikes`; seed 10–30 via Setup)
- **Scan OUT** → 5-min buffer → 2-hour rental timer starts; bike marked OUT
- **Scan IN** → closes rental, bike available again
- **Live dashboard** → On time (green) / Approaching (amber) / Overdue (red)

## QR codes for bikes

Each seeded bike has an ID like `TL-001`, `TL-002`, … For demo, you can:

- Generate a QR code that encodes the bike ID (e.g. `TL-001`) and print it or show it on a second device to scan.
- Use any QR generator (e.g. [qr-code-generator.com](https://www.qr-code-generator.com/)) with plain text `TL-001`, etc.

## Project layout

- `app/(auth)/login` — staff login
- `app/(dashboard)/` — dashboard (active rentals), scan, setup
- `lib/` — Firebase init, auth context, Firestore helpers, rental timing utils
- `components/` — e.g. SignOutButton
- `public/manifest.json` — PWA manifest

## Constants (`lib/constants.ts`)

- `BUFFER_MINUTES = 5`
- `RENTAL_DURATION_MINUTES = 120` (2 hours)
- `GRACE_MINUTES = 5` (after rental end before “overdue”)
- `WARN_BEFORE_END_MINUTES = 15` (amber “approaching limit”)

---

*TrailLedger - No guessing. No follow-up calls. Clear accountability.*
