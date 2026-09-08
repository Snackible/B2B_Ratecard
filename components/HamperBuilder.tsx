"use client";

import { useMemo, useState } from "react";
import type { HamperBoxInstance, HamperConfig, Item } from "@/lib/types";
import { formatINR } from "@/lib/rows";
import DiscountPicker from "./DiscountPicker";
import BoxManagerModal from "./BoxManagerModal";

const UNASSIGNED = "__unassigned__";

type Props = {
  items: Item[];
  hamperConfig: HamperConfig;
  onHamperConfigChange: (config: HamperConfig) => void;
  boxInstances: HamperBoxInstance[];
  onAddBoxInstance: (instance: HamperBoxInstance) => void;
  onRemoveBoxInstance: (key: string) => void;
  onUpdateBoxInstanceCost: (key: string, field: "boxCost" | "transportCost", value: number) => void;
  onUpdateBoxInstanceQuantity: (key: string, quantity: number) => void;
  onUpdateBoxInstanceLineItemQuantity: (key: string, itemId: string, quantity: number) => void;
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  clientName: string;
  onClientNameChange: (name: string) => void;
  showClientName: boolean;
  onShowClientNameChange: (show: boolean) => void;
  onToggleBoxAddOn: (boxKey: string, addOnId: string, enabled: boolean) => void;
  onBoxAddOnQuantityChange: (boxKey: string, addOnId: string, quantity: number) => void;
  onBoxAddOnTotalChange: (boxKey: string, addOnId: string, total: number) => void;
  onAddOnCostPerUnitChange: (addOnId: string, costPerUnit: number) => void;
  onNext: () => void;
};

export default function HamperBuilder({
  items,
  hamperConfig,
  onHamperConfigChange,
  boxInstances,
  onAddBoxInstance,
  onRemoveBoxInstance,
  onUpdateBoxInstanceCost,
  onUpdateBoxInstanceQuantity,
  onUpdateBoxInstanceLineItemQuantity,
  discountPercent,
  onDiscountChange,
  clientName,
  onClientNameChange,
  showClientName,
  onShowClientNameChange,
  onToggleBoxAddOn,
  onBoxAddOnQuantityChange,
  onBoxAddOnTotalChange,
  onAddOnCostPerUnitChange,
  onNext,
}: Props) {
  const [showManager, setShowManager] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [itemSearch, setItemSearch] = useState("");
  const [expandedInstance, setExpandedInstance] = useState<string | null>(null);

  const hasUnassignedBoxes = useMemo(() => hamperConfig.boxes.some((b) => !b.boxTypeId), [hamperConfig.boxes]);

  // Falls back to the first available group once one exists, without needing
  // an effect to sync state that was null only because nothing existed yet.
  const effectiveTypeId =
    selectedTypeId ?? hamperConfig.boxTypes[0]?.id ?? (hasUnassignedBoxes ? UNASSIGNED : null);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const boxesForType = useMemo(
    () =>
      hamperConfig.boxes.filter((b) =>
        effectiveTypeId === UNASSIGNED ? !b.boxTypeId : b.boxTypeId === effectiveTypeId
      ),
    [hamperConfig.boxes, effectiveTypeId]
  );
  const selectedBox = useMemo(
    () => hamperConfig.boxes.find((b) => b.id === selectedBoxId) ?? null,
    [hamperConfig.boxes, selectedBoxId]
  );
  const itemsByCategory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, itemSearch]);

  const totalSelectedQty = useMemo(() => [...quantities.values()].reduce((s, q) => s + q, 0), [quantities]);
  const limitError = useMemo(() => {
    if (!selectedBox || quantities.size === 0) return null;
    if (selectedBox.minItems !== null && totalSelectedQty < selectedBox.minItems) {
      return `Needs at least ${selectedBox.minItems} item${selectedBox.minItems === 1 ? "" : "s"} (currently ${totalSelectedQty}).`;
    }
    if (selectedBox.maxItems !== null && totalSelectedQty > selectedBox.maxItems) {
      return `Max ${selectedBox.maxItems} item${selectedBox.maxItems === 1 ? "" : "s"} for this box (currently ${totalSelectedQty}).`;
    }
    return null;
  }, [selectedBox, quantities, totalSelectedQty]);

  function pickGroup(id: string) {
    setSelectedTypeId(id);
    setSelectedBoxId(null);
    setQuantities(new Map());
  }

  function pickBox(id: string) {
    setSelectedBoxId(id);
    setQuantities(new Map());
    setItemSearch("");
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
    if (!selectedBox || quantities.size === 0 || limitError) return;
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
      quantity: 1,
      boxCost: selectedBox.cost,
      boxCostManual: false,
      transportCost: selectedBox.transportCost,
      transportCostManual: false,
      lineItems,
      addOnSelections: [],
    });
    setQuantities(new Map());
  }

  const groupTabs = [
    ...hamperConfig.boxTypes.map((bt) => ({ id: bt.id, name: bt.name })),
    ...(hasUnassignedBoxes ? [{ id: UNASSIGNED, name: "Unassigned" }] : []),
  ];

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
        {groupTabs.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            No boxes yet.{" "}
            <button onClick={() => setShowManager(true)} className="font-medium text-[var(--accent)] hover:underline">
              Add your first box
            </button>{" "}
            to start building hampers.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1">
              {groupTabs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => pickGroup(g.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium active:scale-[0.97] ${
                    effectiveTypeId === g.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]"
                      : "border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {boxesForType.length === 0 ? (
              <p className="py-4 text-sm text-[var(--text-faint)] italic">No boxes in this group yet.</p>
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
                      {formatINR(box.cost)} box &middot; {formatINR(box.transportCost)} transport
                      {(box.minItems !== null || box.maxItems !== null) && (
                        <>
                          {" "}
                          &middot; {box.minItems ?? 0}
                          {box.maxItems !== null ? `-${box.maxItems}` : "+"} items
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedBox && (
              <div className="border-t border-[var(--panel-border)] pt-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-[var(--text-muted)]">
                    Choose items for &ldquo;{selectedBox.name}&rdquo; ({totalSelectedQty} item
                    {totalSelectedQty === 1 ? "" : "s"}
                    {selectedBox.minItems !== null || selectedBox.maxItems !== null
                      ? ` / ${selectedBox.minItems ?? 0}${selectedBox.maxItems !== null ? `-${selectedBox.maxItems}` : "+"}`
                      : ""}
                    )
                  </div>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-40 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                {itemsByCategory.length === 0 ? (
                  <p className="text-sm text-[var(--text-faint)] italic">No matching products.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {itemsByCategory.map(([category, catItems]) => (
                      <details key={category} open className="mb-1">
                        <summary className="cursor-pointer select-none rounded px-2 py-1 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase hover:bg-[var(--input-bg)]">
                          {category}
                        </summary>
                        <ul>
                          {catItems.map((item) => {
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
                                <span className="tabular-nums shrink-0 text-xs text-[var(--text-muted)]">
                                  {formatINR(item.mrp)}
                                </span>
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
                      </details>
                    ))}
                  </div>
                )}
                {limitError && <p className="mt-2 text-xs text-red-500">{limitError}</p>}
                <button
                  onClick={addBoxToHamper}
                  disabled={quantities.size === 0 || Boolean(limitError)}
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
              <li key={b.key} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedInstance((cur) => (cur === b.key ? null : b.key))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">{b.boxName}</span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {b.lineItems.length} item{b.lineItems.length === 1 ? "" : "s"} &middot;{" "}
                      {expandedInstance === b.key ? "hide" : "edit"} items
                    </span>
                  </button>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      Qty
                      <input
                        type="number"
                        min={1}
                        value={b.quantity}
                        onChange={(e) =>
                          onUpdateBoxInstanceQuantity(b.key, Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-12 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 py-0.5 text-right text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      Box
                      <span className="text-[var(--text-faint)]">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={b.boxCost}
                        onChange={(e) =>
                          onUpdateBoxInstanceCost(b.key, "boxCost", Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-16 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 py-0.5 text-right text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      Transport
                      <span className="text-[var(--text-faint)]">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={b.transportCost}
                        onChange={(e) =>
                          onUpdateBoxInstanceCost(b.key, "transportCost", Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-16 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 py-0.5 text-right text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </label>
                    <button
                      onClick={() => onRemoveBoxInstance(b.key)}
                      className="text-xs text-[var(--text-faint)] hover:text-red-500"
                      aria-label={`Remove ${b.boxName}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {expandedInstance === b.key && (
                  <ul className="mt-2 ml-2 space-y-1 border-l border-[var(--panel-border)] pl-3">
                    {b.lineItems.map((li) => (
                      <li key={li.itemId} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="min-w-0 flex-1 truncate">{li.name}</span>
                        <span className="tabular-nums text-[var(--text-faint)]">{formatINR(li.mrp)}</span>
                        <input
                          type="number"
                          min={1}
                          value={li.quantity}
                          onChange={(e) =>
                            onUpdateBoxInstanceLineItemQuantity(
                              b.key,
                              li.itemId,
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="w-14 shrink-0 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs text-[var(--text-primary)]"
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {hamperConfig.addOns.length > 0 && (
                  <div className="mt-2 ml-2 space-y-1 border-l border-[var(--panel-border)] pl-3">
                    <div className="text-[10px] font-semibold tracking-wide text-[var(--text-faint)] uppercase">
                      Add-ons for this box
                    </div>
                    {hamperConfig.addOns.map((addOn) => {
                      const sel = b.addOnSelections.find((a) => a.addOnId === addOn.id);
                      const enabled = Boolean(sel);
                      return (
                        <div key={addOn.id} className="flex flex-wrap items-center gap-2 py-0.5 text-xs">
                          <label className="flex flex-1 items-center gap-1.5 text-[var(--text-secondary)]">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => onToggleBoxAddOn(b.key, addOn.id, e.target.checked)}
                              className="h-3.5 w-3.5 accent-[var(--accent)]"
                            />
                            {addOn.name}
                          </label>
                          {sel && (
                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                              <label className="flex items-center gap-1">
                                Qty
                                <input
                                  type="number"
                                  min={1}
                                  value={sel.quantity}
                                  onChange={(e) =>
                                    onBoxAddOnQuantityChange(
                                      b.key,
                                      addOn.id,
                                      Math.max(1, Number(e.target.value) || 1)
                                    )
                                  }
                                  className="w-12 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs text-[var(--text-primary)]"
                                />
                              </label>
                              <label className="flex items-center gap-1">
                                Total ₹
                                <input
                                  type="number"
                                  min={0}
                                  value={sel.total}
                                  onChange={(e) =>
                                    onBoxAddOnTotalChange(b.key, addOn.id, Math.max(0, Number(e.target.value) || 0))
                                  }
                                  className="w-16 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs font-medium text-[var(--text-primary)]"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
          hamperConfig={hamperConfig}
          onClose={() => setShowManager(false)}
          onChange={onHamperConfigChange}
          onAddOnCostPerUnitChange={onAddOnCostPerUnitChange}
        />
      )}
    </div>
  );
}
