"use client";

import { useState } from "react";
import type { AddOn, Box, HamperConfig } from "@/lib/types";
import { formatINR } from "@/lib/rows";

type Props = {
  hamperConfig: HamperConfig;
  onClose: () => void;
  onChange: (config: HamperConfig) => void;
  onAddOnCostPerUnitChange: (addOnId: string, costPerUnit: number) => void;
};

type BoxForm = {
  id: string | null;
  boxTypeId: string | null;
  name: string;
  cost: string;
  transportCost: string;
  minItems: string;
  maxItems: string;
};

export default function BoxManagerModal({ hamperConfig, onClose, onChange, onAddOnCostPerUnitChange }: Props) {
  const [config, setConfig] = useState(hamperConfig);
  const [newTypeName, setNewTypeName] = useState("");
  const [boxForm, setBoxForm] = useState<BoxForm | null>(null);
  const [newAddOnName, setNewAddOnName] = useState("");
  const [newAddOnCost, setNewAddOnCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addAddOnEntry() {
    const costPerUnit = Number(newAddOnCost);
    if (!newAddOnName.trim() || !newAddOnCost || Number.isNaN(costPerUnit) || costPerUnit < 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hamper/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAddOnName.trim(), costPerUnit }),
      });
      if (!res.ok) throw new Error();
      const addOn: AddOn = await res.json();
      const next = { ...config, addOns: [...config.addOns, addOn] };
      setConfig(next);
      onChange(next);
      setNewAddOnName("");
      setNewAddOnCost("");
    } catch {
      setError("Could not add add-on.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddOnEntry(id: string) {
    const ok = window.confirm("Delete this add-on? This can't be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      await fetch(`/api/hamper/addons?id=${id}`, { method: "DELETE" });
      const next = { ...config, addOns: config.addOns.filter((a) => a.id !== id) };
      setConfig(next);
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  function updateAddOnCost(id: string, costPerUnit: number) {
    setConfig((prev) => ({ ...prev, addOns: prev.addOns.map((a) => (a.id === id ? { ...a, costPerUnit } : a)) }));
    onAddOnCostPerUnitChange(id, costPerUnit);
  }

  async function addBoxType() {
    if (!newTypeName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hamper/box-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName.trim() }),
      });
      if (!res.ok) throw new Error();
      const boxType = await res.json();
      const next = { ...config, boxTypes: [...config.boxTypes, boxType] };
      setConfig(next);
      onChange(next);
      setNewTypeName("");
    } catch {
      setError("Could not add box type.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBoxType(id: string) {
    const ok = window.confirm("Delete this box type and all its boxes? This can't be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      await fetch(`/api/hamper/box-types?id=${id}`, { method: "DELETE" });
      const next = {
        ...config,
        boxTypes: config.boxTypes.filter((bt) => bt.id !== id),
        boxes: config.boxes.filter((b) => b.boxTypeId !== id),
      };
      setConfig(next);
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBox(id: string) {
    const ok = window.confirm("Delete this box? This can't be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      await fetch(`/api/hamper/boxes/${id}`, { method: "DELETE" });
      const next = { ...config, boxes: config.boxes.filter((b) => b.id !== id) };
      setConfig(next);
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  function startNewBox(boxTypeId: string | null) {
    setError(null);
    setBoxForm({ id: null, boxTypeId, name: "", cost: "", transportCost: "", minItems: "", maxItems: "" });
  }

  function startEditBox(box: Box) {
    setError(null);
    setBoxForm({
      id: box.id,
      boxTypeId: box.boxTypeId,
      name: box.name,
      cost: String(box.cost),
      transportCost: String(box.transportCost),
      minItems: box.minItems === null ? "" : String(box.minItems),
      maxItems: box.maxItems === null ? "" : String(box.maxItems),
    });
  }

  async function saveBoxForm() {
    if (!boxForm) return;
    const cost = Number(boxForm.cost);
    const transportCost = Number(boxForm.transportCost);
    if (!boxForm.name.trim()) {
      setError("Box name is required.");
      return;
    }
    if (!boxForm.cost || Number.isNaN(cost) || cost < 0) {
      setError("Box cost must be a non-negative number.");
      return;
    }
    if (!boxForm.transportCost || Number.isNaN(transportCost) || transportCost < 0) {
      setError("Transportation cost must be a non-negative number.");
      return;
    }
    const minItems = boxForm.minItems.trim() === "" ? null : Number(boxForm.minItems);
    const maxItems = boxForm.maxItems.trim() === "" ? null : Number(boxForm.maxItems);
    if (minItems !== null && (Number.isNaN(minItems) || minItems < 0)) {
      setError("Min items must be a non-negative number.");
      return;
    }
    if (maxItems !== null && (Number.isNaN(maxItems) || maxItems < 0)) {
      setError("Max items must be a non-negative number.");
      return;
    }
    if (minItems !== null && maxItems !== null && minItems > maxItems) {
      setError("Min items can't be greater than max items.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        boxTypeId: boxForm.boxTypeId,
        name: boxForm.name.trim(),
        cost,
        transportCost,
        minItems,
        maxItems,
      };
      const res = await fetch(boxForm.id ? `/api/hamper/boxes/${boxForm.id}` : "/api/hamper/boxes", {
        method: boxForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const box: Box = await res.json();
      const next = {
        ...config,
        boxes: boxForm.id ? config.boxes.map((b) => (b.id === box.id ? box : b)) : [...config.boxes, box],
      };
      setConfig(next);
      onChange(next);
      setBoxForm(null);
    } catch {
      setError("Could not save box.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {boxForm ? (boxForm.id ? "Edit Box" : "New Box") : "Manage Hamper Boxes"}
          </h2>
          <button
            onClick={boxForm ? () => setBoxForm(null) : onClose}
            className="rounded-md p-1 text-[var(--text-faint)] hover:bg-[var(--input-bg)] hover:text-[var(--text-secondary)]"
            aria-label="Close"
          >
            {boxForm ? "← Back" : "✕"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {!boxForm ? (
            <div className="space-y-5">
              {config.boxTypes.length === 0 && config.boxes.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No box types yet. Add your first one below.</p>
              )}

              <div className="rounded-lg border border-dashed border-[var(--panel-border)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold tracking-tight text-[var(--text-secondary)]">
                    Unassigned <span className="font-normal text-[var(--text-faint)]">(no box type yet)</span>
                  </div>
                  <button
                    onClick={() => startNewBox(null)}
                    className="rounded-md bg-[var(--secondary-accent)] px-2 py-1 text-xs font-medium text-[var(--secondary-fg)] hover:bg-[var(--secondary-accent-hover)] active:scale-[0.97]"
                  >
                    + Add Box
                  </button>
                </div>
                <ul className="space-y-1">
                  {config.boxes
                    .filter((b) => !b.boxTypeId)
                    .map((box) => (
                      <li
                        key={box.id}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[var(--input-bg)]"
                      >
                        <button onClick={() => startEditBox(box)} className="min-w-0 flex-1 text-left">
                          <span className="font-medium text-[var(--text-primary)]">{box.name}</span>
                          <span className="ml-2 text-xs text-[var(--text-muted)]">
                            {formatINR(box.cost)} box &middot; {formatINR(box.transportCost)} transport
                            {(box.minItems !== null || box.maxItems !== null) && (
                              <>
                                {" "}
                                &middot; {box.minItems ?? 0}
                                {box.maxItems !== null ? `-${box.maxItems}` : "+"} items
                              </>
                            )}
                          </span>
                        </button>
                        <button
                          onClick={() => deleteBox(box.id)}
                          className="shrink-0 px-1.5 text-xs text-[var(--text-faint)] hover:text-red-500"
                          aria-label={`Delete ${box.name}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  {config.boxes.filter((b) => !b.boxTypeId).length === 0 && (
                    <li className="px-2 py-1 text-xs text-[var(--text-faint)] italic">No unassigned boxes</li>
                  )}
                </ul>
              </div>

              {config.boxTypes.map((bt) => (
                <div key={bt.id} className="rounded-lg border border-[var(--panel-border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{bt.name}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startNewBox(bt.id)}
                        className="rounded-md bg-[var(--secondary-accent)] px-2 py-1 text-xs font-medium text-[var(--secondary-fg)] hover:bg-[var(--secondary-accent-hover)] active:scale-[0.97]"
                      >
                        + Add Box
                      </button>
                      <button
                        onClick={() => deleteBoxType(bt.id)}
                        className="text-xs text-[var(--text-faint)] hover:text-red-500"
                      >
                        Delete type
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {config.boxes
                      .filter((b) => b.boxTypeId === bt.id)
                      .map((box) => (
                        <li
                          key={box.id}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[var(--input-bg)]"
                        >
                          <button onClick={() => startEditBox(box)} className="min-w-0 flex-1 text-left">
                            <span className="font-medium text-[var(--text-primary)]">{box.name}</span>
                            <span className="ml-2 text-xs text-[var(--text-muted)]">
                              {formatINR(box.cost)} box &middot; {formatINR(box.transportCost)} transport
                            {(box.minItems !== null || box.maxItems !== null) && (
                              <>
                                {" "}
                                &middot; {box.minItems ?? 0}
                                {box.maxItems !== null ? `-${box.maxItems}` : "+"} items
                              </>
                            )}
                            </span>
                          </button>
                          <button
                            onClick={() => deleteBox(box.id)}
                            className="shrink-0 px-1.5 text-xs text-[var(--text-faint)] hover:text-red-500"
                            aria-label={`Delete ${box.name}`}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    {config.boxes.filter((b) => b.boxTypeId === bt.id).length === 0 && (
                      <li className="px-2 py-1 text-xs text-[var(--text-faint)] italic">No boxes in this type yet</li>
                    )}
                  </ul>
                </div>
              ))}

              <div className="flex gap-2 border-t border-[var(--panel-border)] pt-4">
                <input
                  type="text"
                  placeholder="New box type name (e.g. Festive Hampers)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  onClick={addBoxType}
                  disabled={busy || !newTypeName.trim()}
                  className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  Add Type
                </button>
              </div>

              <div className="rounded-lg border border-[var(--panel-border)] p-3">
                <div className="mb-2 text-sm font-semibold tracking-tight text-[var(--text-primary)]">Add-ons</div>
                <ul className="space-y-1">
                  {config.addOns.map((addOn) => (
                    <li key={addOn.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--input-bg)]">
                      <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{addOn.name}</span>
                      <label className="flex shrink-0 items-center gap-1 text-xs text-[var(--text-muted)]">
                        ₹
                        <input
                          type="number"
                          min={0}
                          value={addOn.costPerUnit}
                          onChange={(e) => updateAddOnCost(addOn.id, Math.max(0, Number(e.target.value) || 0))}
                          className="w-16 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 py-0.5 text-right text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                        />
                        /unit
                      </label>
                      <button
                        onClick={() => deleteAddOnEntry(addOn.id)}
                        className="shrink-0 px-1.5 text-xs text-[var(--text-faint)] hover:text-red-500"
                        aria-label={`Delete ${addOn.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  {config.addOns.length === 0 && (
                    <li className="px-2 py-1 text-xs text-[var(--text-faint)] italic">No add-ons yet</li>
                  )}
                </ul>
                <div className="mt-3 flex gap-2 border-t border-[var(--panel-border)] pt-3">
                  <input
                    type="text"
                    placeholder="Add-on name (e.g. Diya)"
                    value={newAddOnName}
                    onChange={(e) => setNewAddOnName(e.target.value)}
                    className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="₹/unit"
                    value={newAddOnCost}
                    onChange={(e) => setNewAddOnCost(e.target.value)}
                    className="w-24 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    onClick={addAddOnEntry}
                    disabled={busy || !newAddOnName.trim() || !newAddOnCost}
                    className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    Add Add-on
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Box Name *
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    value={boxForm.name}
                    onChange={(e) => setBoxForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  />
                </label>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Box Cost (₹) *
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    value={boxForm.cost}
                    onChange={(e) => setBoxForm((f) => (f ? { ...f, cost: e.target.value } : f))}
                  />
                </label>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Transportation Cost (₹) *
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    value={boxForm.transportCost}
                    onChange={(e) => setBoxForm((f) => (f ? { ...f, transportCost: e.target.value } : f))}
                  />
                </label>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Min Items
                  <input
                    type="number"
                    min={0}
                    placeholder="No minimum"
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
                    value={boxForm.minItems}
                    onChange={(e) => setBoxForm((f) => (f ? { ...f, minItems: e.target.value } : f))}
                  />
                </label>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Max Items
                  <input
                    type="number"
                    min={0}
                    placeholder="No maximum"
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
                    value={boxForm.maxItems}
                    onChange={(e) => setBoxForm((f) => (f ? { ...f, maxItems: e.target.value } : f))}
                  />
                </label>
                <label className="block text-xs font-medium text-[var(--text-secondary)] sm:col-span-2">
                  Box Type
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    value={boxForm.boxTypeId ?? ""}
                    onChange={(e) => setBoxForm((f) => (f ? { ...f, boxTypeId: e.target.value || null } : f))}
                  >
                    <option value="">Unassigned</option>
                    {config.boxTypes.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="text-xs text-[var(--text-faint)]">
                Items are chosen per hamper when this box is added, not fixed here. Min/Max Items limits the total
                quantity of items packed into one box.
              </p>

              <div className="flex justify-end gap-2 border-t border-[var(--panel-border)] pt-4">
                <button
                  onClick={() => setBoxForm(null)}
                  className="rounded-md border border-[var(--input-border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBoxForm}
                  disabled={busy}
                  className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Box"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
