"use client";

import { useState, useEffect } from "react";
import { seedBikes, getAllBikes } from "@/lib/firestore";
import Link from "next/link";

export default function SetupPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState(20);
  const [bikes, setBikes] = useState<number | null>(null);

  async function loadCount() {
    try {
      const list = await getAllBikes();
      setBikes(list.length);
    } catch {
      setBikes(0);
    }
  }

  useEffect(() => {
    loadCount();
  }, []);

  async function handleSeed() {
    setMessage(null);
    setBusy(true);
    try {
      await seedBikes(count);
      setMessage(`Seeded ${count} bikes.`);
      await loadCount();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Setup</h1>
      <p className="text-zinc-400">
        Seed bike inventory. Each bike gets an ID like TL-001, TL-002, …
      </p>
      {bikes !== null && (
        <p className="text-zinc-500">
          Current bikes in inventory: <strong className="text-white">{bikes}</strong>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-zinc-400">
          Number to add:
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 20)}
            className="w-20 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={handleSeed}
          className="rounded-xl bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Seeding…" : "Seed bikes"}
        </button>
      </div>
      {message && (
        <p
          className={
            message.startsWith("Seeded")
              ? "text-emerald-400"
              : "text-red-400"
          }
        >
          {message}
        </p>
      )}
      <Link
        href="/dashboard"
        className="inline-block text-zinc-400 hover:text-white"
      >
        ← Dashboard
      </Link>
    </div>
  );
}
