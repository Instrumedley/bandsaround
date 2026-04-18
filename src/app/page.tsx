import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";

export default async function Home() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
