"use client";

import { useState } from "react";
import type { SelectedRow } from "@/lib/rows";
import { formatINR } from "@/lib/rows";
import { computePricing } from "@/lib/pricing";
import type { HamperBoxInstance, Item } from "@/lib/types";
import DiscountPicker from "./DiscountPicker";

type Props = {
  rows: SelectedRow[];
  boxInstances?: HamperBoxInstance[];
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  transportCostEnabled?: boolean;
  transportCostAmount?: number;
  /** When false, only the item table and Subtotal are shown — discount/box
   *  cost/transport/payable are left for the dedicated preview step. */
  showTotals?: boolean;
  /** Bulk rows only: edit quantity or unselect a row entirely. */
  onQuantityChange?: (key: string, quantity: number) => void;
  onRemove?: (key: string) => void;
  /** Hamper box line items only: edit quantity, remove, or add an item to a box. */
  onLineItemQuantityChange?: (boxKey: string, itemId: string, quantity: number) => void;
  onLineItemRemove?: (boxKey: string, itemId: string) => void;
  items?: Item[];
  onAddLineItem?: (boxKey: string, item: Item) => void;
};

export default function PriceSummary({
  rows,
  boxInstances,
  discountPercent,
  onDiscountChange,
  transportCostEnabled,
  transportCostAmount,
  showTotals = true,
  onQuantityChange,
  onRemove,
  onLineItemQuantityChange,
  onLineItemRemove,
  items,
  onAddLineItem,
}: Props) {
  const { subtotal, discountAmount, boxCostTotal, transportAmount, addOnTotalsByName, payableAmount } =
    computePricing({ rows, boxInstances, discountPercent, transportCostEnabled, transportCostAmount });
  const hasBoxes = Boolean(boxInstances && boxInstances.length > 0);
  const [addToBoxKey, setAddToBoxKey] = useState<string | null>(null);
  const [addToBoxSearch, setAddToBoxSearch] = useState("");

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-sm">
      {hasBoxes ? (
        <div className="divide-y divide-[var(--panel-border)]">
          {boxInstances!.map((box) => (
            <div key={box.key} className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <span>
                  {box.boxTypeName ? `${box.boxTypeName} — ` : ""}
                  {box.boxName}
                </span>
                <span className="tabular-nums text-xs font-normal text-[var(--text-muted)]">
                  {box.quantity > 1 ? `${box.quantity}× · ` : ""}
                  {formatINR(box.boxCost)} box &middot; {formatINR(box.transportCost)} transport
                </span>
              </div>
              {box.lineItems.length > 0 ? (
                <div className="divide-y divide-[var(--panel-border)] text-sm">
                  {box.lineItems.map((li) => (
                    <div
                      key={li.itemId}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1 hover:bg-[var(--input-bg)]"
                    >
                      <span className="min-w-0 flex-1 basis-full truncate pr-2 text-[var(--text-secondary)] sm:basis-auto">
                        {li.name}
                      </span>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <span className="tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                          {formatINR(li.mrp)}
                        </span>
                        {onLineItemQuantityChange ? (
                          <input
                            type="number"
                            min={1}
                            value={li.quantity}
                            onChange={(e) =>
                              onLineItemQuantityChange(
                                box.key,
                                li.itemId,
                                Math.max(1, Number(e.target.value) || 1)
                              )
                            }
                            className="w-14 shrink-0 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs tabular-nums text-[var(--text-primary)]"
                          />
                        ) : (
                          <span className="tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                            ×{li.quantity}
                          </span>
                        )}
                        <span className="tabular-nums whitespace-nowrap font-medium text-[var(--text-primary)]">
                          {formatINR(li.mrp * li.quantity)}
                        </span>
                        {onLineItemRemove && (
                          <button
                            type="button"
                            onClick={() => onLineItemRemove(box.key, li.itemId)}
                            title="Remove from box"
                            aria-label={`Remove ${li.name} from ${box.boxName}`}
                            className="shrink-0 px-1 text-[var(--text-faint)] hover:text-red-500"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-faint)] italic">No items in this box yet.</p>
              )}

              {onAddLineItem && items && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddToBoxKey((cur) => (cur === box.key ? null : box.key));
                      setAddToBoxSearch("");
                    }}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    {addToBoxKey === box.key ? "Cancel" : "+ Add item"}
                  </button>
                  {addToBoxKey === box.key && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={addToBoxSearch}
                        onChange={(e) => setAddToBoxSearch(e.target.value)}
                        className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
                      />
                      <ul className="mt-1 max-h-40 overflow-y-auto">
                        {items
                          .filter((item) => !box.lineItems.some((li) => li.itemId === item.id))
                          .filter((item) =>
                            addToBoxSearch.trim()
                              ? item.name.toLowerCase().includes(addToBoxSearch.trim().toLowerCase())
                              : true
                          )
                          .slice(0, 50)
                          .map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-[var(--input-bg)]"
                            >
                              <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{item.name}</span>
                              <span className="tabular-nums shrink-0 text-[var(--text-muted)]">
                                {formatINR(item.mrp)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onAddLineItem(box.key, item)}
                                className="shrink-0 rounded bg-[var(--accent)] px-2 py-0.5 text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
                              >
                                + Add
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        rows.length > 0 && (
          <div className="divide-y divide-[var(--panel-border)] px-4 text-sm">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 hover:bg-[var(--input-bg)]"
              >
                <span className="min-w-0 flex-1 basis-full truncate pr-2 text-[var(--text-secondary)] sm:basis-auto">
                  {row.name}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                    {formatINR(row.mrp)}
                  </span>
                  {onQuantityChange ? (
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => onQuantityChange(row.key, Math.max(1, Number(e.target.value) || 1))}
                      className="w-14 shrink-0 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs tabular-nums text-[var(--text-primary)]"
                    />
                  ) : (
                    <span className="tabular-nums whitespace-nowrap text-[var(--text-muted)]">×{row.quantity}</span>
                  )}
                  <span className="tabular-nums whitespace-nowrap font-medium text-[var(--text-primary)]">
                    {formatINR(row.mrp * row.quantity)}
                  </span>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(row.key)}
                      title="Remove from rate card"
                      aria-label={`Remove ${row.name} from rate card`}
                      className="shrink-0 px-1 text-[var(--text-faint)] hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="divide-y divide-[var(--panel-border)] border-t border-[var(--panel-border)] text-sm">
        <SummaryRow label="Subtotal" value={formatINR(subtotal)} />
        {showTotals && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <DiscountPicker value={discountPercent} onChange={onDiscountChange} hideLabel />
              <span className="tabular-nums font-semibold text-[var(--text-primary)]">
                {formatINR(discountAmount > 0 ? -discountAmount : 0)}
              </span>
            </div>
            {hasBoxes && <SummaryRow label="Box cost" value={formatINR(boxCostTotal)} />}
            {transportCostEnabled && <SummaryRow label="Transport cost" value={formatINR(transportAmount)} />}
            {[...addOnTotalsByName.entries()].map(([name, a]) => (
              <SummaryRow key={name} label={`${name} (${a.quantity})`} value={formatINR(a.total)} />
            ))}
            <SummaryRow label="Payable Amount" value={formatINR(payableAmount)} bold />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${bold ? "font-semibold" : ""}`}>
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="tabular-nums text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
