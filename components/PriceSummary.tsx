"use client";

import type { SelectedRow } from "@/lib/rows";
import { formatINR } from "@/lib/rows";
import { computePricing } from "@/lib/pricing";
import type { HamperBoxInstance } from "@/lib/types";
import DiscountPicker from "./DiscountPicker";

type Props = {
  rows: SelectedRow[];
  boxInstances?: HamperBoxInstance[];
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  transportCostEnabled?: boolean;
  transportCostAmount?: number;
};

export default function PriceSummary({
  rows,
  boxInstances,
  discountPercent,
  onDiscountChange,
  transportCostEnabled,
  transportCostAmount,
}: Props) {
  const { subtotal, discountAmount, boxCostTotal, transportAmount, addOnTotalsByName, payableAmount } =
    computePricing({ rows, boxInstances, discountPercent, transportCostEnabled, transportCostAmount });
  const hasBoxes = Boolean(boxInstances && boxInstances.length > 0);

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
                        <td className="py-1 px-2 text-right tabular-nums text-[var(--text-muted)]">×{li.quantity}</td>
                        <td className="py-1 pl-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
                          {formatINR(li.mrp * li.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-[var(--text-faint)] italic">No items in this box yet.</p>
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
                  <td className="py-2 px-2 text-right tabular-nums text-[var(--text-muted)]">×{row.quantity}</td>
                  <td className="py-2 pr-4 pl-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
                    {formatINR(row.mrp * row.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      <div className="divide-y divide-[var(--panel-border)] border-t border-[var(--panel-border)] text-sm">
        <SummaryRow label="Subtotal" value={formatINR(subtotal)} />
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
