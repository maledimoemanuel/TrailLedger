import { NextRequest, NextResponse } from "next/server";
import { supabase, BUCKET_BIKE_PHOTOS } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const bikeDocId = formData.get("bikeDocId") as string | null;

  if (!file || typeof bikeDocId !== "string" || !bikeDocId.trim()) {
    return NextResponse.json(
      { error: "Missing file or bikeDocId" },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "File must be an image" },
      { status: 400 }
    );
  }

  const uniqueId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `${bikeDocId.trim()}/${uniqueId}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_BIKE_PHOTOS)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_BIKE_PHOTOS)
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
