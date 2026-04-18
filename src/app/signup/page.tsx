import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { SignupForm } from "@/components/signup-form";

type SignupPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await getServerAuthSession();

  if (session) {
    redirect("/dashboard");
  }

  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <SignupForm callbackUrl={safeCallbackUrl} />
    </main>
  );
}
