"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { InlineLoader } from "@/components/ui/inline-loader";
import { addBike, updateBikePhotoUrls } from "@/lib/firestore";
import { uploadBikePhoto } from "@/lib/storage";

const MAX_PHOTOS = 10;

interface AddBikeModalProps {
  open: boolean;
  onClose: () => void;
  preFilledBikeId?: string;
  onSaved?: () => void;
}

export function AddBikeModal({
  open,
  onClose,
  preFilledBikeId = "",
  onSaved,
}: AddBikeModalProps) {
  const [bikeId, setBikeId] = useState("");
  const [label, setLabel] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBikeId(preFilledBikeId.toUpperCase().trim());
      setLabel("");
      setModel("");
      setSize("");
      setNotes("");
      setPhotoFiles([]);
      setError(null);
    }
  }, [open, preFilledBikeId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) => f.type.startsWith("image/"));
    setPhotoFiles((prev) => {
      const next = [...prev, ...images].slice(0, MAX_PHOTOS);
      return next;
    });
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = bikeId.trim();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const docId = await addBike(id, label.trim() || undefined, {
        model: model.trim() || undefined,
        size: size.trim() || undefined,
        notes: notes.trim() || undefined,
        photoUrls: [],
      });
      const urls: string[] = [];
      for (const file of photoFiles) {
        try {
          const url = await uploadBikePhoto(docId, file);
          urls.push(url);
        } catch {
          // Continue with other photos; bike will have partial photos
        }
      }
      if (urls.length > 0) {
        await updateBikePhotoUrls(docId, urls);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add bike");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabelledBy="add-bike-title"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 id="add-bike-title" className="text-lg font-semibold text-[var(--text)]">
          Add bike
        </h2>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/50 bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="add-bike-id" className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Tag / Bike ID
          </label>
          <input
            id="add-bike-id"
            type="text"
            required
            value={bikeId}
            onChange={(e) => setBikeId(e.target.value.toUpperCase().trim())}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            placeholder="e.g. TL-001"
          />
        </div>

        <div>
          <label htmlFor="add-bike-label" className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Bicycle name
          </label>
          <input
            id="add-bike-label"
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            placeholder="e.g. Blue cruiser"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-bike-model" className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
              Model (optional)
            </label>
            <input
              id="add-bike-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              placeholder="Model"
            />
          </div>
          <div>
            <label htmlFor="add-bike-size" className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
              Size (optional)
            </label>
            <input
              id="add-bike-size"
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              placeholder="e.g. M, 52cm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="add-bike-notes" className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Notes (optional)
          </label>
          <textarea
            id="add-bike-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            placeholder="Any notes"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
            Photos (optional, up to {MAX_PHOTOS})
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Add photos"
          />
          <div className="flex flex-wrap gap-2">
            {photoFiles.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <span className="text-2xl">+</span>
              </button>
            )}
            {photoFiles.map((file, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${i + 1}`}
                  className="h-20 w-20 flex-shrink-0 rounded-lg border border-[var(--border)] object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 font-medium text-[var(--text)] hover:bg-[var(--bg-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !bikeId.trim() || !label.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {saving ? (
              <>
                <InlineLoader className="h-4 w-4 border-white" />
                <span>Saving…</span>
              </>
            ) : (
              "Save bike"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
