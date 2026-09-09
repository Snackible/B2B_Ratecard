import { forwardRef } from "react";
import type { SelectedRow } from "@/lib/rows";
import { formatINR } from "@/lib/rows";
import { computePricing } from "@/lib/pricing";
import type { HamperBoxInstance } from "@/lib/types";
import DiscountPicker from "./DiscountPicker";

type Props = {
  rows: SelectedRow[];
  discountPercent: number;
  onDiscountChange?: (percent: number) => void;
  showClientName: boolean;
  clientName: string;
  onRemove?: (key: string) => void;
  onQuantityChange?: (key: string, quantity: number) => void;
  /** true for the hidden copy used to render the exported JPEG — always light/branded, regardless of app theme. */
  forceLight?: boolean;
  /** Hamper orders group priced rows under each box instance instead of one flat table. Each
   *  box carries its own add-on selections (Diya, Personalised Card, etc.). */
  boxInstances?: HamperBoxInstance[];
  transportCostEnabled?: boolean;
  transportCostAmount?: number;
};

const RateCardPreview = forwardRef<HTMLDivElement, Props>(function RateCardPreview(
  {
    rows,
    discountPercent,
    onDiscountChange,
    showClientName,
    clientName,
    onRemove,
    onQuantityChange,
    forceLight,
    boxInstances,
    transportCostEnabled,
    transportCostAmount,
  },
  ref
) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const { subtotal, discountAmount, boxCostTotal, transportAmount, addOnTotalsByName, payableAmount } =
    computePricing({ rows, boxInstances, discountPercent, transportCostEnabled, transportCostAmount });
  const colCount = onRemove ? 8 : 7;
  const hasBoxes = Boolean(boxInstances && boxInstances.length > 0);

  const cardBg = forceLight ? "bg-white" : "bg-[var(--panel-bg)]";
  const cardText = forceLight ? "text-[#171717]" : "text-[var(--text-primary)]";
  const metaText = forceLight ? "text-gray-700" : "text-[var(--text-secondary)]";
  const cellBorder = forceLight ? "border-gray-200" : "border-[var(--panel-border)]";
  const rowAlt = forceLight ? "bg-gray-50" : "bg-[var(--input-bg)]";
  const footerBg = forceLight ? "bg-gray-100" : "bg-[var(--input-bg)]";
  const emptyText = forceLight ? "text-gray-400" : "text-[var(--text-faint)]";
  const inputCls = forceLight
    ? "w-14 rounded border border-gray-300 px-1 py-0.5 text-right text-sm"
    : "w-14 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-1 py-0.5 text-right text-sm text-[var(--text-primary)]";

  return (
    <div
      ref={ref}
      className={`w-full ${cardBg} ${cardText}`}
      style={{ colorScheme: forceLight ? "light" : undefined }}
    >
      <div className="bg-[#006600] px-6 py-4 text-white">
        <div className="text-xl font-bold tracking-wide">Snackible</div>
      </div>

      <div className={`flex items-center justify-between px-6 py-3 text-sm ${metaText}`}>
        <div>
          {showClientName && clientName.trim() ? (
            <span className="font-semibold">Client: {clientName.trim()}</span>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
        <div>Date: {today}</div>
      </div>

      {hasBoxes ? (
        <div className="space-y-4 px-6 py-4">
          {boxInstances!.map((box) => (
            <div key={box.key}>
              <div className={`mb-1 flex items-center justify-between text-sm font-semibold ${cardText}`}>
                <span>
                  {box.boxTypeName ? `${box.boxTypeName} — ` : ""}
                  {box.boxName}
                </span>
                <span className="tabular-nums font-normal">
                  {box.quantity > 1 ? `${box.quantity}× · ` : ""}
                  {formatINR(box.boxCost)} box &middot; {formatINR(box.transportCost)} transport
                  {box.addOnSelections.length > 0 &&
                    ` · ${box.addOnSelections.map((a) => `${a.name} ×${a.quantity}`).join(", ")}`}
                </span>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#006600] text-white">
                    <th className="border border-[#004d00] px-3 py-2 text-left">Product Name</th>
                    <th className="border border-[#004d00] px-3 py-2 text-right">Grammage (g)</th>
                    <th className="border border-[#004d00] px-3 py-2 text-right">MRP (INR)</th>
                    <th className="border border-[#004d00] px-3 py-2 text-right">Qty</th>
                    <th className="border border-[#004d00] px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {box.lineItems.map((li, i) => (
                    <tr key={li.itemId} className={i % 2 === 0 ? cardBg : rowAlt}>
                      <td className={`border ${cellBorder} px-3 py-1.5`}>{li.name}</td>
                      <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>{li.grammage ?? "—"}</td>
                      <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>{li.mrp}</td>
                      <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>{li.quantity}</td>
                      <td className={`border ${cellBorder} px-3 py-1.5 text-right font-semibold`}>
                        {li.mrp * li.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#006600] text-white">
              <th className="border border-[#004d00] px-3 py-2 text-left">Category</th>
              <th className="border border-[#004d00] px-3 py-2 text-left">Product Name</th>
              <th className="border border-[#004d00] px-3 py-2 text-right">Grammage (g)</th>
              <th className="border border-[#004d00] px-3 py-2 text-right">MRP (INR)</th>
              <th className="border border-[#004d00] px-3 py-2 text-right">Shelf Life</th>
              <th className="border border-[#004d00] px-3 py-2 text-right">Qty</th>
              <th className="border border-[#004d00] px-3 py-2 text-right">Total</th>
              {onRemove && <th className="border border-[#004d00] px-2 py-2 print:hidden" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={`border ${cellBorder} px-3 py-6 text-center ${emptyText}`}>
                  No items selected yet — pick items from the catalog on the left.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? cardBg : rowAlt}>
                  <td className={`border ${cellBorder} px-3 py-1.5`}>{row.category}</td>
                  <td className={`border ${cellBorder} px-3 py-1.5`}>{row.name}</td>
                  <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>{row.grammage ?? "—"}</td>
                  <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>{row.mrp}</td>
                  <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>{row.shelfLifeDays ?? "—"}</td>
                  <td className={`border ${cellBorder} px-3 py-1.5 text-right`}>
                    {onQuantityChange ? (
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => onQuantityChange(row.key, Math.max(1, Number(e.target.value) || 1))}
                        className={inputCls}
                      />
                    ) : (
                      row.quantity
                    )}
                  </td>
                  <td className={`border ${cellBorder} px-3 py-1.5 text-right font-semibold`}>
                    {row.mrp * row.quantity}
                  </td>
                  {onRemove && (
                    <td className={`border ${cellBorder} px-2 py-1.5 text-center print:hidden`}>
                      <button
                        type="button"
                        onClick={() => onRemove(row.key)}
                        className="text-xs text-red-500 hover:text-red-700"
                        aria-label={`Remove ${row.name}`}
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {(rows.length > 0 || hasBoxes) && (
        <table className="w-full border-collapse text-sm">
          <tfoot>
            <tr className={`${footerBg} font-semibold`}>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>Subtotal</td>
              <td className={`border ${cellBorder} w-32 px-3 py-2 text-right`}>{formatINR(subtotal)}</td>
            </tr>
            <tr className={`${footerBg} font-semibold`}>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>
                {onDiscountChange ? (
                  <div className="flex justify-end">
                    <DiscountPicker value={discountPercent} onChange={onDiscountChange} hideLabel />
                  </div>
                ) : (
                  <>Discount {discountPercent > 0 ? `(${discountPercent}%)` : ""}</>
                )}
              </td>
              <td className={`border ${cellBorder} w-32 px-3 py-2 text-right`}>
                {formatINR(discountAmount > 0 ? -discountAmount : 0)}
              </td>
            </tr>
            {hasBoxes && (
              <tr className={`${footerBg} font-semibold`}>
                <td className={`border ${cellBorder} px-3 py-2 text-right`}>Box cost</td>
                <td className={`border ${cellBorder} w-32 px-3 py-2 text-right`}>{formatINR(boxCostTotal)}</td>
              </tr>
            )}
            {transportCostEnabled && (
              <tr className={`${footerBg} font-semibold`}>
                <td className={`border ${cellBorder} px-3 py-2 text-right`}>Transport cost</td>
                <td className={`border ${cellBorder} w-32 px-3 py-2 text-right`}>{formatINR(transportAmount)}</td>
              </tr>
            )}
            {[...addOnTotalsByName.entries()].map(([name, a]) => (
              <tr key={name} className={`${footerBg} font-semibold`}>
                <td className={`border ${cellBorder} px-3 py-2 text-right`}>
                  {name} ({a.quantity})
                </td>
                <td className={`border ${cellBorder} w-32 px-3 py-2 text-right`}>{formatINR(a.total)}</td>
              </tr>
            ))}
            <tr className={`${footerBg} font-semibold`}>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>Payable Amount</td>
              <td className={`border ${cellBorder} w-32 px-3 py-2 text-right`}>{formatINR(payableAmount)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
});

export default RateCardPreview;
