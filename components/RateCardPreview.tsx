import { forwardRef } from "react";
import type { SelectedRow } from "@/lib/rows";
import { applyDiscount, formatINR } from "@/lib/rows";

type Props = {
  rows: SelectedRow[];
  discountPercent: number;
  showClientName: boolean;
  clientName: string;
  onRemove?: (key: string) => void;
  onQuantityChange?: (key: string, quantity: number) => void;
  /** true for the hidden copy used to render the exported JPEG — always light/branded, regardless of app theme. */
  forceLight?: boolean;
};

const RateCardPreview = forwardRef<HTMLDivElement, Props>(function RateCardPreview(
  { rows, discountPercent, showClientName, clientName, onRemove, onQuantityChange, forceLight },
  ref
) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const subtotal = rows.reduce((sum, row) => sum + row.mrp * row.quantity, 0);
  const discountAmount = subtotal - applyDiscount(subtotal, discountPercent);
  const payableAmount = subtotal - discountAmount;
  const colCount = onRemove ? 8 : 7;

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
            <span className="font-semibold">Prepared for: {clientName.trim()}</span>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
        <div>Date: {today}</div>
      </div>

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
        {rows.length > 0 && (
          <tfoot>
            <tr className={`${footerBg} font-semibold`}>
              <td colSpan={6} className={`border ${cellBorder} px-3 py-2 text-right`}>
                Total
              </td>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>{formatINR(subtotal)}</td>
              {onRemove && <td className={`border ${cellBorder} print:hidden`} />}
            </tr>
            <tr className={`${footerBg} font-semibold`}>
              <td colSpan={5} className={`border ${cellBorder} px-3 py-2 text-right`}>
                Discount
              </td>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>
                {discountPercent > 0 ? `${discountPercent}%` : "—"}
              </td>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>{formatINR(discountAmount)}</td>
              {onRemove && <td className={`border ${cellBorder} print:hidden`} />}
            </tr>
            <tr className={`${footerBg} font-semibold`}>
              <td colSpan={6} className={`border ${cellBorder} px-3 py-2 text-right`}>
                Payable Amount
              </td>
              <td className={`border ${cellBorder} px-3 py-2 text-right`}>{formatINR(payableAmount)}</td>
              {onRemove && <td className={`border ${cellBorder} print:hidden`} />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
});

export default RateCardPreview;
