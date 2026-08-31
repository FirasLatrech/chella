"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ShieldKeyholeIcon,
  DangerCircleIcon,
  LetterUnreadIcon,
} from "@solar-icons/react/bold-duotone";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { verifyEmail, resendVerification, ApiError } from "@/lib/mutations";
import { logout } from "@/lib/mutations";

const RESEND_COOLDOWN = 30;

export function VerifyEmailForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown === 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const verify = useMutation({
    mutationFn: () => verifyEmail(code.trim()),
    onSuccess: () => {
      // Hard navigation: requireAuth's redirect to /verify-email may still be
      // held in Next's client router cache for "/", same reason login uses
      // window.location instead of router.push after an auth change.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Something went wrong"),
  });

  const resend = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => setCooldown(RESEND_COOLDOWN),
  });

  return (
    <div className="app-backdrop flex h-dvh flex-col items-center justify-center overflow-hidden px-6">
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
            Verify your email
          </h1>
        </div>

        <div
          className={cn(
            "bg-background rounded-2xl p-5",
            "ring-border-surface-strong shadow-sm shadow-black/5 ring-[0.5px]",
          )}
        >
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              verify.mutate();
            }}
          >
            <p className="text-muted-foreground text-sm text-pretty">
              We emailed a 6-digit code to your address. Enter it below to
              activate your account.
            </p>

            <label className="group flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium">Verification code</span>
              <span
                className={cn(
                  "border-input bg-background flex h-10 items-center gap-2 rounded-xl border px-3",
                  "transition-all duration-150",
                  "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
                )}
              >
                <ShieldKeyholeIcon
                  size={16}
                  className="text-muted-foreground group-focus-within:text-brand shrink-0 transition-colors duration-200"
                />
                <input
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm tracking-[0.3em] outline-none"
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
              disabled={verify.isPending || code.length !== 6}
              className="w-full"
            >
              {verify.isPending ? "…" : "Verify"}
            </Button>

            <button
              type="button"
              onClick={() => resend.mutate()}
              disabled={resend.isPending || cooldown > 0}
              className={cn(
                "text-muted-foreground hover:text-brand-content flex items-center justify-center gap-1.5 text-xs transition-colors",
                "disabled:pointer-events-none disabled:opacity-60",
              )}
            >
              <LetterUnreadIcon size={14} />
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : resend.isPending
                  ? "Sending…"
                  : "Resend code"}
            </button>
          </motion.form>
        </div>

        <div className="px-4 pt-3.5 pb-3 text-center">
          <p className="text-muted-foreground text-sm text-pretty">
            Wrong account?{" "}
            <button
              type="button"
              onClick={() =>
                logout().then(() => {
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.href = "/login";
                })
              }
              className="text-brand-content cursor-pointer font-medium underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
