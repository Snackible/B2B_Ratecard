"use client";

import { useEffect, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import type { RateCardSnapshot } from "@/lib/types";
import type { SelectedRow } from "@/lib/rows";
import RateCardPreview from "./RateCardPreview";

function snapshotRows(snapshot: RateCardSnapshot): SelectedRow[] {
  return snapshot.lineItems.map((li, i) => ({
    key: `${li.itemId}:${i}`,
    itemId: li.itemId,
    name: li.name,
    category: li.category,
    section: null,
    segment: "Standard Grammage",
    packLabel: li.packLabel,
    grammage: li.grammage,
    shelfLifeDays: li.shelfLifeDays,
    mrp: li.mrp,
    hasCogsData: false,
    quantity: li.quantity,
  }));
}

function savedDateLabel(snapshot: RateCardSnapshot): string {
  return new Date(snapshot.updatedAt ?? snapshot.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// Saved cards store only their data, not an image — the JPEG is redrawn here, off-screen,
// from that data (with the card's original date) each time it's downloaded.
export default function DownloadRateCardButton({ id, filename }: { id: string; filename: string }) {
  const [snapshot, setSnapshot] = useState<RateCardSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/ratecards/${id}`);
      if (!res.ok) throw new Error();
      setSnapshot((await res.json()) as RateCardSnapshot);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled || !cardRef.current) return;
        const dataUrl = await toJpeg(cardRef.current, { quality: 0.95, backgroundColor: "#ffffff", pixelRatio: 2 });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) {
          setSnapshot(null);
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, filename]);

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {busy ? "Downloading..." : failed ? "Retry download" : "Download"}
      </button>
      {snapshot && (
        <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
          <div style={{ width: 900 }}>
            <RateCardPreview
              ref={cardRef}
              rows={snapshot.orderType === "hamper" ? [] : snapshotRows(snapshot)}
              boxInstances={snapshot.orderType === "hamper" ? snapshot.boxInstances : undefined}
              discountPercent={snapshot.discountPercent}
              showClientName={snapshot.showClientName}
              clientName={snapshot.clientName ?? ""}
              transportCostEnabled={snapshot.transportCostEnabled}
              transportCostAmount={snapshot.transportCostAmount}
              dateLabel={savedDateLabel(snapshot)}
              forceLight
            />
          </div>
        </div>
      )}
    </>
  );
}
