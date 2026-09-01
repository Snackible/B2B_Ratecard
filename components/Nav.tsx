import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <header className="border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold text-[var(--accent)]">
          Snackible <span className="font-normal text-[var(--text-muted)]">B2B Rate Card</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[var(--text-secondary)]">
          <Link href="/" className="hover:text-[var(--accent)]">
            Create Rate Card
          </Link>
          <Link href="/saved" className="hover:text-[var(--accent)]">
            Saved Rate Cards
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
