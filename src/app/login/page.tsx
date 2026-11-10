import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { isGoogleOAuthConfigured } from "@/lib/google-auth-env";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerAuthSession();

  if (session) {
    redirect("/dashboard");
  }

  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";
  const googleOAuthConfigured = isGoogleOAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-ink p-6 text-brand-cream">
      <Suspense fallback={<div className="text-sm text-brand-dim">Loading...</div>}>
        <LoginForm
          callbackUrl={safeCallbackUrl}
          googleOAuthConfigured={googleOAuthConfigured}
        />
      </Suspense>
    </main>
  );
}
