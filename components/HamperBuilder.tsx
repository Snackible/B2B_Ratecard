"use client";

import { useMemo, useState } from "react";
import type { HamperBoxInstance, HamperConfig, Item } from "@/lib/types";
import { formatINR } from "@/lib/rows";
import DiscountPicker from "./DiscountPicker";
import BoxManagerModal from "./BoxManagerModal";

type Props = {
  items: Item[];
  hamperConfig: HamperConfig;
  onHamperConfigChange: (config: HamperConfig) => void;
  boxInstances: HamperBoxInstance[];
  onAddBoxInstance: (instance: HamperBoxInstance) => void;
  onRemoveBoxInstance: (key: string) => void;
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  clientName: string;
  onClientNameChange: (name: string) => void;
  showClientName: boolean;
  onShowClientNameChange: (show: boolean) => void;
  transportCost: number;
  onTransportCostChange: (amount: number) => void;
  onNext: () => void;
};

export default function HamperBuilder({
  items,
  hamperConfig,
  onHamperConfigChange,
  boxInstances,
  onAddBoxInstance,
  onRemoveBoxInstance,
  discountPercent,
  onDiscountChange,
  clientName,
  onClientNameChange,
  showClientName,
  onShowClientNameChange,
  transportCost,
  onTransportCostChange,
  onNext,
}: Props) {
  const [showManager, setShowManager] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [transportInput, setTransportInput] = useState(String(transportCost));

  // Falls back to the first box type once one exists, without needing an effect
  // to sync state that was null only because no box types existed yet.
  const effectiveTypeId = selectedTypeId ?? hamperConfig.boxTypes[0]?.id ?? null;

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const boxesForType = useMemo(
    () => hamperConfig.boxes.filter((b) => b.boxTypeId === effectiveTypeId),
    [hamperConfig.boxes, effectiveTypeId]
  );
  const selectedBox = useMemo(
    () => hamperConfig.boxes.find((b) => b.id === selectedBoxId) ?? null,
    [hamperConfig.boxes, selectedBoxId]
  );
  const eligibleItems = useMemo(
    () => (selectedBox ? selectedBox.itemIds.map((id) => itemsById.get(id)).filter((i): i is Item => Boolean(i)) : []),
    [selectedBox, itemsById]
  );

  function pickBoxType(id: string) {
    setSelectedTypeId(id);
    setSelectedBoxId(null);
    setQuantities(new Map());
  }

  function pickBox(id: string) {
    setSelectedBoxId(id);
    setQuantities(new Map());
  }

  function toggleItem(itemId: string) {
    setQuantities((prev) => {
      const next = new Map(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.set(itemId, 1);
      return next;
    });
  }

  function setItemQty(itemId: string, qty: number) {
    setQuantities((prev) => {
      const next = new Map(prev);
      next.set(itemId, Math.max(1, qty));
      return next;
    });
  }

  function addBoxToHamper() {
    if (!selectedBox || quantities.size === 0) return;
    const boxType = hamperConfig.boxTypes.find((bt) => bt.id === selectedBox.boxTypeId);
    const lineItems = [...quantities.entries()].map(([itemId, quantity]) => {
      const item = itemsById.get(itemId)!;
      return {
        itemId: item.id,
        name: item.name,
        category: item.category,
        packLabel: item.grammage ? `${item.grammage}g` : "Standard Pack",
        grammage: item.grammage,
        shelfLifeDays: item.shelfLifeDays,
        mrp: item.mrp,
        quantity,
      };
    });
    onAddBoxInstance({
      key: `${selectedBox.id}-${Date.now()}`,
      boxId: selectedBox.id,
      boxTypeName: boxType?.name ?? "",
      boxName: selectedBox.name,
      boxCost: selectedBox.cost,
      lineItems,
    });
    setQuantities(new Map());
  }

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Build a Hamper</h2>
        <button
          onClick={() => setShowManager(true)}
          className="rounded-md border border-[var(--input-border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
        >
          Manage Boxes
        </button>
      </div>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
        {hamperConfig.boxTypes.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            No box types yet.{" "}
            <button onClick={() => setShowManager(true)} className="font-medium text-[var(--accent)] hover:underline">
              Add your first box type
            </button>{" "}
            to start building hampers.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1">
              {hamperConfig.boxTypes.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => pickBoxType(bt.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium active:scale-[0.97] ${
                    effectiveTypeId === bt.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]"
                      : "border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                  }`}
                >
                  {bt.name}
                </button>
              ))}
            </div>

            {boxesForType.length === 0 ? (
              <p className="py-4 text-sm text-[var(--text-faint)] italic">No boxes in this type yet.</p>
            ) : (
              <div className="mb-3 flex flex-wrap gap-2">
                {boxesForType.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => pickBox(box.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm active:scale-[0.98] ${
                      selectedBoxId === box.id
                        ? "border-[var(--secondary-accent)] bg-[var(--secondary-soft-bg)]"
                        : "border-[var(--input-border)] hover:bg-[var(--input-bg)]"
                    }`}
                  >
                    <div className="font-medium text-[var(--text-primary)]">{box.name}</div>
                    <div className="tabular-nums text-xs text-[var(--text-muted)]">
                      {formatINR(box.cost)} box cost &middot; {box.itemIds.length} eligible
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedBox && (
              <div className="border-t border-[var(--panel-border)] pt-3">
                <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                  Choose items for &ldquo;{selectedBox.name}&rdquo;
                </div>
                {eligibleItems.length === 0 ? (
                  <p className="text-sm text-[var(--text-faint)] italic">
                    No items assigned to this box yet — add some via Manage Boxes.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {eligibleItems.map((item) => {
                      const qty = quantities.get(item.id);
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--input-bg)]"
                        >
                          <input
                            type="checkbox"
                            checked={quantities.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{item.name}</span>
                          <span className="tabular-nums shrink-0 text-xs text-[var(--text-muted)]">{formatINR(item.mrp)}</span>
                          {qty !== undefined && (
                            <input
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) => setItemQty(item.id, Number(e.target.value) || 1)}
                              className="w-14 shrink-0 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs text-[var(--text-primary)]"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  onClick={addBoxToHamper}
                  disabled={quantities.size === 0}
                  className="mt-3 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50"
                >
                  Add box to hamper
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {boxInstances.length > 0 && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Hamper contents ({boxInstances.length})
          </div>
          <ul className="divide-y divide-[var(--panel-border)]">
            {boxInstances.map((b) => (
              <li key={b.key} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{b.boxName}</span>
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {b.lineItems.length} item{b.lineItems.length === 1 ? "" : "s"} &middot; {formatINR(b.boxCost)} box cost
                  </span>
                </div>
                <button
                  onClick={() => onRemoveBoxInstance(b.key)}
                  className="text-xs text-[var(--text-faint)] hover:text-red-500"
                  aria-label={`Remove ${b.boxName}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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

        <div>
          <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">Transport cost (applied to hamper)</div>
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
        </div>

        <div className="ml-auto">
          <button
            onClick={onNext}
            disabled={boxInstances.length === 0}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showManager && (
        <BoxManagerModal
          items={items}
          hamperConfig={hamperConfig}
          onClose={() => setShowManager(false)}
          onChange={onHamperConfigChange}
        />
      )}
    </div>
  );
}
