"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cx, type BadgeTone } from "@/lib/format";

/* ------------------------------- Button ------------------------------- */

type ButtonVariant = "primary" | "lantern" | "outline" | "quiet" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-forest-700 text-white hover:bg-forest-800 shadow-sm",
  lantern: "bg-lantern-300 text-forest-950 hover:bg-lantern-200 shadow-sm",
  outline: "border border-forest-400 bg-white/70 text-forest-900 hover:bg-forest-50",
  quiet: "text-forest-800 hover:bg-forest-100",
  danger: "bg-red-700 text-white hover:bg-red-800 shadow-sm",
};

export function Button({
  variant = "primary",
  busy = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 animate-spin motion-reduce:animate-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <circle cx="12" cy="12" r="9" opacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- Badge ------------------------------- */

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-forest-100 text-forest-900",
  green: "bg-forest-200 text-forest-900",
  amber: "bg-lantern-100 text-lantern-900 ring-1 ring-lantern-300",
  red: "bg-red-100 text-red-900",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold",
        BADGE_STYLES[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Notice ------------------------------- */

type NoticeTone = "info" | "success" | "warn" | "error";

const NOTICE_STYLES: Record<NoticeTone, string> = {
  info: "border-forest-300 bg-forest-50 text-forest-950",
  success: "border-forest-400 bg-forest-100 text-forest-950",
  warn: "border-lantern-400 bg-lantern-50 text-lantern-900",
  error: "border-red-400 bg-red-50 text-red-950",
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("rounded-2xl border px-4 py-3 text-base", NOTICE_STYLES[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
    </div>
  );
}

/* ------------------------------- Layout bits ------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="ff-rise mb-6 max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-lantern-700">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{title}</h1>
      {children && <p className="mt-2 text-lg text-ink-soft">{children}</p>}
    </header>
  );
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-3 text-2xl font-semibold">
      {children}
    </h2>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-forest-300 bg-forest-50/60 px-5 py-8 text-center">
      <p className="font-display text-xl font-semibold text-forest-900">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-ink-soft">{children}</p>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="ff-card flex items-center gap-3 text-ink-soft">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------- Switch ------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p id={`${id}-l`} className="font-semibold text-forest-950">
          {label}
        </p>
        {description && (
          <p id={`${id}-d`} className="text-sm text-ink-soft">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-8 w-14 shrink-0 rounded-full border transition-colors disabled:opacity-50",
          checked ? "border-forest-700 bg-forest-600" : "border-forest-400 bg-forest-100",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
            checked ? "left-[1.7rem]" : "left-0.5",
          )}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

/* ------------------------------- Icons ------------------------------- */

const ICON_PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 3 3 5-6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  family: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5" />
      <circle cx="17" cy="9.5" r="2.2" />
      <path d="M16 14.2c2.3.1 4 1.5 4.5 4.3" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  shield: <path d="M12 3.2 19.5 6v5.6c0 4.4-3.1 7.6-7.5 9.2-4.4-1.6-7.5-4.8-7.5-9.2V6z M9 12l2.2 2.2L15.2 10" />,
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2.5" />
      <path d="M8 20h8M12 17v3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
};

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("size-5 shrink-0", className)}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ------------------------------- Privacy ------------------------------- */

export function PrivacyNote({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Privacy"
      className={cx(
        "flex gap-3 rounded-2xl border border-forest-300 bg-forest-50/80 p-4 text-forest-950",
        className,
      )}
    >
      <Icon name="lock" className="mt-0.5 size-6 text-forest-700" />
      <div>
        <p className="font-semibold">You only see what happens inside FamilyFlow.</p>
        <p className="mt-0.5 text-ink-soft">
          That means adventures requested, approvals, completions and points. FamilyFlow does{" "}
          <strong className="font-semibold text-forest-900">not</strong> show you unrelated Alexa
          conversations, Amazon shopping or purchase history, other Fire TV apps, or device
          telemetry — and children are told this when their profile is created.
        </p>
      </div>
    </aside>
  );
}
