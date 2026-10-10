"use client";

import type { OrderType } from "@/lib/types";

export default function OrderTypeSelect({ onSelect }: { onSelect: (type: OrderType) => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-4xl flex-col items-center justify-center px-2 py-10 text-center sm:py-16">
      <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/70 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
        New rate card
      </span>
      <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance text-[var(--text-primary)] sm:text-5xl sm:leading-[1.05]">
        Choose an order type to start pricing.
      </h1>

      <div className="mt-12 grid w-full grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6">
        <OptionCard
          title="Bulk Order"
          description="Flat catalog priced by segment — Standard Grammage, One Serving Pack, Large Grammage."
          onClick={() => onSelect("bulk")}
          icon={
            <path d="M4 7h16M4 12h16M4 17h10" />
          }
        />
        <OptionCard
          title="Hamper"
          description="Curated gift boxes — pick a box, choose what goes in it, add box and transport costs."
          onClick={() => onSelect("hamper")}
          icon={
            <>
              <rect x="4" y="9" width="16" height="11" rx="1.5" />
              <path d="M4 13h16M9 9V6.5A2.5 2.5 0 0 1 11.5 4h1A2.5 2.5 0 0 1 15 6.5V9" />
            </>
          }
        />
      </div>
    </div>
  );
}

function OptionCard({
  title,
  description,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-border)]/40 p-1.5 text-left transition-all duration-700 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] sm:p-2"
    >
      <div className="flex h-full min-h-[15rem] flex-col items-start gap-4 rounded-[calc(2rem-0.375rem)] bg-[var(--panel-bg)] p-7 shadow-sm sm:min-h-[17rem] sm:rounded-[calc(2rem-0.5rem)] sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)] transition-all duration-700 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </div>
        <div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</div>
        <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
        <span className="mt-auto flex items-center gap-3 pt-2 text-sm font-medium text-[var(--text-primary)]">
          Get started
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)] transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </span>
        </span>
      </div>
    </button>
  );
}
