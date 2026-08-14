"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ShieldKeyholeIcon,
  EyeIcon,
  EyeClosedIcon,
  CheckCircleIcon,
  DangerCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { resetPassword, ApiError } from "@/lib/mutations";

export default function ResetPasswordPage() {
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
            Choose a new password
          </h1>
        </div>

        {/* useSearchParams requires a Suspense boundary. */}
        <Suspense fallback={<div className="h-48" />}>
          <ResetForm />
        </Suspense>

        <div className="px-4 pt-3.5 pb-3 text-center">
          <p className="text-muted-foreground text-sm text-pretty">
            Back to{" "}
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

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= 6 && confirm === password;

  async function submit() {
    if (!valid || busy) return;
    setError(null);
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "bg-background rounded-2xl p-5",
        "ring-border-surface-strong shadow-sm shadow-black/5 ring-[0.5px]",
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        {!token ? (
          <motion.div
            key="no-token"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-4 text-center"
          >
            <span className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-2xl">
              <DangerCircleIcon size={24} />
            </span>
            <p className="text-sm font-medium">This link isn&rsquo;t valid</p>
            <p className="text-muted-foreground max-w-xs text-xs leading-relaxed text-pretty">
              Reset links are single-use and expire after an hour.{" "}
              <Link
                href="/forgot-password"
                className="text-brand-content font-medium underline-offset-2 hover:underline"
              >
                Request a new one
              </Link>
              .
            </p>
          </motion.div>
        ) : done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-4 text-center"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
              <CheckCircleIcon size={24} />
            </span>
            <p className="text-sm font-medium">Password updated</p>
            <p className="text-muted-foreground max-w-xs text-xs leading-relaxed text-pretty">
              You&rsquo;ve been signed out everywhere. Sign back in with your
              new password.
            </p>
            <Button as={Link} href="/login" variant="brand" size="sm">
              Go to sign in
            </Button>
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
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              placeholder="6+ characters"
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              autoFocus
            />
            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat it"
              show={showPassword}
              invalid={mismatch}
            />

            {mismatch ? (
              <p className="text-destructive flex items-center gap-1.5 text-xs">
                <DangerCircleIcon size={14} className="shrink-0" />
                Passwords don&rsquo;t match
              </p>
            ) : null}

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
              disabled={busy || !valid}
              className="w-full"
            >
              {busy ? "…" : "Update password"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
  invalid,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggleShow?: () => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="group flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <span
        className={cn(
          "border-input bg-background flex h-10 items-center gap-2 rounded-xl border px-3",
          "transition-all duration-150",
          "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
          invalid && "border-destructive focus-within:ring-destructive/30",
        )}
      >
        <ShieldKeyholeIcon
          size={16}
          className="text-muted-foreground group-focus-within:text-brand shrink-0 transition-colors duration-200"
        />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        {onToggleShow ? (
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground flex cursor-pointer transition-colors"
          >
            {show ? <EyeClosedIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        ) : null}
      </span>
    </label>
  );
}
