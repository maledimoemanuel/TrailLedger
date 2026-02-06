"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { SignOutButton } from "@/components/sign-out-button";
import { PageLoader } from "@/components/ui/page-loader";
import logo from "@/components/assets/Logo.png";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scan", label: "Scan" },
  { href: "/bikes", label: "Bikes" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/reports", label: "Reports" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return <PageLoader message="Loading…" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:h-14">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center no-tap"
            aria-label="Trail Ledger home"
          >
            <Image
              src={logo}
              alt="Trail Ledger"
              height={logo.height}
              width={logo.width}
              className="h-9 w-auto"
              priority
            />
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`no-tap shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-[var(--bg-muted)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </Link>
            ))}
            <span className="ml-2 hidden shrink-0 text-xs text-[var(--text-faint)] no-tap sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </nav>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              className="no-tap inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--bg-muted)]"
            >
              <span className="block h-0.5 w-4 rounded bg-current" />
              <span className="sr-only">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav className="sm:hidden border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="mx-auto max-w-5xl px-4 py-3 space-y-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium no-tap ${
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-[var(--bg-muted)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-[var(--text-faint)]">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </nav>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
