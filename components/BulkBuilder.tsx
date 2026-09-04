"use client";

import { useMemo, useState } from "react";
import type { Item, NewItemInput } from "@/lib/types";
import { buildRows } from "@/lib/rows";
import SegmentList from "./SegmentList";
import DiscountPicker from "./DiscountPicker";
import AddItemModal from "./AddItemModal";

type Props = {
  items: Item[];
  onAddItem: (input: NewItemInput) => Promise<void>;
  onDeleteItem: (itemId: string) => void;
  quantities: Map<string, number>;
  onToggle: (key: string) => void;
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  clientName: string;
  onClientNameChange: (name: string) => void;
  showClientName: boolean;
  onShowClientNameChange: (show: boolean) => void;
  transportCostEnabled: boolean;
  onTransportCostEnabledChange: (enabled: boolean) => void;
  transportCost: number;
  onTransportCostChange: (amount: number) => void;
  onNext: () => void;
};

export default function BulkBuilder({
  items,
  onAddItem,
  onDeleteItem,
  quantities,
  onToggle,
  discountPercent,
  onDiscountChange,
  clientName,
  onClientNameChange,
  showClientName,
  onShowClientNameChange,
  transportCostEnabled,
  onTransportCostEnabledChange,
  transportCost,
  onTransportCostChange,
  onNext,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [transportInput, setTransportInput] = useState(String(transportCost));

  const rows = useMemo(() => buildRows(items), [items]);
  const selectedKeys = useMemo(() => new Set(quantities.keys()), [quantities]);
  const existingCategories = useMemo(
    () => [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b)),
    [items]
  );
  const existingSections = useMemo(
    () => [...new Set(items.map((i) => i.section).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b)),
    [items]
  );

  function commitTransportCost() {
    const num = Number(transportInput);
    if (!Number.isNaN(num) && num >= 0) {
      onTransportCostChange(num);
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transportCost: num }),
      }).catch(() => {});
    } else {
      setTransportInput(String(transportCost));
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex h-[55vh] flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Catalog</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-md bg-[var(--secondary-accent)] px-2.5 py-1 text-xs font-medium text-[var(--secondary-fg)] hover:bg-[var(--secondary-accent-hover)] active:scale-[0.97]"
          >
            + Add Item
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SegmentList rows={rows} selectedKeys={selectedKeys} onToggle={onToggle} onDeleteItem={onDeleteItem} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
        <DiscountPicker value={discountPercent} onChange={onDiscountChange} />

        <div className="h-8 w-px bg-[var(--panel-border)]" aria-hidden />

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Client name"
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            className="w-44 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showClientName}
              onChange={(e) => onShowClientNameChange(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Show on card
          </label>
        </div>

        <div className="h-8 w-px bg-[var(--panel-border)]" aria-hidden />

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={transportCostEnabled}
              onChange={(e) => onTransportCostEnabledChange(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Add transport cost
          </label>
          {transportCostEnabled && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--text-faint)]">₹</span>
              <input
                type="number"
                min={0}
                value={transportInput}
                onChange={(e) => setTransportInput(e.target.value)}
                onBlur={commitTransportCost}
                className="w-20 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="ml-auto">
          <button
            onClick={onNext}
            disabled={selectedKeys.size === 0}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddItem}
          existingCategories={existingCategories}
          existingSections={existingSections}
        />
      )}
    </div>
  );
}
