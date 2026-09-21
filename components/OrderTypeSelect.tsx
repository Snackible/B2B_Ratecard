"use client";

import type { OrderType } from "@/lib/types";

export default function OrderTypeSelect({ onSelect }: { onSelect: (type: OrderType) => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-[var(--text-primary)] sm:text-4xl">
        Choose an order type to start pricing.
      </h1>

      <div className="mt-12 grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
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
      className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-9 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_20px_40px_-15px_var(--accent-shadow)] active:translate-y-0 active:scale-[0.99]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)] transition-colors duration-300 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</div>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      <span className="mt-2 flex items-center gap-1 text-sm font-medium text-[var(--accent)] opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
        Get started
        <span aria-hidden>&rarr;</span>
      </span>
    </button>
  );
}
