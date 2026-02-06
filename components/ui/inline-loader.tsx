"use client";

interface InlineLoaderProps {
  className?: string;
}

export function InlineLoader({ className = "" }: InlineLoaderProps) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}
