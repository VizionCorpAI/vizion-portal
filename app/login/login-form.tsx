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
          className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="text-sm text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full neon-btn rounded-lg px-3 py-2 font-medium text-bg transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
