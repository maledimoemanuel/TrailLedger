import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only Supabase client (uses service role).
 * Use only in API routes or server code; never expose service role to the client.
 */
export const supabase =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey)
    : null;

export const BUCKET_BIKE_PHOTOS = "bike-photos";
