"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        isActive
          ? "bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]"
          : "hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0 drop-shadow-sm">
            <defs>
              <linearGradient id="brand-mark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1a8a3e" />
                <stop offset="1" stopColor="#005a1f" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#brand-mark)" />
            <rect x="3.6" y="8.4" width="24.8" height="15.4" rx="2.6" fill="#fff" />
            <path d="M3.6 11a2.6 2.6 0 0 1 2.6-2.6h19.6a2.6 2.6 0 0 1 2.6 2.6v2.4H3.6z" fill="#0b6b2f" opacity=".16" />
            <path d="M7 11h6" stroke="#0b6b2f" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M7 16.2h6M7 19.6h6" stroke="#0b6b2f" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
            <path d="M19 16.2h6M19 19.6h6" stroke="#0b6b2f" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Snackible
          <span className="text-sm font-normal text-[var(--text-muted)]">Rate Card</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-medium text-[var(--text-secondary)]">
          <NavLink href="/">Create Rate Card</NavLink>
          <NavLink href="/saved">Saved Rate Cards</NavLink>
          <div className="ml-2 border-l border-[var(--panel-border)] pl-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
