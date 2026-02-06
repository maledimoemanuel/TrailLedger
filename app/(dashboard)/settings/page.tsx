"use client";

import { useState, useEffect } from "react";
import { getParkConfig, setParkConfig } from "@/lib/config";
import { useToast } from "@/components/ui/toast";
import { PageLoader } from "@/components/ui/page-loader";
import { InlineLoader } from "@/components/ui/inline-loader";
import type { ParkConfig } from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getParkConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await setParkConfig(config);
      toast.success("Settings saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (config === null) {
    return <PageLoader message="Loading settings…" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Park settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Configure rental timing. Changes apply to new check-outs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        <div>
          <label htmlFor="bufferMinutes" className="block text-sm font-medium text-[var(--text)]">
            Buffer after scan-out (minutes)
          </label>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Time before the rental clock starts — rider can get ready without being charged.
          </p>
          <input
            id="bufferMinutes"
            type="number"
            min={0}
            max={30}
            value={config.bufferMinutes}
            onChange={(e) => setConfig({ ...config, bufferMinutes: Number(e.target.value) || 0 })}
            className="mt-2 h-12 w-full max-w-[8rem] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        <div>
          <label htmlFor="rentalDurationMinutes" className="block text-sm font-medium text-[var(--text)]">
            Rental duration (minutes)
          </label>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Standard rental length (e.g. 120 = 2 hours).
          </p>
          <input
            id="rentalDurationMinutes"
            type="number"
            min={15}
            max={480}
            value={config.rentalDurationMinutes}
            onChange={(e) => setConfig({ ...config, rentalDurationMinutes: Number(e.target.value) || 60 })}
            className="mt-2 h-12 w-full max-w-[8rem] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        <div>
          <label htmlFor="graceMinutes" className="block text-sm font-medium text-[var(--text)]">
            Grace period (minutes)
          </label>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            After rental end, before bike is marked overdue.
          </p>
          <input
            id="graceMinutes"
            type="number"
            min={0}
            max={30}
            value={config.graceMinutes}
            onChange={(e) => setConfig({ ...config, graceMinutes: Number(e.target.value) || 0 })}
            className="mt-2 h-12 w-full max-w-[8rem] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        <div>
          <label htmlFor="warnBeforeEndMinutes" className="block text-sm font-medium text-[var(--text)]">
            Warn before end (minutes)
          </label>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            When to show “nearing limit” (amber) on the dashboard.
          </p>
          <input
            id="warnBeforeEndMinutes"
            type="number"
            min={0}
            max={60}
            value={config.warnBeforeEndMinutes}
            onChange={(e) => setConfig({ ...config, warnBeforeEndMinutes: Number(e.target.value) || 0 })}
            className="mt-2 h-12 w-full max-w-[8rem] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {saving ? (
            <>
              <InlineLoader className="h-4 w-4 border-white" />
              <span>Saving…</span>
            </>
          ) : (
            "Save settings"
          )}
        </button>
      </form>
    </div>
  );
}
