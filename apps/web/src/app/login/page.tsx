"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  UserRoundedIcon,
  LetterIcon,
  ShieldKeyholeIcon,
  EyeIcon,
  EyeClosedIcon,
  DangerCircleIcon,
  CheckCircleIcon,
  CloseCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { login, signup, checkAvailable, ApiError } from "@/lib/mutations";
import { useMe } from "@/lib/queries";

type Mode = "login" | "signup";
type Availability = "idle" | "checking" | "free" | "taken";

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="app-backdrop min-h-dvh" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.has("signup") ? "signup" : "login",
  );

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // null = follow the suggestion derived from the name; a string = the
  // user's own edit. Deriving at render avoids setState-in-effect entirely.
  const [handleOverride, setHandleOverride] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checked, setChecked] = useState<{ handle: string; free: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (VALIDATED session, unlike the proxy's cookie-presence
  // check — a stale cookie must not bounce, or it loops): go home.
  const { data: me } = useMe();
  useEffect(() => {
    if (me) router.replace("/");
  }, [me, router]);

  const handle = handleOverride ?? slug(`${firstName} ${lastName}`);

  // Debounced live uniqueness check. State is only set from the async
  // callback; the "checking" state is derived by comparing what was last
  // verified against the current value.
  useEffect(() => {
    if (mode !== "signup" || handle.length < 2) return;
    const t = setTimeout(async () => {
      const result = await checkAvailable({ handle });
      setChecked({ handle, free: result.handle });
    }, 350);
    return () => clearTimeout(t);
  }, [handle, mode]);

  const availability: Availability =
    mode !== "signup" || handle.length < 2
      ? "idle"
      : checked?.handle === handle
        ? checked.free
          ? "free"
          : "taken"
        : "checking";

  const valid =
    mode === "login"
      ? identifier.trim() !== "" && password.length > 0
      : email.trim() !== "" &&
        firstName.trim() !== "" &&
        lastName.trim() !== "" &&
        handle.length >= 2 &&
        password.length >= 6 &&
        availability !== "taken";

  async function submit() {
    if (!valid || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(identifier, password);
      } else {
        await signup({ email, firstName, lastName, handle, password });
      }
      await queryClient.invalidateQueries();
      // Return to where the guard bounced them from. Only same-origin paths —
      // a full URL here would be an open redirect. A hard navigation (not
      // router.push) because Next's client router cache can be holding the
      // pre-login redirect-to-/login response for this path, which push
      // would just replay instead of fetching fresh with the new cookie.
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
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

      {/* Frame-inside-tint, like every card in the app: frosted shell on the
          sky, the form as an inset white panel. */}
      <div
        className={cn(
          "bg-background/60 w-full max-w-md rounded-3xl p-1.5",
          "ring-border-surface-strong ring-[0.5px]",
          "supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl",
        )}
      >
        {/* Header on the tint */}
        <div className="px-5 pt-6 pb-5 text-center">
          <Logo className="text-foreground mx-auto h-8 w-auto" />
          <AnimatePresence initial={false} mode="wait">
            <motion.h1
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-3 text-xl font-semibold tracking-tight text-balance"
            >
              {mode === "login" ? "Sign in to Chelaa" : "Create your account"}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Inset form panel */}
        <div
          className={cn(
            "bg-background rounded-2xl p-5",
            "ring-border-surface-strong shadow-sm shadow-black/5 ring-[0.5px]",
          )}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <AnimatePresence initial={false} mode="wait">
              {mode === "login" ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Field label="Email or username" icon={UserRoundedIcon}>
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="username"
                      className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </Field>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First name" icon={UserRoundedIcon}>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Firas"
                        autoComplete="given-name"
                        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </Field>
                    <Field label="Last name">
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Latrach"
                        autoComplete="family-name"
                        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </Field>
                  </div>

                  <Field label="Email" icon={LetterIcon}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </Field>

                  <Field
                    label="Username"
                    icon={UserRoundedIcon}
                    hint="Suggested from your name — yours to change."
                    trailing={<AvailabilityDot state={availability} />}
                  >
                    <span className="text-muted-foreground text-sm">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandleOverride(slug(e.target.value))}
                      placeholder="firas-latrach"
                      autoComplete="username"
                      className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              label="Password"
              icon={ShieldKeyholeIcon}
              labelTrailing={
                mode === "login" ? (
                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-brand-content text-[11px] transition-colors"
                  >
                    Forgot password?
                  </Link>
                ) : undefined
              }
            >
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "6+ characters" : "••••••••"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-muted-foreground hover:text-foreground flex cursor-pointer transition-colors"
              >
                {showPassword ? (
                  <EyeClosedIcon size={16} />
                ) : (
                  <EyeIcon size={16} />
                )}
              </button>
            </Field>

            <AnimatePresence>
              {error ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="text-destructive flex items-center gap-1.5 text-xs"
                >
                  <DangerCircleIcon size={14} className="shrink-0" />
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <Button type="submit" variant="brand" disabled={busy || !valid} className="w-full">
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>

        {/* Mode toggle on the tint */}
        <div className="px-4 pt-3.5 pb-3 text-center">
          <p className="text-muted-foreground text-sm text-pretty">
            {mode === "login" ? "New to Chelaa?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="text-brand-content hover:underline cursor-pointer font-medium underline-offset-2"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/*
 * Icon-led field: label above, hairline box, icon tinting brand while the
 * field holds focus.
 */
function Field({
  label,
  icon: Icon,
  hint,
  trailing,
  labelTrailing,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  hint?: string;
  trailing?: React.ReactNode;
  labelTrailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex min-w-0 flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium">{label}</span>
        {labelTrailing}
      </span>
      <span
        className={cn(
          "border-input bg-background flex h-10 items-center gap-2 rounded-xl border px-3",
          "transition-all duration-150",
          "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
        )}
      >
        {Icon ? (
          <Icon
            size={16}
            className="text-muted-foreground group-focus-within:text-brand shrink-0 transition-colors duration-200"
          />
        ) : null}
        {children}
        {trailing}
      </span>
      {hint ? (
        <span className="text-muted-foreground/70 text-[11px]">{hint}</span>
      ) : null}
    </label>
  );
}

function AvailabilityDot({ state }: { state: Availability }) {
  if (state === "idle") return null;
  return (
    <span className="flex shrink-0 items-center gap-1 text-[11px]">
      {state === "checking" ? (
        <span className="bg-muted-foreground/50 size-1.5 animate-pulse rounded-full motion-reduce:animate-none" />
      ) : state === "free" ? (
        <>
          <CheckCircleIcon
            size={14}
            className="text-emerald-600 dark:text-emerald-500"
          />
          <span className="text-emerald-600 dark:text-emerald-500">
            available
          </span>
        </>
      ) : (
        <>
          <CloseCircleIcon size={14} className="text-destructive" />
          <span className="text-destructive">taken</span>
        </>
      )}
    </span>
  );
}
