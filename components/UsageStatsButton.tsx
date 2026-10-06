"use client";

import { useState } from "react";
import type { UsageStats } from "@/lib/usageStats";
import { formatINR } from "@/lib/rows";

export default function UsageStatsButton() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState(false);

  async function show() {
    setOpen(true);
    setError(false);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error();
      setStats((await res.json()) as UsageStats);
    } catch {
      setError(true);
    }
  }

  return (
    <>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={show}
          className="rounded px-1 text-[10px] text-[var(--text-faint)] opacity-60 hover:opacity-100"
        >
          View usage stats
        </button>
      </div>

      {open && (
        <div
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Usage stats"
            className="animate-modal-in w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Usage stats</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--text-faint)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {error ? (
              <p className="text-sm text-[var(--danger)]">Couldn&apos;t load stats. Please try again.</p>
            ) : !stats ? (
              <p className="text-sm text-[var(--text-muted)]">Loading...</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Sales recorded" value={formatINR(stats.totalSales)} />
                  <Stat label="Total cards" value={String(stats.totalCards)} />
                  <Stat
                    label="Bulk"
                    value={`${stats.byType.bulk.cards} · ${formatINR(stats.byType.bulk.sales)}`}
                  />
                  <Stat
                    label="Hamper"
                    value={`${stats.byType.hamper.cards} · ${formatINR(stats.byType.hamper.sales)}`}
                  />
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Most ordered items</div>
                  {stats.topItems.length === 0 ? (
                    <p className="text-xs text-[var(--text-faint)]">No orders yet.</p>
                  ) : (
                    <ol className="divide-y divide-[var(--panel-border)]">
                      {stats.topItems.map((it) => (
                        <li key={it.name} className="flex items-center justify-between gap-3 py-1.5">
                          <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{it.name}</span>
                          <span className="tabular-nums text-[var(--text-primary)]">{it.quantity}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {stats.duplicatesIgnored > 0 && (
                  <p className="text-[11px] text-[var(--text-faint)]">
                    {stats.duplicatesIgnored} duplicate card{stats.duplicatesIgnored === 1 ? "" : "s"} not counted.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--input-bg)] px-3 py-2">
      <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
      <div className="tabular-nums text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
