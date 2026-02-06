/**
 * Upload a bike photo via the API (Supabase Storage).
 * Path: bike-photos/{bikeDocId}/{uuid}-{filename}
 */
export async function uploadBikePhoto(
  bikeDocId: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("bikeDocId", bikeDocId);

  const res = await fetch("/api/upload-bike-photo", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "Upload failed");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
