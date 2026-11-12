"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-1.5 w-full rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 shadow-[inset_0_1px_2px_rgb(0_0_0/.4)] outline-none transition focus:border-accent/50 focus:ring-3 focus:ring-accent/10"
        />
      </label>
      <label className="block">
        <span className="text-sm text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 shadow-[inset_0_1px_2px_rgb(0_0_0/.4)] outline-none transition focus:border-accent/50 focus:ring-3 focus:ring-accent/10"
        />
      </label>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full neon-btn rounded-xl px-3 py-2.5 font-semibold tracking-wide disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
