"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  getRentalsByDateRange,
  subscribeActiveRentals,
} from "@/lib/firestore";
import { getParkConfig as getConfig } from "@/lib/config";
import { getMinutesOverdue, getReturnStatus, formatRenterDisplay, toDate } from "@/lib/rental-utils";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Rental } from "@/lib/types";
import type { ParkConfig } from "@/lib/types";

function toCSV(rentals: Rental[]): string {
  const headers = [
    "Bike ID",
    "Renter Name",
    "Renter Email",
    "Renter Phone",
    "Staff",
    "Started",
    "Returned",
    "Total min",
    "Status",
  ];
  const rows = rentals.map((r) => [
    r.bikeId,
    r.renterName ?? "",
    r.renterEmail ?? "",
    r.renterPhone ?? "",
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
  const returnedTodayRentals = dayRentals.filter(
    (r) => r.status === "returned" && r.returnedAt
  );
  const returnedToday = returnedTodayRentals.length;

  const dayMetrics = useMemo(() => {
    const returned = dayRentals.filter(
      (r) => r.status === "returned" && r.totalMinutes != null
    );
    const totalMinutes = returned.reduce((sum, r) => sum + (r.totalMinutes ?? 0), 0);
    const avgDuration =
      returned.length > 0 ? Math.round(totalMinutes / returned.length) : 0;
    let onTime = 0;
    let overdue = 0;
    if (config) {
      for (const r of returned) {
        if (!r.returnedAt) continue;
        const s = getReturnStatus(r.rentalEndsAt, r.returnedAt, config);
        if (s.onTime) onTime++;
        else overdue++;
      }
    }
    return { totalMinutes, avgDuration, onTime, overdue };
  }, [dayRentals, config]);

  const formatTs = (r: Rental, field: "startedAt" | "returnedAt") => {
    const ts = field === "startedAt" ? r.startedAt : r.returnedAt;
    if (!ts) return "—";
    return toDate(ts).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

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
          Report date (day summary)
        </label>
        <input
          id="reportDate"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="mt-2 h-12 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {dayRentals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Day detail — rentals started on {reportDate}
          </h2>
          {(dayMetrics.totalMinutes > 0 || dayMetrics.avgDuration > 0) && (
            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
              <span>Total min rented: <strong className="text-[var(--text)]">{dayMetrics.totalMinutes}</strong></span>
              <span>Avg duration: <strong className="text-[var(--text)]">{dayMetrics.avgDuration} min</strong></span>
              {config && (dayMetrics.onTime > 0 || dayMetrics.overdue > 0) && (
                <span>
                  On time: <strong className="text-[var(--success)]">{dayMetrics.onTime}</strong>
                  {" · "}
                  Overdue: <strong className="text-[var(--danger)]">{dayMetrics.overdue}</strong>
                </span>
              )}
            </div>
          )}
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/50">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Bike ID</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Renter</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Staff</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Started</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Returned</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Duration</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {dayRentals.map((r) => {
                  const status =
                    config && r.returnedAt
                      ? getReturnStatus(r.rentalEndsAt, r.returnedAt, config)
                      : null;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-muted)]/30"
                    >
                      <td className="px-4 py-2 font-mono font-medium text-[var(--text)]">
                        {r.bikeId}
                      </td>
                      <td className="px-4 py-2 text-[var(--text)]">{formatRenterDisplay(r)}</td>
                      <td className="px-4 py-2 text-[var(--text-muted)]">{r.staffEmail}</td>
                      <td className="px-4 py-2 text-[var(--text)]">{formatTs(r, "startedAt")}</td>
                      <td className="px-4 py-2 text-[var(--text)]">{formatTs(r, "returnedAt")}</td>
                      <td className="px-4 py-2 text-[var(--text)]">
                        {r.totalMinutes != null ? `${r.totalMinutes} min` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {r.status === "returned" && status ? (
                          status.onTime ? (
                            <span className="text-[var(--success)]">On time</span>
                          ) : (
                            <span className="text-[var(--danger)]">
                              {status.minutesOverdue} min overdue
                            </span>
                          )
                        ) : (
                          <span className="text-[var(--text-muted)]">{r.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {overdueActive.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Currently overdue
          </h2>
          <ul className="mt-2 space-y-2">
            {overdueActive.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/rentals/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--danger)]/50 bg-[var(--danger-bg)] px-4 py-2 transition-colors hover:bg-[var(--danger-bg)]/80"
                >
                  <span className="font-mono font-semibold text-[var(--text)]">
                    {r.bikeId}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {config
                      ? `${getMinutesOverdue(r.rentalEndsAt, config)} min overdue · ${r.staffEmail}`
                      : r.staffEmail}
                  </span>
                </Link>
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
