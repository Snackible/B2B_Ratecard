"use client";

import { useMemo, useState } from "react";
import type { CatalogRow } from "@/lib/rows";
import { formatINR, groupBySegment } from "@/lib/rows";

type Props = {
  rows: CatalogRow[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onDeleteItem: (itemId: string) => void;
};

export default function SegmentList({ rows, selectedKeys, onToggle, onDeleteItem }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const grouped = useMemo(() => groupBySegment(rows), [rows]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3 shrink-0">
        <svg
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-faint)]"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pr-3 pl-8 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {filtered ? (
          <ul className="space-y-1">
            {filtered.length === 0 && <li className="text-sm text-[var(--text-faint)] italic">No matches</li>}
            {filtered.map((row) => (
              <Row key={row.key} row={row} checked={selectedKeys.has(row.key)} onToggle={onToggle} onDeleteItem={onDeleteItem} />
            ))}
          </ul>
        ) : (
          [...grouped.entries()].map(([segment, segRows]) => (
            <details key={segment} open className="mb-2">
              <summary className="flex cursor-pointer select-none items-center rounded-md bg-[var(--input-bg)] px-2 py-1.5 text-sm font-semibold tracking-tight text-[var(--text-primary)] hover:bg-[var(--panel-border)]/60">
                {segment}
                <span className="ml-1.5 text-xs font-normal text-[var(--text-faint)]">({segRows.length})</span>
              </summary>
              <ul className="pl-1">
                {segRows.length === 0 && (
                  <li className="px-2 py-1.5 text-xs text-[var(--text-faint)] italic">No products yet</li>
                )}
                {segRows.map((row) => (
                  <Row key={row.key} row={row} checked={selectedKeys.has(row.key)} onToggle={onToggle} onDeleteItem={onDeleteItem} />
                ))}
              </ul>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

function Row({
  row,
  checked,
  onToggle,
  onDeleteItem,
}: {
  row: CatalogRow;
  checked: boolean;
  onToggle: (key: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  function handleDelete() {
    const ok = window.confirm(
      `Permanently delete "${row.name}" from the catalog? This removes it for everyone and can't be undone.`
    );
    if (ok) onDeleteItem(row.itemId);
  }

  return (
    <li className="group flex items-center gap-1 rounded-md hover:bg-[var(--input-bg)]">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(row.key)}
          className="h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span className="min-w-0 flex-1 truncate">{row.name}</span>
        <span className="shrink-0 text-xs text-[var(--text-faint)]">({row.packLabel})</span>
        <span className="tabular-nums shrink-0 text-xs text-[var(--text-muted)]">{formatINR(row.mrp)}</span>
      </label>
      <button
        type="button"
        onClick={handleDelete}
        title="Delete from catalog"
        aria-label={`Delete ${row.name} from catalog`}
        className="shrink-0 rounded px-1.5 py-1 text-xs text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}
