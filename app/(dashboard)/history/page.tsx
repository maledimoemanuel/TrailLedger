"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReturnedRentals } from "@/lib/firestore";
import { getParkConfig } from "@/lib/config";
import { getReturnStatus, formatRenterDisplay, toDate } from "@/lib/rental-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Timestamp } from "firebase/firestore";
import type { Rental } from "@/lib/types";
import type { ParkConfig } from "@/lib/types";

function formatTime(ts: Timestamp): string {
  const d = toDate(ts);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export default function HistoryPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getReturnedRentals(50), getParkConfig()])
      .then(([list, cfg]) => {
        if (!cancelled) {
          setRentals(list);
          setConfig(cfg ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <ul className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <li key={i}>
              <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--danger)]/50 bg-[var(--danger-bg)] p-5 text-[var(--danger)]">
        {error}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Rental history
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Recently returned rentals. On-time vs overdue uses park grace period.
        </p>
      </div>

      {rentals.length === 0 ? (
        <EmptyState
          heading="No returned rentals"
          description="Returned rentals from the last 7 days will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rentals.map((r) => {
            const returnedAt = r.returnedAt;
            const status = config && returnedAt
              ? getReturnStatus(r.rentalEndsAt, returnedAt, config)
              : { onTime: true, minutesOverdue: 0 };
            const duration = r.totalMinutes ?? 0;
            return (
              <li
                key={r.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[var(--text)]">
                        {r.bikeId}
                      </span>
                      {status.onTime ? (
                        <span className="rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
                          On time
                        </span>
                      ) : (
                        <span className="rounded-full bg-[var(--danger-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--danger)]">
                          {status.minutesOverdue} min overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      {formatRenterDisplay(r) !== "—" ? formatRenterDisplay(r) : r.staffEmail}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                      {duration} min · Returned {returnedAt ? formatTime(returnedAt) : "—"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/rentals/${r.id}`}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                  >
                    View
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
