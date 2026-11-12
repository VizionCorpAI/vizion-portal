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
      <div className="w-full max-w-sm neon-card rounded-3xl border border-line p-9 shadow-[0_40px_80px_-40px_rgb(0_0_0/.95)]">
        <div className="mb-7 text-center">
          <div className="eyebrow">VizionAI</div>
          <h1 className="mt-2">Portal</h1>
          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <p className="mt-4 text-sm text-muted">Owner and team only.</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
