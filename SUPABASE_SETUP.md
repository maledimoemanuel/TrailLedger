# Supabase Storage setup (bike photos)

Use these steps to set up Supabase and get bike photo uploads working.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Pick an organization (or create one), then:
   - **Name**: e.g. `trail-ledger` (or your app name).
   - **Database password**: set and save it somewhere safe.
   - **Region**: choose the one closest to your users.
4. Click **Create new project** and wait for it to finish.

---

## 2. Create a Storage bucket

1. In the project, open **Storage** in the left sidebar.
2. Click **New bucket**.
3. **Name**: `bike-photos` (or `bikes`).
4. Turn **Public bucket** **ON** so image URLs work without signed URLs.
5. Click **Create bucket**.

No extra policies are required for this flow: the app uploads from your Next.js API using the **service role** key; public read is handled by the bucket being public.

---

## 3. Get your keys and env vars

1. In the left sidebar go to **Project Settings** (gear icon).
2. Open **API**.
3. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **service_role** key (under “Project API keys” – **keep this secret**, server-only).
4. In your app root, create or edit `.env.local` and add:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

5. Restart the Next.js dev server so it picks up the new env vars.

---

## 4. Check that it works

1. Run the app and go to **Bikes**.
2. Click **Add bike** → scan or enter a tag → fill in the form and add at least one photo.
3. Save. The bike should appear with the photo; opening the bike detail page should show the image.

If uploads fail, check the browser Network tab for `POST /api/upload-bike-photo` and the terminal for errors. Confirm `.env.local` has the correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
