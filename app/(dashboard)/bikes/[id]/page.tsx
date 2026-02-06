"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBikeById, getRentalsByBikeDocId } from "@/lib/firestore";
import { getParkConfig } from "@/lib/config";
import { getReturnStatus, formatRenterDisplay, toDate } from "@/lib/rental-utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Timestamp } from "firebase/firestore";
import type { Bike, Rental } from "@/lib/types";
import type { ParkConfig } from "@/lib/types";

function formatTime(ts: Timestamp): string {
  const d = toDate(ts);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export default function BikeDetailPage() {
  const params = useParams();
  const docId = typeof params?.id === "string" ? params.id : "";
  const [bike, setBike] = useState<Bike | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!docId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getBikeById(docId)
      .then((b) => {
        if (!cancelled) {
          setBike(b ?? null);
          setNotFound(!b);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    Promise.all([
      getRentalsByBikeDocId(docId, 20),
      getParkConfig(),
    ]).then(([list, cfg]) => {
      if (!cancelled) {
        setRentals(list);
        setConfig(cfg ?? null);
      }
    });
    return () => { cancelled = true; };
  }, [docId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (notFound || !bike) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Bike not found
        </h1>
        <p className="text-[var(--text-muted)]">
          This bike may have been removed or the link is invalid.
        </p>
        <Link
          href="/bikes"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Back to bike list
        </Link>
      </div>
    );
  }

  const photoUrls = bike.photoUrls ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/bikes"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← Back to bike list
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
            {bike.label ?? bike.bikeId}
          </h1>
          <p className="font-mono text-[var(--text-muted)]">{bike.bikeId}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            bike.status === "available"
              ? "bg-[var(--success-bg)] text-[var(--success)]"
              : bike.status === "maintenance"
                ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
          }`}
        >
          {bike.status}
        </span>
      </div>

      {photoUrls.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Photos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photoUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Bike photo ${i + 1}`}
                className="aspect-square rounded-lg border border-[var(--border)] object-cover"
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="flex aspect-video items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-faint)]">
            <span className="text-6xl" aria-hidden>🚲</span>
          </div>
        </section>
      )}

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
          Details
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Model</dt>
            <dd className="text-[var(--text)]">{bike.model ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Size</dt>
            <dd className="text-[var(--text)]">{bike.size ?? "—"}</dd>
          </div>
          {bike.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-[var(--text-faint)]">Notes</dt>
              <dd className="text-[var(--text)]">{bike.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
          Rental history
        </h2>
        {rentals.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">
            No rentals in the last 90 days.
          </p>
        ) : (
          <ul className="space-y-2">
            {rentals.map((r) => {
              const returnedAt = r.returnedAt;
              const status = config && returnedAt
                ? getReturnStatus(r.rentalEndsAt, returnedAt, config)
                : { onTime: true, minutesOverdue: 0 };
              const duration = r.totalMinutes ?? 0;
              const started = r.startedAt ? formatTime(r.startedAt) : "—";
              const returned = returnedAt ? formatTime(returnedAt) : r.status;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--text)]">
                      {started} → {returned}
                    </span>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {formatRenterDisplay(r) !== "—" ? formatRenterDisplay(r) : r.staffEmail} · {duration} min
                      {status.onTime ? (
                        <span className="ml-1 text-[var(--success)]">On time</span>
                      ) : (
                        <span className="ml-1 text-[var(--danger)]">
                          {status.minutesOverdue} min overdue
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/rentals/${r.id}`}
                    className="shrink-0 text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    View
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div>
        <Link
          href="/scan"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Scan to rent
        </Link>
      </div>
    </div>
  );
}
