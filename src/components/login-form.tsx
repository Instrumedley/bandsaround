"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthForm } from "@/components/google-oauth-form";

type LoginFormProps = {
  callbackUrl: string;
  googleOAuthConfigured: boolean;
};

export function LoginForm({ callbackUrl, googleOAuthConfigured }: LoginFormProps) {
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

  return (
    <div className="w-full max-w-md rounded-xl border border-brand-border bg-brand-surface p-6">
      <section aria-labelledby="sign-in-heading">
        <h1 id="sign-in-heading" className="text-2xl font-semibold tracking-tight">
          Sign-in
        </h1>

        {showRegisteredNotice ? (
          <p className="mt-3 text-sm text-brand-accent" role="status">
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
            className="flex w-full items-center justify-center rounded-lg border border-brand-border/70 bg-brand-elevated px-4 py-3 text-center text-sm font-semibold text-brand-cream hover:bg-brand-border/50"
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
                ? "rounded-lg border border-brand-border/90 bg-brand-ink/80 p-4"
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
                    className="rounded-md border border-brand-border/90 bg-brand-ink px-3 py-2"
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
                    className="rounded-md border border-brand-border/90 bg-brand-ink px-3 py-2"
                    required
                    autoComplete="current-password"
                  />
                </label>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-brand-accent/50 bg-brand-accent/20 px-4 py-2 text-sm font-semibold text-brand-accent hover:bg-brand-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : null}
          </div>

          {googleOAuthConfigured ? (
            <GoogleOAuthForm callbackUrl={callbackUrl} label="Sign in with Google" />
          ) : (
            <p className="text-center text-xs text-brand-dim/90">
              Google sign-in is disabled until you set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
              in <code className="text-brand-dim">.env.local</code>.
            </p>
          )}
        </div>
      </section>

      <div className="my-8 h-px bg-brand-border/50" role="separator" />

      <section aria-labelledby="sign-up-heading">
        <h2 id="sign-up-heading" className="text-lg font-semibold text-brand-cream">
          Don&apos;t have an account yet?
        </h2>
        <p className="mt-1 text-sm text-brand-dim">Create one now</p>

        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/signup"
            className="flex w-full items-center justify-center rounded-lg border border-brand-border/70 bg-brand-elevated px-4 py-3 text-center text-sm font-semibold text-brand-cream hover:bg-brand-border/50"
          >
            Sign up with email and password
          </Link>

          {googleOAuthConfigured ? (
            <GoogleOAuthForm callbackUrl={callbackUrl} label="Sign up with Google" />
          ) : (
            <p className="text-center text-xs text-brand-dim/90">
              Google sign-up uses the same OAuth flow as sign-in once OAuth env vars are set.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
