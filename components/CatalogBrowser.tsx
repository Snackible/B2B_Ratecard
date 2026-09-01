"use client";

import { useMemo, useState } from "react";
import type { CatalogRow } from "@/lib/rows";
import { formatINR } from "@/lib/rows";

type Props = {
  rows: CatalogRow[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onDeleteItem: (itemId: string) => void;
};

type GroupNode = {
  segment: string;
  sections: Map<string, Map<string, CatalogRow[]>>;
};

function groupRows(rows: CatalogRow[]): GroupNode[] {
  const bySegment = new Map<string, GroupNode>();
  for (const row of rows) {
    if (!bySegment.has(row.segment)) {
      bySegment.set(row.segment, { segment: row.segment, sections: new Map() });
    }
    const node = bySegment.get(row.segment)!;
    const sectionKey = row.section ?? "__none__";
    if (!node.sections.has(sectionKey)) node.sections.set(sectionKey, new Map());
    const catMap = node.sections.get(sectionKey)!;
    if (!catMap.has(row.category)) catMap.set(row.category, []);
    catMap.get(row.category)!.push(row);
  }
  return [...bySegment.values()];
}

export default function CatalogBrowser({ rows, selectedKeys, onToggle, onDeleteItem }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const grouped = useMemo(() => groupRows(rows), [rows]);

  return (
    <div className="flex h-full flex-col">
      <input
        type="text"
        placeholder="Search products or categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
      />
      <div className="flex-1 overflow-y-auto pr-1">
        {filtered ? (
          <ul className="space-y-1">
            {filtered.length === 0 && (
              <li className="text-sm text-[var(--text-faint)] italic">No matches</li>
            )}
            {filtered.map((row) => (
              <RowCheckbox
                key={row.key}
                row={row}
                checked={selectedKeys.has(row.key)}
                onToggle={onToggle}
                onDeleteItem={onDeleteItem}
                showMeta
              />
            ))}
          </ul>
        ) : (
          grouped.map((seg) => (
            <details key={seg.segment} open className="mb-2">
              <summary className="cursor-pointer select-none rounded bg-[var(--input-bg)] px-2 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
                {seg.segment}
              </summary>
              <div className="pl-2">
                {[...seg.sections.entries()].map(([sectionKey, catMap]) => {
                  const categoryList = (
                    <div className={sectionKey !== "__none__" ? "pl-2" : ""}>
                      {[...catMap.entries()].map(([category, catRows]) => (
                        <div key={category} className="mb-1">
                          <div className="px-2 pt-1 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                            {category}
                          </div>
                          <ul>
                            {catRows.map((row) => (
                              <RowCheckbox
                                key={row.key}
                                row={row}
                                checked={selectedKeys.has(row.key)}
                                onToggle={onToggle}
                                onDeleteItem={onDeleteItem}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                  return sectionKey === "__none__" ? (
                    <div key={sectionKey}>{categoryList}</div>
                  ) : (
                    <details key={sectionKey} className="mb-1 mt-1">
                      <summary className="cursor-pointer select-none rounded bg-[var(--accent-soft-bg)] px-2 py-1 text-sm font-medium text-[var(--accent-soft-fg)]">
                        {sectionKey}
                      </summary>
                      {categoryList}
                    </details>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

function RowCheckbox({
  row,
  checked,
  onToggle,
  onDeleteItem,
  showMeta,
}: {
  row: CatalogRow;
  checked: boolean;
  onToggle: (key: string) => void;
  onDeleteItem: (itemId: string) => void;
  showMeta?: boolean;
}) {
  function handleDelete() {
    const ok = window.confirm(
      `Permanently delete "${row.name}" from the catalog? This removes it for everyone and can't be undone.`
    );
    if (ok) onDeleteItem(row.itemId);
  }

  return (
    <li className="group flex items-center gap-1 rounded hover:bg-[var(--input-bg)]">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(row.key)}
          className="h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span className="min-w-0 flex-1 truncate">
          {row.name}
          {showMeta && (
            <span className="text-xs text-[var(--text-faint)]">
              {" "}
              &middot; {row.category}
              {row.section ? ` · ${row.section}` : ""}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-[var(--text-faint)]">({row.packLabel})</span>
        <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatINR(row.mrp)}</span>
      </label>
      <button
        type="button"
        onClick={handleDelete}
        title="Delete from catalog"
        aria-label={`Delete ${row.name} from catalog`}
        className="shrink-0 px-1.5 text-xs text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}
