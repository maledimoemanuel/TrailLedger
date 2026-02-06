"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  heading: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-10 text-center">
      <p className="text-4xl text-[var(--text-faint)]" aria-hidden>
        —
      </p>
      <h2 className="mt-4 text-lg font-semibold text-[var(--text)]">{heading}</h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
