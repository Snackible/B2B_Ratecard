import ExcelJS from "exceljs";
import type { HamperBoxInstance, Item, OrderType } from "./types";
import type { SelectedRow } from "./rows";
import { applyDiscount } from "./rows";

// Labour isn't broken out anywhere in the COGS sheet — given directly as a flat 3% of
// the total cost price (ingredient COGS), not of MRP/selling price. Only applied where
// ingredient COGS is known, so an uncosted item never shows a misleading partial cost.
export const LABOUR_COST_PERCENT = 3;

export type CogsLineItem = {
  itemId: string;
  groupLabel: string | null;
  category: string;
  name: string;
  packLabel: string;
  quantity: number;
  mrp: number;
  sellingTotal: number;
  cogsPerUnit: number | null;
  cogsTotal: number | null;
  labourCost: number | null;
  marginTotal: number | null;
  marginPercent: number | null;
};

export type CogsAnalysis = {
  lineItems: CogsLineItem[];
  costedSellingTotal: number;
  costedCogsTotal: number;
  costedLabourTotal: number;
  costedMarginTotal: number;
  costedMarginPercent: number;
  uncostedSellingTotal: number;
  costedItemCount: number;
  uncostedItemCount: number;
};

function buildLineItem(
  itemId: string,
  groupLabel: string | null,
  category: string,
  name: string,
  packLabel: string,
  quantity: number,
  mrp: number,
  discountPercent: number,
  cogsPerUnit: number | null
): CogsLineItem {
  const sellingTotal = applyDiscount(mrp, discountPercent) * quantity;
  const cogsTotal = cogsPerUnit != null ? cogsPerUnit * quantity : null;
  const labourCost = cogsTotal != null ? (cogsTotal * LABOUR_COST_PERCENT) / 100 : null;
  const marginTotal = cogsTotal != null && labourCost != null ? sellingTotal - cogsTotal - labourCost : null;
  const marginPercent = marginTotal != null && sellingTotal > 0 ? (marginTotal / sellingTotal) * 100 : null;
  return {
    itemId,
    groupLabel,
    category,
    name,
    packLabel,
    quantity,
    mrp,
    sellingTotal,
    cogsPerUnit,
    cogsTotal,
    labourCost,
    marginTotal,
    marginPercent,
  };
}

// Margin is computed against the actual rate-card selling price (after this quote's
// discount), not the catalog MRP or any static reference price — this answers "what do
// we actually make on this quote," not a fixed number that ignores negotiated pricing.
// Box/transport/add-on costs are intentionally excluded (items-only margin); items with
// no COGS entered yet are listed but left out of the totals rather than assumed to be free.
export function computeCogsAnalysis({
  items,
  orderType,
  rows,
  boxInstances,
  discountPercent,
}: {
  items: Item[];
  orderType: OrderType;
  rows: SelectedRow[];
  boxInstances?: HamperBoxInstance[];
  discountPercent: number;
}): CogsAnalysis {
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const lineItems: CogsLineItem[] = [];

  if (orderType === "hamper" && boxInstances) {
    for (const box of boxInstances) {
      for (const li of box.lineItems) {
        const item = itemsById.get(li.itemId);
        lineItems.push(
          buildLineItem(
            li.itemId,
            box.boxName,
            li.category,
            li.name,
            li.packLabel,
            li.quantity,
            li.mrp,
            discountPercent,
            item?.cogsCost ?? null
          )
        );
      }
    }
  } else {
    for (const row of rows) {
      const item = itemsById.get(row.itemId);
      const isLarger = row.key.endsWith(":larger");
      const cogsPerUnit = item ? (isLarger ? item.largerPackCogsCost : item.cogsCost) : null;
      lineItems.push(
        buildLineItem(row.itemId, null, row.category, row.name, row.packLabel, row.quantity, row.mrp, discountPercent, cogsPerUnit)
      );
    }
  }

  let costedSellingTotal = 0;
  let costedCogsTotal = 0;
  let costedLabourTotal = 0;
  let uncostedSellingTotal = 0;
  let costedItemCount = 0;
  let uncostedItemCount = 0;

  for (const li of lineItems) {
    if (li.cogsTotal != null && li.labourCost != null) {
      costedSellingTotal += li.sellingTotal;
      costedCogsTotal += li.cogsTotal;
      costedLabourTotal += li.labourCost;
      costedItemCount++;
    } else {
      uncostedSellingTotal += li.sellingTotal;
      uncostedItemCount++;
    }
  }

  const costedMarginTotal = costedSellingTotal - costedCogsTotal - costedLabourTotal;
  const costedMarginPercent = costedSellingTotal > 0 ? (costedMarginTotal / costedSellingTotal) * 100 : 0;

  return {
    lineItems,
    costedSellingTotal,
    costedCogsTotal,
    costedLabourTotal,
    costedMarginTotal,
    costedMarginPercent,
    uncostedSellingTotal,
    costedItemCount,
    uncostedItemCount,
  };
}

function escapeCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function buildCogsAnalysisCsv(analysis: CogsAnalysis, isHamper: boolean): string {
  const out: (string | number)[][] = [];
  const header = isHamper
    ? ["Box", "Category", "Product Name", "Qty", "Selling Price (post-discount)", "COGS/unit", "COGS Total", `Labour (${LABOUR_COST_PERCENT}%)`, "Margin", "Margin %"]
    : ["Category", "Product Name", "Pack", "Qty", "Selling Price (post-discount)", "COGS/unit", "COGS Total", `Labour (${LABOUR_COST_PERCENT}%)`, "Margin", "Margin %"];
  out.push(header);

  for (const li of analysis.lineItems) {
    const row: (string | number)[] = isHamper
      ? [li.groupLabel ?? "", li.category, li.name, li.quantity, li.sellingTotal.toFixed(2)]
      : [li.category, li.name, li.packLabel, li.quantity, li.sellingTotal.toFixed(2)];
    row.push(
      li.cogsPerUnit != null ? li.cogsPerUnit.toFixed(2) : "No cost data",
      li.cogsTotal != null ? li.cogsTotal.toFixed(2) : "",
      li.labourCost != null ? li.labourCost.toFixed(2) : "",
      li.marginTotal != null ? li.marginTotal.toFixed(2) : "",
      li.marginPercent != null ? `${li.marginPercent.toFixed(1)}%` : ""
    );
    out.push(row);
  }

  out.push([]);
  out.push(["Costed selling total", analysis.costedSellingTotal.toFixed(2)]);
  out.push(["Costed COGS total", analysis.costedCogsTotal.toFixed(2)]);
  out.push([`Labour total (${LABOUR_COST_PERCENT}%)`, analysis.costedLabourTotal.toFixed(2)]);
  out.push(["Costed margin", analysis.costedMarginTotal.toFixed(2)]);
  out.push(["Blended margin %", `${analysis.costedMarginPercent.toFixed(1)}%`]);
  if (analysis.uncostedItemCount > 0) {
    out.push([`${analysis.uncostedItemCount} item(s) with no COGS data — excluded from totals`]);
  }

  return toCsv(out);
}

const HEADER_GREEN = "FF004D00";
const ROW_ALT = "FFF3F4F6";
const FOOTER_BG = "FFE5E7EB";
const WARN_BG = "FFFFF3CD";
const WHITE = "FFFFFFFF";

export async function buildCogsAnalysisExcel(analysis: CogsAnalysis, isHamper: boolean): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("COGS Analysis");

  const columns = isHamper
    ? ["Box", "Category", "Product Name", "Qty", "Selling (post-discount)", "COGS/unit", "COGS Total", `Labour (${LABOUR_COST_PERCENT}%)`, "Margin", "Margin %"]
    : ["Category", "Product Name", "Pack", "Qty", "Selling (post-discount)", "COGS/unit", "COGS Total", `Labour (${LABOUR_COST_PERCENT}%)`, "Margin", "Margin %"];
  const colCount = columns.length;

  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "COGS Analysis";
  titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A1F1F" } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 24;
  sheet.addRow([]);

  const headerRow = sheet.addRow(columns);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GREEN } };
    cell.font = { color: { argb: WHITE }, bold: true };
  });

  let altToggle = false;
  for (const li of analysis.lineItems) {
    const rowValues = isHamper
      ? [li.groupLabel ?? "", li.category, li.name, li.quantity, li.sellingTotal]
      : [li.category, li.name, li.packLabel, li.quantity, li.sellingTotal];
    rowValues.push(
      li.cogsPerUnit ?? ("No cost data" as unknown as number),
      li.cogsTotal ?? "",
      li.labourCost ?? "",
      li.marginTotal ?? "",
      li.marginPercent != null ? `${li.marginPercent.toFixed(1)}%` : ""
    );
    const row = sheet.addRow(rowValues);
    if (li.cogsTotal == null) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARN_BG } };
      });
    } else if (altToggle) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT } };
      });
    }
    altToggle = !altToggle;
  }

  sheet.addRow([]);
  function addFooterRow(label: string, value: string) {
    const blanks = new Array(colCount - 2).fill("");
    const row = sheet.addRow([label, ...blanks, value]);
    sheet.mergeCells(row.number, 1, row.number, colCount - 1);
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOOTER_BG } };
      cell.font = { bold: true };
    });
  }
  addFooterRow("Costed selling total", analysis.costedSellingTotal.toFixed(2));
  addFooterRow("Costed COGS total", analysis.costedCogsTotal.toFixed(2));
  addFooterRow(`Labour total (${LABOUR_COST_PERCENT}%)`, analysis.costedLabourTotal.toFixed(2));
  addFooterRow("Costed margin", analysis.costedMarginTotal.toFixed(2));
  addFooterRow("Blended margin %", `${analysis.costedMarginPercent.toFixed(1)}%`);
  if (analysis.uncostedItemCount > 0) {
    addFooterRow("Items with no COGS data (excluded)", String(analysis.uncostedItemCount));
  }

  sheet.getColumn(1).width = isHamper ? 20 : 18;
  sheet.getColumn(2).width = isHamper ? 16 : 30;
  sheet.getColumn(3).width = isHamper ? 30 : 14;
  sheet.getColumn(4).width = 8;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 12;
  sheet.getColumn(8).width = 12;
  sheet.getColumn(9).width = 12;
  sheet.getColumn(10).width = 10;

  for (const col of [5, 7, 8, 9]) {
    sheet.getColumn(col).numFmt = '"₹"#,##0.00';
  }

  return workbook.xlsx.writeBuffer();
}
