"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/30"
    >
      Sign out
    </button>
  );
}
