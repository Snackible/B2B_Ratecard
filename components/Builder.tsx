"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import type { Item, NewItemInput, RateCardSnapshot } from "@/lib/types";
import { DISCOUNT_OPTIONS } from "@/lib/types";
import { buildRows, type SelectedRow } from "@/lib/rows";
import CatalogBrowser from "./CatalogBrowser";
import RateCardPreview from "./RateCardPreview";
import AddItemModal from "./AddItemModal";

function deriveInitialQuantities(items: Item[], snapshot: RateCardSnapshot | null | undefined) {
  const map = new Map<string, number>();
  if (!snapshot) return { map, unmatched: 0 };
  const rows = buildRows(items);
  let unmatched = 0;
  for (const li of snapshot.lineItems) {
    const match = rows.find(
      (r) => r.itemId === li.itemId && (r.grammage === li.grammage || r.mrp === li.mrp)
    );
    if (match) map.set(match.key, li.quantity);
    else unmatched++;
  }
  return { map, unmatched };
}

export default function Builder({
  initialItems,
  initialSnapshot,
  editId,
}: {
  initialItems: Item[];
  initialSnapshot?: RateCardSnapshot | null;
  editId?: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [quantities, setQuantities] = useState<Map<string, number>>(
    () => deriveInitialQuantities(initialItems, initialSnapshot).map
  );
  const [discountPercent, setDiscountPercent] = useState(initialSnapshot?.discountPercent ?? 0);
  const [showClientName, setShowClientName] = useState(initialSnapshot?.showClientName ?? false);
  const [clientName, setClientName] = useState(initialSnapshot?.clientName ?? "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(() => {
    if (!initialSnapshot) return null;
    const { unmatched } = deriveInitialQuantities(initialItems, initialSnapshot);
    const unmatchedNote =
      unmatched > 0 ? ` (${unmatched} item${unmatched === 1 ? "" : "s"} no longer in the catalog)` : "";
    return editId
      ? `Editing saved rate card — saving will update it in place.${unmatchedNote}`
      : `Loaded from history — saving will create a new rate card.${unmatchedNote}`;
  });

  useEffect(() => {
    if (initialSnapshot) router.replace("/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => buildRows(items), [items]);
  const existingCategories = useMemo(
    () => [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b)),
    [items]
  );
  const existingSections = useMemo(
    () =>
      [...new Set(items.map((i) => i.section).filter((s): s is string => Boolean(s)))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );
  const selectedKeys = useMemo(() => new Set(quantities.keys()), [quantities]);
  const selectedRows: SelectedRow[] = useMemo(
    () =>
      rows
        .filter((r) => quantities.has(r.key))
        .map((r) => ({ ...r, quantity: quantities.get(r.key)! })),
    [rows, quantities]
  );

  function toggleRow(key: string) {
    setQuantities((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, 1);
      return next;
    });
  }

  function setQuantity(key: string, quantity: number) {
    setQuantities((prev) => {
      const next = new Map(prev);
      next.set(key, Math.max(1, quantity));
      return next;
    });
  }

  async function renderJpeg(): Promise<string> {
    if (!exportRef.current) throw new Error("Preview not ready");
    return toJpeg(exportRef.current, { quality: 0.95, backgroundColor: "#ffffff", pixelRatio: 2 });
  }

  async function handleSaveAndDownload() {
    if (selectedRows.length === 0) {
      setMessage("Select at least one item first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const dataUrl = await renderJpeg();

      const a = document.createElement("a");
      const filename = clientName.trim() ? `ratecard-${clientName.trim()}.jpg` : "ratecard.jpg";
      a.href = dataUrl;
      a.download = filename.replace(/\s+/g, "-").toLowerCase();
      a.click();

      const res = await fetch(editId ? `/api/ratecards/${editId}` : "/api/ratecards", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim() || null,
          showClientName,
          discountPercent,
          lineItems: selectedRows.map((r) => ({
            itemId: r.itemId,
            name: r.name,
            category: r.category,
            packLabel: r.packLabel,
            grammage: r.grammage,
            shelfLifeDays: r.shelfLifeDays,
            mrp: r.mrp,
            quantity: r.quantity,
          })),
          imageDataUrl: dataUrl,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage(editId ? "Updated and downloaded." : "Saved and downloaded.");
      router.refresh();
    } catch {
      setMessage("Could not save/download the rate card.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddItem(input: NewItemInput) {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to add item");
    const created: Item = await res.json();
    setItems((prev) => [...prev, created]);
  }

  async function handleDeleteItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setQuantities((prev) => {
      const next = new Map(prev);
      next.delete(`${itemId}:standard`);
      next.delete(`${itemId}:larger`);
      return next;
    });
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm lg:h-[calc(100vh-160px)]">
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
          <CatalogBrowser
            rows={rows}
            selectedKeys={selectedKeys}
            onToggle={toggleRow}
            onDeleteItem={handleDeleteItem}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
          <div>
            <div className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Discount</div>
            <div className="flex gap-1">
              {DISCOUNT_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDiscountPercent(d)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium active:scale-[0.97] ${
                    discountPercent === d
                      ? "border-[var(--secondary-accent)] bg-[var(--secondary-accent)] text-[var(--secondary-fg)]"
                      : "border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                  }`}
                >
                  {d === 0 ? "None" : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-[var(--panel-border)]" aria-hidden />

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-44 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={showClientName}
                onChange={(e) => setShowClientName(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Show on card
            </label>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {message && <span className="text-xs text-[var(--text-muted)]">{message}</span>}
            <button
              onClick={handleSaveAndDownload}
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {busy ? "Saving..." : editId ? "Update & Download JPEG" : "Save & Download JPEG"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--panel-border)] shadow-sm">
          <RateCardPreview
            rows={selectedRows}
            discountPercent={discountPercent}
            showClientName={showClientName}
            clientName={clientName}
            onRemove={toggleRow}
            onQuantityChange={setQuantity}
          />
        </div>
      </div>

      {/* Off-screen clean copy used only for JPEG export (no interactive controls, always light/branded). */}
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <div style={{ width: 900 }}>
          <RateCardPreview
            ref={exportRef}
            rows={selectedRows}
            discountPercent={discountPercent}
            showClientName={showClientName}
            clientName={clientName}
            forceLight
          />
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
          existingCategories={existingCategories}
          existingSections={existingSections}
        />
      )}
    </div>
  );
}
