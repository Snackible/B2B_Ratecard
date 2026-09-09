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
    <div className="divide-y divide-[var(--panel-border)] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] text-sm shadow-sm">
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
