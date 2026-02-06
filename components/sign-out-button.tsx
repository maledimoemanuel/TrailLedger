"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="no-tap rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
    >
      Sign out
    </button>
  );
}
