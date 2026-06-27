"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-white/80 bg-white/90 p-5 shadow-card backdrop-blur md:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-center text-sm font-bold leading-5 transition duration-200 focus-visible:ring-4 focus-visible:ring-leaf/15 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-cream shadow-lg shadow-ink/10 hover:-translate-y-0.5",
        variant === "secondary" && "bg-moss text-leaf hover:bg-white",
        variant === "ghost" && "bg-transparent text-ink hover:bg-ink/5",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm font-extrabold uppercase tracking-[0.18em] text-leaf">{children}</label>;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "min-h-44 w-full resize-y rounded-lg border border-sand/80 bg-cream/80 p-4 text-sm leading-6 text-ink shadow-inner placeholder:text-ink/35 focus:border-leaf focus:ring-4 focus:ring-leaf/10",
        className
      )}
      {...props}
    />
  );
}

export function Metric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warm";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-4",
        tone === "neutral" && "border-sand/80 bg-cream/80",
        tone === "good" && "border-leaf/20 bg-moss",
        tone === "warm" && "border-clay/20 bg-[#fff1e8]"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
