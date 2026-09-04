"use client";

import type { OrderType } from "@/lib/types";

export default function OrderTypeSelect({ onSelect }: { onSelect: (type: OrderType) => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        What are you building?
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Choose an order type to start pricing.
      </p>

      <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
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
      className="group flex flex-col items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 text-left shadow-sm hover:border-[var(--accent)] hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div className="text-base font-semibold tracking-tight text-[var(--text-primary)]">{title}</div>
      <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      <span className="mt-1 text-xs font-medium text-[var(--accent)] opacity-0 group-hover:opacity-100">
        Get started &rarr;
      </span>
    </button>
  );
}
