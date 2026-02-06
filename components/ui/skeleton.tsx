"use client";

interface SkeletonProps {
  className?: string;
  height?: string | number;
}

export function Skeleton({ className = "", height }: SkeletonProps) {
  const style = height
    ? { height: typeof height === "number" ? `${height}px` : height }
    : undefined;
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] bg-[var(--bg-muted)] ${className}`}
      style={style}
      aria-hidden
    />
  );
}
