"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { getAllBikes, getBikeByBikeId, updateBikeStatus, deleteBike } from "@/lib/firestore";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineLoader } from "@/components/ui/inline-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TagScannerModal } from "@/components/bikes/tag-scanner-modal";
import { AddBikeModal } from "@/components/bikes/add-bike-modal";
import type { Bike } from "@/lib/types";

function statusBadgeClass(status: Bike["status"]): string {
  switch (status) {
    case "available":
      return "bg-[var(--success-bg)] text-[var(--success)]";
    case "out":
      return "bg-[var(--bg-muted)] text-[var(--text-muted)]";
    case "overdue":
      return "bg-[var(--danger-bg)] text-[var(--danger)]";
    case "maintenance":
      return "bg-[var(--warning-bg)] text-[var(--warning)]";
    default:
      return "bg-[var(--bg-muted)] text-[var(--text-muted)]";
  }
}

export default function BikesPage() {
  const toast = useToast();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [preFilledBikeId, setPreFilledBikeId] = useState("");
  const [bikeToRemove, setBikeToRemove] = useState<Bike | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [maintenanceId, setMaintenanceId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const handleTagScanned = useCallback(
    async (code: string) => {
      const bike = await getBikeByBikeId(code);
      if (bike) {
        toast.error("This tag is already registered.");
        return;
      }
      setPreFilledBikeId(code);
      setScanModalOpen(false);
      setAddModalOpen(true);
    },
    [toast]
  );

  async function load() {
    try {
      const list = await getAllBikes();
      setBikes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bikes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredBikes = useMemo(() => {
    if (!filter.trim()) return bikes;
    const q = filter.trim().toLowerCase();
    return bikes.filter(
      (b) =>
        b.bikeId.toLowerCase().includes(q) ||
        (b.label ?? "").toLowerCase().includes(q)
    );
  }, [bikes, filter]);

  async function handleMaintenance(bike: Bike) {
    const next =
      bike.status === "maintenance" ? "available" : "maintenance";
    setError(null);
    setMaintenanceId(bike.id);
    try {
      await updateBikeStatus(bike.id, next);
      await load();
      toast.success(next === "maintenance" ? "Bike marked as maintenance" : "Bike available");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      setError(msg);
      toast.error(msg);
    } finally {
      setMaintenanceId(null);
    }
  }

  function openRemoveConfirm(bike: Bike) {
    setBikeToRemove(bike);
    setError(null);
  }

  async function handleConfirmRemove() {
    if (!bikeToRemove) return;
    setDeleting(true);
    try {
      await deleteBike(bikeToRemove.id);
      setBikeToRemove(null);
      await load();
      toast.success("Bike removed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to remove bike";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-12 w-32" />
        </div>
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <Skeleton className="h-5 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Bike inventory
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Add, remove, or mark bikes as maintenance. Maintenance bikes cannot be rented.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/50 bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search by bike ID or label…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Search bikes"
          className="min-w-[200px] max-w-xs rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setScanModalOpen(true)}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-4 font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Add bike
        </button>
      </div>

      <TagScannerModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onCodeScanned={handleTagScanned}
      />

      <AddBikeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        preFilledBikeId={preFilledBikeId}
        onSaved={() => {
          load();
          toast.success("Bike added");
        }}
      />

      <ConfirmDialog
        open={!!bikeToRemove}
        onClose={() => setBikeToRemove(null)}
        onConfirm={handleConfirmRemove}
        title={bikeToRemove ? `Remove bike ${bikeToRemove.bikeId}?` : "Remove bike?"}
        description="This cannot be undone."
        confirmLabel="Remove bike"
        variant="danger"
        loading={deleting}
      />

      {bikes.length === 0 ? (
        <EmptyState
          heading="No bikes"
          description="Click Add bike to scan a tag and register a new bike."
          action={
            <button
              type="button"
              onClick={() => setScanModalOpen(true)}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-6 font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Add bike
            </button>
          }
        />
      ) : filteredBikes.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center text-sm text-[var(--text-muted)]">
          No bikes match &quot;{filter}&quot;.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {filteredBikes.map((bike) => (
            <li key={bike.id}>
              <div className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-card)] transition-[border-color,shadow] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-modal)]/30 focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2">
                <Link
                  href={`/bikes/${bike.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-lg outline-none focus:ring-0"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]">
                    {bike.photoUrls?.[0] ? (
                      <img
                        src={bike.photoUrls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-2xl text-[var(--text-faint)]" aria-hidden>🚲</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-bold text-[var(--text)]">
                        {bike.bikeId}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(bike.status)}`}
                      >
                        {bike.status}
                      </span>
                    </div>
                    {bike.label && bike.label !== bike.bikeId && (
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        {bike.label}
                      </p>
                    )}
                    {(bike.model || bike.size) && (
                      <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                        {[bike.model, bike.size].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
                <div
                  className="flex flex-shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleMaintenance(bike)}
                    disabled={maintenanceId === bike.id}
                    className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] disabled:opacity-60"
                    title={bike.status === "maintenance" ? "Mark available" : "Mark maintenance"}
                  >
                    {maintenanceId === bike.id ? (
                      <InlineLoader className="h-4 w-4" />
                    ) : (
                      bike.status === "maintenance" ? "Available" : "Maintenance"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openRemoveConfirm(bike)}
                    disabled={!!bikeToRemove}
                    className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] disabled:opacity-50"
                    title="Remove bike"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
