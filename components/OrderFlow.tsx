"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import type {
  AppSettings,
  HamperBoxInstance,
  HamperConfig,
  Item,
  NewItemInput,
  OrderType,
  RateCardSnapshot,
} from "@/lib/types";
import { buildRows } from "@/lib/rows";
import { buildRateCardCsv, downloadCsv } from "@/lib/csv";
import { buildRateCardExcel, downloadExcel } from "@/lib/excel";
import OrderTypeSelect from "./OrderTypeSelect";
import BulkBuilder from "./BulkBuilder";
import HamperBuilder from "./HamperBuilder";
import RateCardPreview from "./RateCardPreview";

type Step = "select" | "build" | "preview";

function deriveInitialQuantities(items: Item[], snapshot: RateCardSnapshot | null | undefined) {
  const map = new Map<string, number>();
  if (!snapshot || snapshot.orderType !== "bulk") return map;
  const rows = buildRows(items);
  for (const li of snapshot.lineItems) {
    const match = rows.find((r) => r.itemId === li.itemId && (r.grammage === li.grammage || r.mrp === li.mrp));
    if (match) map.set(match.key, li.quantity);
  }
  return map;
}

export default function OrderFlow({
  initialItems,
  initialHamperConfig,
  initialSettings,
  initialSnapshot,
  editId,
}: {
  initialItems: Item[];
  initialHamperConfig: HamperConfig;
  initialSettings: AppSettings;
  initialSnapshot?: RateCardSnapshot | null;
  editId?: string | null;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(initialSnapshot ? "build" : "select");
  const [orderType, setOrderType] = useState<OrderType | null>(initialSnapshot?.orderType ?? null);

  const [items, setItems] = useState(initialItems);
  const [hamperConfig, setHamperConfig] = useState(initialHamperConfig);
  const [transportCost, setTransportCost] = useState(initialSettings.transportCost);

  const [quantities, setQuantities] = useState<Map<string, number>>(() =>
    deriveInitialQuantities(initialItems, initialSnapshot)
  );
  const [boxInstances, setBoxInstances] = useState<HamperBoxInstance[]>(
    initialSnapshot?.orderType === "hamper" ? (initialSnapshot.boxInstances ?? []) : []
  );

  const [discountPercent, setDiscountPercent] = useState(initialSnapshot?.discountPercent ?? 0);
  const [showClientName, setShowClientName] = useState(initialSnapshot?.showClientName ?? true);
  const [clientName, setClientName] = useState(initialSnapshot?.clientName ?? "");
  const [transportCostEnabled, setTransportCostEnabled] = useState(initialSnapshot?.transportCostEnabled ?? false);

  const [busy, setBusy] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [message, setMessage] = useState<string | null>(() => {
    if (!initialSnapshot) return null;
    return editId
      ? "Editing saved rate card — saving will update it in place."
      : "Loaded from history — saving will create a new rate card.";
  });

  useEffect(() => {
    if (initialSnapshot) router.replace("/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => buildRows(items), [items]);
  const selectedRows = useMemo(
    () =>
      rows
        .filter((r) => quantities.has(r.key))
        .map((r) => ({ ...r, quantity: quantities.get(r.key)! })),
    [rows, quantities]
  );

  const boxCostTotal = useMemo(() => boxInstances.reduce((sum, b) => sum + b.boxCost, 0), [boxInstances]);
  const hamperTransportTotal = useMemo(
    () => boxInstances.reduce((sum, b) => sum + b.transportCost, 0),
    [boxInstances]
  );
  const isHamper = orderType === "hamper";
  const canProceedFromBuild = isHamper ? boxInstances.length > 0 : selectedRows.length > 0;
  const transportEnabledForSave = isHamper ? true : transportCostEnabled;
  const transportAmountForSave = isHamper ? hamperTransportTotal : transportCost;

  const addOnsCostTotal = useMemo(
    () => boxInstances.reduce((sum, b) => sum + b.addOnSelections.reduce((s, a) => s + a.total, 0), 0),
    [boxInstances]
  );

  function toggleRow(key: string) {
    setQuantities((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, 1);
      return next;
    });
  }

  function setRowQuantity(key: string, quantity: number) {
    setQuantities((prev) => {
      const next = new Map(prev);
      next.set(key, quantity);
      return next;
    });
  }

  function addBoxInstance(instance: HamperBoxInstance) {
    setBoxInstances((prev) => [...prev, instance]);
  }

  function removeBoxInstance(key: string) {
    setBoxInstances((prev) => prev.filter((b) => b.key !== key));
  }

  // Manual edit of the box-cost/transport-cost line itself: fixes that value and
  // stops it from following further quantity changes (see updateBoxInstanceQuantity).
  function updateBoxInstanceCost(key: string, field: "boxCost" | "transportCost", value: number) {
    const manualField = field === "boxCost" ? "boxCostManual" : "transportCostManual";
    setBoxInstances((prev) => prev.map((b) => (b.key === key ? { ...b, [field]: value, [manualField]: true } : b)));
  }

  // Quantity change: re-derive boxCost/transportCost from the box template's
  // per-box rate x quantity, unless that field was manually overridden.
  function updateBoxInstanceQuantity(key: string, quantity: number) {
    setBoxInstances((prev) =>
      prev.map((b) => {
        if (b.key !== key) return b;
        const template = hamperConfig.boxes.find((box) => box.id === b.boxId);
        return {
          ...b,
          quantity,
          boxCost: b.boxCostManual || !template ? b.boxCost : template.cost * quantity,
          transportCost: b.transportCostManual || !template ? b.transportCost : template.transportCost * quantity,
        };
      })
    );
  }

  function updateBoxInstanceLineItemQuantity(key: string, itemId: string, quantity: number) {
    setBoxInstances((prev) =>
      prev.map((b) =>
        b.key === key
          ? { ...b, lineItems: b.lineItems.map((li) => (li.itemId === itemId ? { ...li, quantity } : li)) }
          : b
      )
    );
  }

  // Add-ons are chosen per box, not once for the whole hamper.
  function toggleBoxAddOn(boxKey: string, addOnId: string, enabled: boolean) {
    setBoxInstances((prev) =>
      prev.map((b) => {
        if (b.key !== boxKey) return b;
        if (!enabled) return { ...b, addOnSelections: b.addOnSelections.filter((a) => a.addOnId !== addOnId) };
        if (b.addOnSelections.some((a) => a.addOnId === addOnId)) return b;
        const addOn = hamperConfig.addOns.find((a) => a.id === addOnId);
        if (!addOn) return b;
        return {
          ...b,
          addOnSelections: [
            ...b.addOnSelections,
            { addOnId, name: addOn.name, costPerUnit: addOn.costPerUnit, quantity: 1, total: addOn.costPerUnit, totalManual: false },
          ],
        };
      })
    );
  }

  function setBoxAddOnQuantity(boxKey: string, addOnId: string, quantity: number) {
    setBoxInstances((prev) =>
      prev.map((b) =>
        b.key !== boxKey
          ? b
          : {
              ...b,
              addOnSelections: b.addOnSelections.map((a) =>
                a.addOnId === addOnId
                  ? { ...a, quantity, total: a.totalManual ? a.total : quantity * a.costPerUnit }
                  : a
              ),
            }
      )
    );
  }

  function setBoxAddOnTotal(boxKey: string, addOnId: string, total: number) {
    setBoxInstances((prev) =>
      prev.map((b) =>
        b.key !== boxKey
          ? b
          : {
              ...b,
              addOnSelections: b.addOnSelections.map((a) =>
                a.addOnId === addOnId ? { ...a, total, totalManual: true } : a
              ),
            }
      )
    );
  }

  // Editing an add-on's rate updates the shared definition (used by every box)
  // and refreshes any non-manual selection currently using it.
  function setAddOnCostPerUnit(addOnId: string, costPerUnit: number) {
    setHamperConfig((prev) => ({
      ...prev,
      addOns: prev.addOns.map((a) => (a.id === addOnId ? { ...a, costPerUnit } : a)),
    }));
    setBoxInstances((prev) =>
      prev.map((b) => ({
        ...b,
        addOnSelections: b.addOnSelections.map((a) =>
          a.addOnId === addOnId
            ? { ...a, costPerUnit, total: a.totalManual ? a.total : a.quantity * costPerUnit }
            : a
        ),
      }))
    );
    fetch("/api/hamper/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addOns: hamperConfig.addOns.map((a) => (a.id === addOnId ? { ...a, costPerUnit } : a)),
      }),
    }).catch(() => {});
  }

  async function renderJpeg(): Promise<string> {
    if (!exportRef.current) throw new Error("Preview not ready");
    return toJpeg(exportRef.current, { quality: 0.95, backgroundColor: "#ffffff", pixelRatio: 2 });
  }

  async function handleSaveAndDownload() {
    if (!orderType || !canProceedFromBuild) return;
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
          orderType,
          clientName: clientName.trim() || null,
          showClientName,
          discountPercent,
          transportCostEnabled: transportEnabledForSave,
          transportCostAmount: transportAmountForSave,
          boxCostTotal: isHamper ? boxCostTotal : 0,
          addOnsCostTotal: isHamper ? addOnsCostTotal : 0,
          lineItems: isHamper
            ? []
            : selectedRows.map((r) => ({
                itemId: r.itemId,
                name: r.name,
                category: r.category,
                packLabel: r.packLabel,
                grammage: r.grammage,
                shelfLifeDays: r.shelfLifeDays,
                mrp: r.mrp,
                quantity: r.quantity,
              })),
          boxInstances: isHamper ? boxInstances : undefined,
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

  function handleDownloadCsv() {
    if (!orderType) return;
    const csv = buildRateCardCsv({
      orderType,
      rows: isHamper ? [] : selectedRows,
      boxInstances: isHamper ? boxInstances : undefined,
      discountPercent,
      transportCostEnabled: transportEnabledForSave,
      transportCostAmount: transportAmountForSave,
    });
    const filename = clientName.trim() ? `ratecard-${clientName.trim()}.csv` : "ratecard.csv";
    downloadCsv(filename.replace(/\s+/g, "-").toLowerCase(), csv);
  }

  async function handleDownloadExcel() {
    if (!orderType) return;
    const buffer = await buildRateCardExcel({
      orderType,
      rows: isHamper ? [] : selectedRows,
      boxInstances: isHamper ? boxInstances : undefined,
      discountPercent,
      transportCostEnabled: transportEnabledForSave,
      transportCostAmount: transportAmountForSave,
      clientName,
      showClientName,
    });
    const filename = clientName.trim() ? `ratecard-${clientName.trim()}.xlsx` : "ratecard.xlsx";
    downloadExcel(filename.replace(/\s+/g, "-").toLowerCase(), buffer);
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

  async function handleUpdateItem(itemId: string, input: NewItemInput) {
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update item");
    const updated: Item = await res.json();
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
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

  if (step === "select") {
    return (
      <OrderTypeSelect
        onSelect={(type) => {
          setOrderType(type);
          setStep("build");
        }}
      />
    );
  }

  const previewProps = isHamper
    ? {
        rows: [],
        boxInstances,
        transportCostEnabled: true,
        transportCostAmount: hamperTransportTotal,
      }
    : {
        rows: selectedRows,
        boxInstances: undefined,
        transportCostEnabled,
        transportCostAmount: transportCost,
      };

  return (
    <div className="flex flex-col gap-4">
      {step === "build" && orderType && (
        <>
          {isHamper ? (
            <HamperBuilder
              items={items}
              hamperConfig={hamperConfig}
              onHamperConfigChange={setHamperConfig}
              boxInstances={boxInstances}
              onAddBoxInstance={addBoxInstance}
              onRemoveBoxInstance={removeBoxInstance}
              onUpdateBoxInstanceCost={updateBoxInstanceCost}
              onUpdateBoxInstanceQuantity={updateBoxInstanceQuantity}
              onUpdateBoxInstanceLineItemQuantity={updateBoxInstanceLineItemQuantity}
              discountPercent={discountPercent}
              onDiscountChange={setDiscountPercent}
              clientName={clientName}
              onClientNameChange={setClientName}
              showClientName={showClientName}
              onShowClientNameChange={setShowClientName}
              onToggleBoxAddOn={toggleBoxAddOn}
              onBoxAddOnQuantityChange={setBoxAddOnQuantity}
              onBoxAddOnTotalChange={setBoxAddOnTotal}
              onAddOnCostPerUnitChange={setAddOnCostPerUnit}
              onNext={() => setStep("preview")}
            />
          ) : (
            <BulkBuilder
              items={items}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              quantities={quantities}
              onToggle={toggleRow}
              discountPercent={discountPercent}
              onDiscountChange={setDiscountPercent}
              clientName={clientName}
              onClientNameChange={setClientName}
              showClientName={showClientName}
              onShowClientNameChange={setShowClientName}
              transportCostEnabled={transportCostEnabled}
              onTransportCostEnabledChange={setTransportCostEnabled}
              transportCost={transportCost}
              onTransportCostChange={setTransportCost}
              onNext={() => setStep("preview")}
            />
          )}
          {!initialSnapshot && (
            <div className="mx-auto w-full max-w-3xl">
              <button
                onClick={() => {
                  setOrderType(null);
                  setStep("select");
                }}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                &larr; Choose a different order type
              </button>
            </div>
          )}
        </>
      )}

      {step === "preview" && orderType && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
            <button
              onClick={() => setStep("build")}
              className="rounded-md border border-[var(--input-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)] active:scale-[0.98]"
            >
              &larr; Back
            </button>
            <div className="ml-auto flex items-center gap-3">
              {message && <span className="text-xs text-[var(--text-muted)]">{message}</span>}
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowDownloadMenu(false);
                }}
              >
                <button
                  onClick={() => setShowDownloadMenu((v) => !v)}
                  className="flex items-center gap-1 rounded-md border border-[var(--input-border)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)] active:scale-[0.97]"
                >
                  Download
                  <span aria-hidden>▾</span>
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-md border border-[var(--input-border)] bg-[var(--panel-bg)] shadow-lg">
                    <button
                      onClick={() => {
                        setShowDownloadMenu(false);
                        handleDownloadCsv();
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => {
                        setShowDownloadMenu(false);
                        handleDownloadExcel();
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                    >
                      Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>
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
              rows={previewProps.rows}
              boxInstances={previewProps.boxInstances}
              discountPercent={discountPercent}
              showClientName={showClientName}
              clientName={clientName}
              transportCostEnabled={previewProps.transportCostEnabled}
              transportCostAmount={previewProps.transportCostAmount}
              onQuantityChange={orderType === "bulk" ? setRowQuantity : undefined}
              onRemove={orderType === "bulk" ? toggleRow : undefined}
            />
          </div>
        </div>
      )}

      {/* Off-screen clean copy used only for JPEG export (no interactive controls, always light/branded). */}
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <div style={{ width: 900 }}>
          <RateCardPreview
            ref={exportRef}
            rows={previewProps.rows}
            boxInstances={previewProps.boxInstances}
            discountPercent={discountPercent}
            showClientName={showClientName}
            clientName={clientName}
            transportCostEnabled={previewProps.transportCostEnabled}
            transportCostAmount={previewProps.transportCostAmount}
            forceLight
          />
        </div>
      </div>
    </div>
  );
}
