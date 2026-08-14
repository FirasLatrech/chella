"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LetterIcon,
  CheckCircleIcon,
  DangerCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { forgotPassword, ApiError } from "@/lib/mutations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-backdrop flex h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <Link
        href="/"
        data-logo-hover
        className="group/logo absolute top-6 left-6 flex items-center gap-2"
      >
        <Logo className="logo-mark text-foreground h-6 w-auto" />
        <span className="text-lg leading-none font-semibold tracking-[-0.02em]">
          Chelaa
        </span>
      </Link>

      <div
        className={cn(
          "bg-background/60 w-full max-w-md rounded-3xl p-1.5",
          "ring-border-surface-strong ring-[0.5px]",
          "supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl",
        )}
      >
        <div className="px-5 pt-6 pb-5 text-center">
          <Logo className="text-foreground mx-auto h-8 w-auto" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-balance">
            Reset your password
          </h1>
        </div>

        <div
          className={cn(
            "bg-background rounded-2xl p-5",
            "ring-border-surface-strong shadow-sm shadow-black/5 ring-[0.5px]",
          )}
        >
          <AnimatePresence initial={false} mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                  <CheckCircleIcon size={24} />
                </span>
                <p className="text-sm font-medium">Check your inbox</p>
                <p className="text-muted-foreground max-w-xs text-xs leading-relaxed text-pretty">
                  If an account exists for {email.trim()}, a reset link is on
                  its way. The link expires in one hour.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <p className="text-muted-foreground text-sm text-pretty">
                  Enter your email and we&rsquo;ll send you a link to reset
                  your password.
                </p>

                <label className="group flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-medium">Email</span>
                  <span
                    className={cn(
                      "border-input bg-background flex h-10 items-center gap-2 rounded-xl border px-3",
                      "transition-all duration-150",
                      "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
                    )}
                  >
                    <LetterIcon
                      size={16}
                      className="text-muted-foreground group-focus-within:text-brand shrink-0 transition-colors duration-200"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </span>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="text-destructive flex items-center gap-1.5 text-xs"
                  >
                    <DangerCircleIcon size={14} className="shrink-0" />
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  variant="brand"
                  disabled={busy || !email.trim()}
                  className="w-full"
                >
                  {busy ? "…" : "Send reset link"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 pt-3.5 pb-3 text-center">
          <p className="text-muted-foreground text-sm text-pretty">
            Remembered it?{" "}
            <Link
              href="/login"
              className="text-brand-content cursor-pointer font-medium underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
