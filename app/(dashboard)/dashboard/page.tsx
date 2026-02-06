"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeActiveRentals, updateRentalIncidentNote } from "@/lib/firestore";
import { getParkConfig } from "@/lib/config";
import {
  getDashboardState,
  getRemainingMinutes,
  getElapsedMinutes,
  getMinutesOverdue,
  toDate,
} from "@/lib/rental-utils";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineLoader } from "@/components/ui/inline-loader";
import type { Rental } from "@/lib/types";
import type { ParkConfig } from "@/lib/types";
import Link from "next/link";

function sortRentalsForDashboard(rentals: Rental[], config: ParkConfig): Rental[] {
  return [...rentals].sort((a, b) => {
    const stateA = getDashboardState(a.bufferEndsAt, a.rentalEndsAt, a.returnedAt, a.status, config);
    const stateB = getDashboardState(b.bufferEndsAt, b.rentalEndsAt, b.returnedAt, b.status, config);
    const order = { overdue: 0, approaching: 1, on_time: 2, buffer: 3 };
    const diff = (order[stateA] ?? 4) - (order[stateB] ?? 4);
    if (diff !== 0) return diff;
    const overdueA = getMinutesOverdue(a.rentalEndsAt, config);
    const overdueB = getMinutesOverdue(b.rentalEndsAt, config);
    if (stateA === "overdue" && stateB === "overdue") return overdueB - overdueA;
    const endA = toDate(a.rentalEndsAt).getTime();
    const endB = toDate(b.rentalEndsAt).getTime();
    return endA - endB;
  });
}

export default function DashboardPage() {
  const toast = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incidentUpdating, setIncidentUpdating] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    getParkConfig().then(setConfig).catch(() => setConfig(null));
    try {
      unsub = subscribeActiveRentals(setRentals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rentals");
    }
    return () => unsub?.();
  }, []);

  const sortedRentals = useMemo(() => {
    if (!config) return rentals;
    return sortRentalsForDashboard(rentals, config);
  }, [rentals, config]);

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
          Active rentals
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Overdue first · Green = on time · Amber = nearing limit · Red = overdue
        </p>
      </div>

      {!config ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : sortedRentals.length === 0 ? (
        <EmptyState
          heading="No active rentals"
          description="Scan a bike to check out. Rentals will appear here with status (on time, nearing limit, or overdue)."
          action={
            <Link
              href="/scan"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-6 font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Scan bike
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sortedRentals.map((r, index) => {
            const state = getDashboardState(
              r.bufferEndsAt,
              r.rentalEndsAt,
              r.returnedAt,
              r.status,
              config
            );
            const remaining = getRemainingMinutes(r.rentalEndsAt);
            const elapsed = getElapsedMinutes(r.startedAt);
            const minsOverdue = getMinutesOverdue(r.rentalEndsAt, config);
            const startedAtStr = toDate(r.startedAt).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            });
            const rentalEndStr = toDate(r.rentalEndsAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });

            const isOverdue = state === "overdue";
            const isApproaching = state === "approaching";
            const isBuffer = state === "buffer";

            const cardBg = isOverdue
              ? "bg-[var(--danger-bg)] border-[var(--danger)]/60"
              : isApproaching
                ? "bg-[var(--warning-bg)] border-[var(--warning)]/60"
                : isBuffer
                  ? "bg-[var(--bg-muted)] border-[var(--border)]"
                  : "bg-[var(--success-bg)] border-[var(--success)]/50";

            return (
              <li
                key={r.id}
                className={`animate-in-up rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-card)] ${cardBg}`}
                style={{ animationDelay: `${index * 40}ms` } as React.CSSProperties}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xl font-bold text-[var(--text)]">
                      {r.bikeId}
                    </span>
                    <span className="ml-2 text-sm text-[var(--text-muted)]">
                      {r.staffEmail}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {isBuffer && (
                      <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 font-medium text-[var(--text-muted)]">
                        Buffer — rental starts in {remaining} min
                      </span>
                    )}
                    {state === "on_time" && (
                      <span className="rounded-full bg-[var(--success)]/20 px-3 py-1 font-medium text-[var(--success)]">
                        On time
                      </span>
                    )}
                    {isApproaching && (
                      <span className="rounded-full bg-[var(--warning)]/20 px-3 py-1 font-medium text-[var(--warning)]">
                        {remaining} min left
                      </span>
                    )}
                    {isOverdue && (
                      <span className="rounded-full bg-[var(--danger)] px-3 py-1 font-semibold text-white">
                        {minsOverdue} min overdue
                      </span>
                    )}
                    <span className="text-[var(--text-muted)]">
                      Out {elapsed} min
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-faint)]">
                  <span>Checked out {startedAtStr} by {r.staffEmail}</span>
                  <span>Rental ends {rentalEndStr}</span>
                </div>
                {isOverdue && (
                  <div className="mt-3 flex items-center gap-2">
                    {r.incidentNote ? (
                      <span className="text-xs text-[var(--text-muted)]">
                        Incident: {r.incidentNote}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setIncidentUpdating(r.id);
                          try {
                            await updateRentalIncidentNote(
                              r.id,
                              `Noted at ${new Date().toLocaleString()}`
                            );
                            toast.success("Incident noted");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to save");
                          } finally {
                            setIncidentUpdating(null);
                          }
                        }}
                        disabled={incidentUpdating === r.id}
                        className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] disabled:opacity-50"
                      >
                        {incidentUpdating === r.id ? (
                          <>
                            <InlineLoader className="h-3 w-3" />
                            <span>Noting…</span>
                          </>
                        ) : (
                          "Incident noted"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
