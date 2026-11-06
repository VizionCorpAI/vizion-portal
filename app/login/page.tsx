import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession().catch(() => null);
  if (session) redirect("/");
  const { next = "/" } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm neon-card rounded-2xl border border-line p-8 shadow-[0_0_60px_-15px] shadow-purple">
        <div className="mb-6">
          <div className="neon-text text-xs tracking-[0.3em] text-accent">VIZIONAI</div>
          <h1 className="mt-1 text-2xl font-semibold">Portal</h1>
          <p className="mt-1 text-sm text-muted">Owner and team only.</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
