"use client";

import { useEffect, useState } from "react";
import { GoogleBrandButton } from "@/components/google-brand-button";

type GoogleOAuthFormProps = {
  callbackUrl: string;
  label: "Sign in with Google" | "Sign up with Google";
};

export function GoogleOAuthForm({ callbackUrl, label }: GoogleOAuthFormProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/csrf")
      .then((response) => response.json())
      .then((payload: unknown) => {
        if (cancelled) {
          return;
        }
        if (
          payload &&
          typeof payload === "object" &&
          "csrfToken" in payload &&
          typeof (payload as { csrfToken: unknown }).csrfToken === "string"
        ) {
          setCsrfToken((payload as { csrfToken: string }).csrfToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCsrfToken(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <form action="/api/auth/signin/google" method="POST" className="w-full">
      <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <GoogleBrandButton label={label} type="submit" disabled={!csrfToken} />
    </form>
  );
}
