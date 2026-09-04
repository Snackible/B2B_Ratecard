"use client";

import { useMemo, useState } from "react";
import type { Box, HamperConfig, Item } from "@/lib/types";
import { formatINR } from "@/lib/rows";

type Props = {
  items: Item[];
  hamperConfig: HamperConfig;
  onClose: () => void;
  onChange: (config: HamperConfig) => void;
};

type BoxForm = {
  id: string | null;
  boxTypeId: string;
  name: string;
  cost: string;
  itemIds: Set<string>;
};

export default function BoxManagerModal({ items, hamperConfig, onClose, onChange }: Props) {
  const [config, setConfig] = useState(hamperConfig);
  const [newTypeName, setNewTypeName] = useState("");
  const [boxForm, setBoxForm] = useState<BoxForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

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

  function startNewBox(boxTypeId: string) {
    setError(null);
    setBoxForm({ id: null, boxTypeId, name: "", cost: "", itemIds: new Set() });
  }

  function startEditBox(box: Box) {
    setError(null);
    setBoxForm({ id: box.id, boxTypeId: box.boxTypeId, name: box.name, cost: String(box.cost), itemIds: new Set(box.itemIds) });
  }

  function toggleFormItem(itemId: string) {
    setBoxForm((f) => {
      if (!f) return f;
      const next = new Set(f.itemIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { ...f, itemIds: next };
    });
  }

  async function saveBoxForm() {
    if (!boxForm) return;
    const cost = Number(boxForm.cost);
    if (!boxForm.name.trim()) {
      setError("Box name is required.");
      return;
    }
    if (!boxForm.cost || Number.isNaN(cost) || cost < 0) {
      setError("Box cost must be a non-negative number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        boxTypeId: boxForm.boxTypeId,
        name: boxForm.name.trim(),
        cost,
        itemIds: [...boxForm.itemIds],
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
              {config.boxTypes.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No box types yet. Add your first one below.</p>
              )}
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
                              {box.itemIds.length} eligible item{box.itemIds.length === 1 ? "" : "s"} &middot;{" "}
                              {formatINR(box.cost)} box cost
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
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  Eligible items ({boxForm.itemIds.size} selected)
                </div>
                <div className="max-h-72 overflow-y-auto rounded-md border border-[var(--input-border)] p-2">
                  {itemsByCategory.length === 0 && (
                    <p className="p-2 text-xs text-[var(--text-faint)] italic">No catalog items yet.</p>
                  )}
                  {itemsByCategory.map(([category, catItems]) => (
                    <details key={category} open className="mb-1">
                      <summary className="cursor-pointer select-none rounded px-2 py-1 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase hover:bg-[var(--input-bg)]">
                        {category}
                      </summary>
                      <ul>
                        {catItems.map((item) => (
                          <li key={item.id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-[var(--text-primary)] hover:bg-[var(--input-bg)]">
                              <input
                                type="checkbox"
                                checked={boxForm.itemIds.has(item.id)}
                                onChange={() => toggleFormItem(item.id)}
                                className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                              />
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                              <span className="tabular-nums shrink-0 text-xs text-[var(--text-faint)]">
                                {formatINR(item.mrp)}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>

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
