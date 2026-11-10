"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleBrandButton } from "@/components/google-brand-button";

type GoogleOAuthFormProps = {
  callbackUrl: string;
  label: "Sign in with Google" | "Sign up with Google";
};

export function GoogleOAuthForm({ callbackUrl, label }: GoogleOAuthFormProps) {
  const [isStarting, setIsStarting] = useState(false);

  function handleGoogleAuth() {
    setIsStarting(true);
    void signIn("google", { callbackUrl });
  }

  return (
    <GoogleBrandButton
      label={label}
      type="button"
      disabled={isStarting}
      onClick={handleGoogleAuth}
    />
  );
}
