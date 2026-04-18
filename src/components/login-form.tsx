"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleBrandButton } from "@/components/google-brand-button";

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showRegisteredNotice = searchParams.get("registered") === "1";
  const [emailSignInOpen, setEmailSignInOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCredentialsLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  }

  function handleGoogleAuth() {
    void signIn("google", { callbackUrl });
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
      <section aria-labelledby="sign-in-heading">
        <h1 id="sign-in-heading" className="text-2xl font-semibold tracking-tight">
          Sign-in
        </h1>

        {showRegisteredNotice ? (
          <p className="mt-3 text-sm text-emerald-300" role="status">
            Account created. Please sign in.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            id="email-sign-in-toggle"
            aria-expanded={emailSignInOpen}
            aria-controls="email-sign-in-panel"
            onClick={() => setEmailSignInOpen((open) => !open)}
            className="flex w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-100 hover:bg-slate-700"
          >
            Sign in with email and password
          </button>

          <div
            id="email-sign-in-panel"
            role="region"
            aria-labelledby="email-sign-in-toggle"
            hidden={!emailSignInOpen}
            className={
              emailSignInOpen
                ? "rounded-lg border border-slate-700 bg-slate-950/80 p-4"
                : undefined
            }
          >
            {emailSignInOpen ? (
              <form onSubmit={handleCredentialsLogin} className="space-y-3">
                <label className="flex flex-col gap-1 text-sm">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                    required
                    autoComplete="email"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                    required
                    autoComplete="current-password"
                  />
                </label>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-cyan-600/50 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : null}
          </div>

          <GoogleBrandButton label="Sign in with Google" onClick={handleGoogleAuth} />
        </div>
      </section>

      <div className="my-8 h-px bg-slate-700" role="separator" />

      <section aria-labelledby="sign-up-heading">
        <h2 id="sign-up-heading" className="text-lg font-semibold text-slate-100">
          Don&apos;t have an account yet?
        </h2>
        <p className="mt-1 text-sm text-slate-400">Create one now</p>

        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/signup"
            className="flex w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-100 hover:bg-slate-700"
          >
            Sign up with email and password
          </Link>

          <GoogleBrandButton label="Sign up with Google" onClick={handleGoogleAuth} />
        </div>
      </section>
    </div>
  );
}
