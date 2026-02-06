"use client";

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Loading…" }: PageLoaderProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
        aria-hidden
      />
      {message && (
        <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
