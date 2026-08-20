"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth-actions";
import { Gem, Lock, User } from "lucide-react";
import type { AuthState } from "@/lib/auth-actions";

const initialState: AuthState = null;

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen bg-wine-deep flex items-center justify-center p-4">
      {/* Background subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            #c9a84c 0px,
            #c9a84c 1px,
            transparent 1px,
            transparent 60px
          )`,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/20 border border-gold/30 mb-5 shadow-lg shadow-black/30">
            <Gem size={30} className="text-gold-bright" />
          </div>
          <p className="text-[11px] tracking-[0.35em] text-gold-soft uppercase mb-2">
            Jewellery House
          </p>
          <h1 className="font-display text-3xl font-semibold text-gold-bright leading-tight">
            Surya Gold &amp; Diamonds
          </h1>
          <p className="text-cream/40 text-sm mt-2">Counter Billing &amp; GST Management</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <h2 className="font-display text-xl font-semibold text-cream mb-1">Sign In</h2>
          <p className="text-cream/50 text-sm mb-7">
            Enter your credentials to access the billing desk.
          </p>

          <form action={action} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold tracking-wide text-gold-soft uppercase"
              >
                Username
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30 pointer-events-none"
                />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="admin / counter"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/8 border border-white/12 text-cream placeholder:text-cream/25 text-sm focus:outline-none focus:border-gold/50 focus:bg-white/10 transition"
                />
              </div>
            </div>

            {/* Passcode */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold tracking-wide text-gold-soft uppercase"
              >
                Passcode
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30 pointer-events-none"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/8 border border-white/12 text-cream placeholder:text-cream/25 text-sm focus:outline-none focus:border-gold/50 focus:bg-white/10 transition"
                />
              </div>
            </div>

            {/* Error message */}
            {state?.error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-400/20 px-4 py-3">
                <span className="text-red-400 text-sm leading-snug">{state.error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={pending}
              className="w-full py-3 rounded-lg bg-gold text-ink font-semibold text-sm tracking-wide hover:bg-gold-bright transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-black/20 mt-2"
            >
              {pending ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-cream/20 mt-6">
          Counter billing · GST invoices · HUID tracking
        </p>
      </div>
    </div>
  );
}
