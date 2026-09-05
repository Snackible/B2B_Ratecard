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
  const [diyaPackCost, setDiyaPackCost] = useState(initialSettings.diyaPackCost);

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
  const [diyaEnabled, setDiyaEnabled] = useState(initialSnapshot?.diyaEnabled ?? false);
  const [diyaQuantity, setDiyaQuantity] = useState(initialSnapshot?.diyaQuantity ?? 1);

  const [busy, setBusy] = useState(false);
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
  const diyaCostTotal = isHamper && diyaEnabled ? diyaQuantity * diyaPackCost : 0;

  function toggleRow(key: string) {
    setQuantities((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, 1);
      return next;
    });
  }

  function addBoxInstance(instance: HamperBoxInstance) {
    setBoxInstances((prev) => [...prev, instance]);
  }

  function removeBoxInstance(key: string) {
    setBoxInstances((prev) => prev.filter((b) => b.key !== key));
  }

  function updateBoxInstance(key: string, patch: Partial<Pick<HamperBoxInstance, "boxCost" | "transportCost">>) {
    setBoxInstances((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
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
          diyaEnabled: isHamper ? diyaEnabled : false,
          diyaQuantity: isHamper ? diyaQuantity : 0,
          diyaCostTotal: isHamper ? diyaCostTotal : 0,
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
        diyaEnabled,
        diyaQuantity,
        diyaCostTotal,
      }
    : {
        rows: selectedRows,
        boxInstances: undefined,
        transportCostEnabled,
        transportCostAmount: transportCost,
        diyaEnabled: false,
        diyaQuantity: 0,
        diyaCostTotal: 0,
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
              onUpdateBoxInstance={updateBoxInstance}
              discountPercent={discountPercent}
              onDiscountChange={setDiscountPercent}
              clientName={clientName}
              onClientNameChange={setClientName}
              showClientName={showClientName}
              onShowClientNameChange={setShowClientName}
              diyaEnabled={diyaEnabled}
              onDiyaEnabledChange={setDiyaEnabled}
              diyaQuantity={diyaQuantity}
              onDiyaQuantityChange={setDiyaQuantity}
              diyaPackCost={diyaPackCost}
              onDiyaPackCostChange={setDiyaPackCost}
              onNext={() => setStep("preview")}
            />
          ) : (
            <BulkBuilder
              items={items}
              onAddItem={handleAddItem}
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
              diyaEnabled={previewProps.diyaEnabled}
              diyaQuantity={previewProps.diyaQuantity}
              diyaCostTotal={previewProps.diyaCostTotal}
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
            diyaEnabled={previewProps.diyaEnabled}
            diyaQuantity={previewProps.diyaQuantity}
            diyaCostTotal={previewProps.diyaCostTotal}
            forceLight
          />
        </div>
      </div>
    </div>
  );
}
