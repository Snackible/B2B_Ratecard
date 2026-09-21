import { Fragment, forwardRef } from "react";
import type { OrderType } from "@/lib/types";
import type { CogsAnalysis } from "@/lib/cogsAnalysis";
import { LABOUR_COST_PERCENT } from "@/lib/cogsAnalysis";
import { formatINR } from "@/lib/rows";

type Props = {
  analysis: CogsAnalysis;
  orderType: OrderType;
  /** true for the hidden copy used to render the exported JPEG — always light, regardless of app theme. */
  forceLight?: boolean;
};

// Deliberately styled distinctly from RateCardPreview (no Snackible branding, a dark-red
// banner instead of the client-facing green) so it's never mistaken for something that
// goes to a client, and never shares its save/export pipeline.
const CogsAnalysisCard = forwardRef<HTMLDivElement, Props>(function CogsAnalysisCard(
  { analysis, orderType, forceLight },
  ref
) {
  const isHamper = orderType === "hamper";
  const cardBg = forceLight ? "bg-white" : "bg-[var(--panel-bg)]";
  const cardText = forceLight ? "text-[#171717]" : "text-[var(--text-primary)]";
  const metaText = forceLight ? "text-gray-700" : "text-[var(--text-secondary)]";
  const cellBorder = forceLight ? "border-gray-200" : "border-[var(--panel-border)]";
  const rowAlt = forceLight ? "bg-gray-50" : "bg-white/[0.035]";
  const warnBg = forceLight ? "bg-amber-50" : "bg-amber-500/10";
  const footerBg = forceLight ? "bg-gray-100" : "bg-[var(--input-bg)]";
  const groupBg = forceLight ? "bg-gray-100" : "bg-[var(--input-bg)]";

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const colCount = isHamper ? 9 : 8;

  let currentGroup: string | null | undefined;

  return (
    <div ref={ref} className={`w-full ${cardBg} ${cardText}`} style={{ colorScheme: forceLight ? "light" : undefined }}>
      <div className="bg-[#7a1f1f] px-6 py-4 text-white">
        <div className="text-xl font-bold tracking-wide">COGS Analysis</div>
      </div>

      <div className={`flex items-center justify-between px-6 py-3 text-sm ${metaText}`}>
        <span>Margin computed against this quote&apos;s actual (post-discount) selling price</span>
        <span>Date: {today}</span>
      </div>

      <div className="overflow-x-auto px-6 pb-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={`border-b ${cellBorder} text-left ${metaText}`}>
              {isHamper && <th className="py-2 pr-2 font-medium">Box</th>}
              <th className="py-2 pr-2 font-medium">Product</th>
              <th className="py-2 pr-2 text-right font-medium">Qty</th>
              <th className="py-2 pr-2 text-right font-medium">Selling</th>
              <th className="py-2 pr-2 text-right font-medium">COGS</th>
              <th className="py-2 pr-2 text-right font-medium">Labour ({LABOUR_COST_PERCENT}%)</th>
              <th className="py-2 pr-2 text-right font-medium">Margin</th>
              <th className="py-2 pr-2 text-right font-medium">Margin %</th>
              {!isHamper && <th className="py-2 pr-0 text-right font-medium">Pack</th>}
            </tr>
          </thead>
          <tbody>
            {analysis.lineItems.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={`py-6 text-center ${forceLight ? "text-gray-400" : "text-[var(--text-faint)]"}`}>
                  No items yet.
                </td>
              </tr>
            ) : (
              analysis.lineItems.map((li, i) => {
                const showGroupHeader = isHamper && li.groupLabel !== currentGroup;
                currentGroup = li.groupLabel;
                const uncosted = li.cogsTotal == null;
                return (
                  <Fragment key={`${li.itemId}-${i}`}>
                    {showGroupHeader && (
                      <tr key={`group-${li.groupLabel}-${i}`} className={groupBg}>
                        <td colSpan={colCount} className={`px-2 py-1.5 text-xs font-semibold ${metaText}`}>
                          {li.groupLabel}
                        </td>
                      </tr>
                    )}
                    <tr className={`border-b ${cellBorder} ${uncosted ? warnBg : i % 2 === 1 ? rowAlt : ""}`}>
                      {isHamper && <td className="py-1.5 pr-2"></td>}
                      <td className="py-1.5 pr-2">
                        <div>{li.name}</div>
                        <div className={`text-xs ${metaText}`}>{li.category}</div>
                      </td>
                      <td className="py-1.5 pr-2 text-right">{li.quantity}</td>
                      <td className="py-1.5 pr-2 text-right">{formatINR(li.sellingTotal)}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {li.cogsTotal != null ? formatINR(li.cogsTotal) : <span className="text-amber-600">No cost data</span>}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{li.labourCost != null ? formatINR(li.labourCost) : "—"}</td>
                      <td className="py-1.5 pr-2 text-right">{li.marginTotal != null ? formatINR(li.marginTotal) : "—"}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {li.marginPercent != null ? `${li.marginPercent.toFixed(1)}%` : "—"}
                      </td>
                      {!isHamper && <td className="py-1.5 pr-0 text-right text-xs">{li.packLabel}</td>}
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={`mx-6 mb-6 rounded-lg ${footerBg} p-4 text-sm`}>
        <Row label="Costed selling total" value={formatINR(analysis.costedSellingTotal)} />
        <Row label="Costed COGS total" value={formatINR(analysis.costedCogsTotal)} />
        <Row label={`Labour total (${LABOUR_COST_PERCENT}%)`} value={formatINR(analysis.costedLabourTotal)} />
        <Row label="Costed margin" value={formatINR(analysis.costedMarginTotal)} bold />
        <Row label="Blended margin %" value={`${analysis.costedMarginPercent.toFixed(1)}%`} bold />
        {analysis.uncostedItemCount > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            {analysis.uncostedItemCount} item{analysis.uncostedItemCount === 1 ? "" : "s"} missing COGS data —
            excluded from the totals above ({formatINR(analysis.uncostedSellingTotal)} in selling value not accounted for).
          </p>
        )}
        {isHamper && (
          <p className={`mt-2 text-xs ${metaText}`}>Box, transport and add-on costs are not included in this margin yet.</p>
        )}
      </div>
    </div>
  );
});

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default CogsAnalysisCard;
