"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GoogleBrandButton } from "@/components/google-brand-button";

type SignupFormProps = {
  callbackUrl: string;
  googleOAuthConfigured: boolean;
};

export function SignupForm({ callbackUrl, googleOAuthConfigured }: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload: unknown = await response.json().catch(() => null);
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Could not create account.";

    if (!response.ok) {
      setIsSubmitting(false);
      setError(message);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (signInResult?.error) {
      setError("Account created. Please sign in.");
      router.push(`/login?registered=1`);
      return;
    }

    router.push(signInResult?.url ?? callbackUrl);
    router.refresh();
  }

  function handleGoogleSignup() {
    if (!googleOAuthConfigured) {
      return;
    }
    void signIn("google", { callbackUrl });
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-slate-300">
        Sign up with Google or email and password. You can connect Spotify and Last.fm after you sign
        in.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {googleOAuthConfigured ? (
          <GoogleBrandButton label="Sign up with Google" onClick={handleGoogleSignup} />
        ) : (
          <p className="text-center text-xs text-slate-500">
            Google sign-up is disabled until you set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in{" "}
            <code className="text-slate-400">.env.local</code>.
          </p>
        )}
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide text-slate-500">
          <span className="bg-slate-900 px-2">Or register with email</span>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-3">
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
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-cyan-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
