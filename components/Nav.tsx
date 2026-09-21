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
        <Link href="/" className="flex items-baseline gap-2 text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
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
