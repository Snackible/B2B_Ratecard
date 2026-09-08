import ExcelJS from "exceljs";
import type { HamperBoxInstance, OrderType } from "./types";
import type { SelectedRow } from "./rows";
import { applyDiscount } from "./rows";

const BRAND_GREEN = "FF006600";
const HEADER_GREEN = "FF004D00";
const ROW_ALT = "FFF3F4F6";
const FOOTER_BG = "FFE5E7EB";
const WHITE = "FFFFFFFF";

const BULK_COLUMNS = ["Category", "Product Name", "Grammage (g)", "MRP (INR)", "Shelf Life", "Qty", "Total"];
const HAMPER_COLUMNS = ["Box", "Qty", "Product Name", "Grammage (g)", "MRP (INR)", "Item Qty", "Item Total"];

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GREEN } };
    cell.font = { color: { argb: WHITE }, bold: true };
    cell.alignment = { vertical: "middle" };
  });
}

function styleDataRow(row: ExcelJS.Row, alt: boolean) {
  if (alt) {
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT } };
    });
  }
}

function styleFooterRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOOTER_BG } };
    cell.font = { bold: true };
  });
}

export async function buildRateCardExcel({
  orderType,
  rows,
  boxInstances,
  discountPercent,
  transportCostEnabled,
  transportCostAmount,
  clientName,
  showClientName,
}: {
  orderType: OrderType;
  rows: SelectedRow[];
  boxInstances?: HamperBoxInstance[];
  discountPercent: number;
  transportCostEnabled: boolean;
  transportCostAmount: number;
  clientName: string;
  showClientName: boolean;
}): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rate Card");

  const isHamper = orderType === "hamper" && Boolean(boxInstances);
  const columns = isHamper ? HAMPER_COLUMNS : BULK_COLUMNS;
  const colCount = columns.length;

  sheet.mergeCells(1, 1, 1, colCount);
  const brandCell = sheet.getCell(1, 1);
  brandCell.value = "Snackible";
  brandCell.font = { bold: true, size: 16, color: { argb: WHITE } };
  brandCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_GREEN } };
  brandCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 26;

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  sheet.mergeCells(2, 1, 2, colCount - 1);
  const clientCell = sheet.getCell(2, 1);
  clientCell.value = showClientName && clientName.trim() ? `Prepared for: ${clientName.trim()}` : "";
  clientCell.font = { italic: true, color: { argb: "FF444444" } };
  const dateCell = sheet.getCell(2, colCount);
  dateCell.value = `Date: ${today}`;
  dateCell.alignment = { horizontal: "right" };
  dateCell.font = { color: { argb: "FF444444" } };

  sheet.addRow([]);

  const headerRow = sheet.addRow(columns);
  styleHeaderRow(headerRow);

  let itemsSubtotal = 0;
  let boxCostTotal = 0;
  let addOnsTotal = 0;
  let altToggle = false;

  if (isHamper) {
    for (const box of boxInstances!) {
      for (const li of box.lineItems) {
        const total = li.mrp * li.quantity;
        itemsSubtotal += total;
        const row = sheet.addRow([box.boxName, box.quantity, li.name, li.grammage ?? "", li.mrp, li.quantity, total]);
        styleDataRow(row, altToggle);
        altToggle = !altToggle;
      }
      boxCostTotal += box.boxCost;
      const boxCostRow = sheet.addRow([box.boxName, box.quantity, "(box cost)", "", "", "", box.boxCost]);
      styleDataRow(boxCostRow, altToggle);
      altToggle = !altToggle;
      const transportRow = sheet.addRow([box.boxName, box.quantity, "(transport cost)", "", "", "", box.transportCost]);
      styleDataRow(transportRow, altToggle);
      altToggle = !altToggle;
      for (const addOn of box.addOnSelections) {
        addOnsTotal += addOn.total;
        const addOnRow = sheet.addRow([box.boxName, box.quantity, `(${addOn.name})`, "", "", addOn.quantity, addOn.total]);
        styleDataRow(addOnRow, altToggle);
        altToggle = !altToggle;
      }
    }
  } else {
    for (const row of rows) {
      const total = row.mrp * row.quantity;
      itemsSubtotal += total;
      const excelRow = sheet.addRow([row.category, row.name, row.grammage ?? "", row.mrp, row.shelfLifeDays ?? "", row.quantity, total]);
      styleDataRow(excelRow, altToggle);
      altToggle = !altToggle;
    }
  }

  const discountAmount = itemsSubtotal - applyDiscount(itemsSubtotal, discountPercent);
  const transportAmount = transportCostEnabled ? transportCostAmount : 0;
  const payable = itemsSubtotal - discountAmount + boxCostTotal + transportAmount + addOnsTotal;

  sheet.addRow([]);

  function addFooterRow(label: string, value: number) {
    const blanks = new Array(colCount - 2).fill("");
    const row = sheet.addRow([label, ...blanks, value]);
    row.getCell(1).alignment = { horizontal: "right" };
    sheet.mergeCells(row.number, 1, row.number, colCount - 1);
    styleFooterRow(row);
  }

  addFooterRow("Subtotal", itemsSubtotal);
  addFooterRow(`Discount${discountPercent > 0 ? ` (${discountPercent}%)` : ""}`, discountAmount);
  if (isHamper) {
    addFooterRow("Box cost", boxCostTotal);
    addFooterRow("Add-ons", addOnsTotal);
  }
  if (transportCostEnabled) {
    addFooterRow("Transport cost", transportAmount);
  }
  addFooterRow("Payable Amount", payable);

  sheet.getColumn(1).width = isHamper ? 22 : 20;
  sheet.getColumn(2).width = isHamper ? 8 : 30;
  sheet.getColumn(3).width = isHamper ? 30 : 14;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 10;
  sheet.getColumn(7).width = 12;

  // MRP and Total columns get a currency format; the Qty columns stay plain numbers.
  const currencyCols = isHamper ? [5, 7] : [4, 7];
  for (const col of currencyCols) {
    sheet.getColumn(col).numFmt = '"₹"#,##0';
  }

  return workbook.xlsx.writeBuffer();
}

export function downloadExcel(filename: string, buffer: ArrayBuffer) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
