"use client";

import { useState, useEffect } from "react";
import {
  getRentalsByDateRange,
  subscribeActiveRentals,
} from "@/lib/firestore";
import { getParkConfig as getConfig } from "@/lib/config";
import { getMinutesOverdue, toDate } from "@/lib/rental-utils";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Rental } from "@/lib/types";
import type { ParkConfig } from "@/lib/types";

function toCSV(rentals: Rental[]): string {
  const headers = [
    "Bike ID",
    "Staff",
    "Started",
    "Returned",
    "Total min",
    "Status",
  ];
  const rows = rentals.map((r) => [
    r.bikeId,
    r.staffEmail,
    toDate(r.startedAt).toISOString(),
    r.returnedAt ? toDate(r.returnedAt).toISOString() : "",
    r.totalMinutes ?? "",
    r.status,
  ]);
  const escape = (v: string | number) =>
    `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const toast = useToast();
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [dayRentals, setDayRentals] = useState<Rental[]>([]);
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  useEffect(() => {
    const unsub = subscribeActiveRentals(setActiveRentals);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!reportDate) return;
    const start = new Date(reportDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(reportDate);
    end.setHours(23, 59, 59, 999);
    getRentalsByDateRange(start, end)
      .then(setDayRentals)
      .catch(() => setDayRentals([]))
      .finally(() => setLoading(false));
  }, [reportDate]);

  const overdueActive = config
    ? activeRentals.filter((r) => getMinutesOverdue(r.rentalEndsAt, config) > 0)
    : [];
  const checkedOutToday = dayRentals.length;
  const returnedToday = dayRentals.filter((r) => r.status === "returned").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          End-of-day summary, overdue list, and CSV export.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
          </>
        ) : (
          <>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--text-muted)]">Checked out today</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text)]">
                {checkedOutToday}
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--text-muted)]">Returned today</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text)]">
                {returnedToday}
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--danger)]/50 bg-[var(--danger-bg)] p-4 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--danger)]">Currently overdue</p>
              <p className="mt-1 text-2xl font-bold text-[var(--danger)]">
                {overdueActive.length}
              </p>
            </div>
          </>
        )}
      </div>

      <div>
        <label htmlFor="reportDate" className="block text-sm font-medium text-[var(--text)]">
          Date for summary
        </label>
        <input
          id="reportDate"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="mt-2 h-12 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {overdueActive.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Overdue rentals
          </h2>
          <ul className="mt-2 space-y-2">
            {overdueActive.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--danger)]/50 bg-[var(--danger-bg)] px-4 py-2"
              >
                <span className="font-mono font-semibold text-[var(--text)]">
                  {r.bikeId}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {config
                    ? `${getMinutesOverdue(r.rentalEndsAt, config)} min overdue · ${r.staffEmail}`
                    : r.staffEmail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Export CSV
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Export all rentals that started on the selected date.
        </p>
        <button
          type="button"
          onClick={() => {
            const csv = toCSV(dayRentals);
            downloadCSV(csv, `trailledger-rentals-${reportDate}.csv`);
            toast.success("CSV downloaded");
          }}
          disabled={loading || dayRentals.length === 0}
          className="mt-3 h-12 rounded-lg bg-[var(--accent)] px-6 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
