"use client";

import { useEffect } from "react";
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
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between">
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
          <nav className="flex w-full items-center gap-1 overflow-x-auto sm:w-auto sm:justify-end">
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
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
