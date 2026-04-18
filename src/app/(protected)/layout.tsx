import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Signed in as</p>
            <p className="text-sm text-slate-200">{session.user.email}</p>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Settings
            </Link>
            <SignOutButton />
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
