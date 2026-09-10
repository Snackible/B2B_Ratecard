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
    <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-sm">
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
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[var(--panel-border)]">
                    {box.lineItems.map((li) => (
                      <tr key={li.itemId}>
                        <td className="py-1 pr-2 text-[var(--text-secondary)]">{li.name}</td>
                        <td className="py-1 px-2 text-right tabular-nums text-[var(--text-muted)]">
                          {formatINR(li.mrp)}
                        </td>
                        <td className="py-1 px-2 text-right">
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
                              className="w-14 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs tabular-nums text-[var(--text-primary)]"
                            />
                          ) : (
                            <span className="tabular-nums text-[var(--text-muted)]">×{li.quantity}</span>
                          )}
                        </td>
                        <td className="py-1 pl-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
                          {formatINR(li.mrp * li.quantity)}
                        </td>
                        {onLineItemRemove && (
                          <td className="py-1 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => onLineItemRemove(box.key, li.itemId)}
                              title="Remove from box"
                              aria-label={`Remove ${li.name} from ${box.boxName}`}
                              className="text-[var(--text-faint)] hover:text-red-500"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--panel-border)]">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-2 pl-4 text-[var(--text-secondary)]">{row.name}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-[var(--text-muted)]">
                    {formatINR(row.mrp)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {onQuantityChange ? (
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => onQuantityChange(row.key, Math.max(1, Number(e.target.value) || 1))}
                        className="w-14 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-xs tabular-nums text-[var(--text-primary)]"
                      />
                    ) : (
                      <span className="tabular-nums text-[var(--text-muted)]">×{row.quantity}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 pl-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
                    {formatINR(row.mrp * row.quantity)}
                  </td>
                  {onRemove && (
                    <td className="py-2 pr-4 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(row.key)}
                        title="Remove from rate card"
                        aria-label={`Remove ${row.name} from rate card`}
                        className="text-[var(--text-faint)] hover:text-red-500"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
