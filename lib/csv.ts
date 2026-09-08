import type { HamperBoxInstance, OrderType } from "./types";
import type { SelectedRow } from "./rows";
import { applyDiscount } from "./rows";

function escapeCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function buildRateCardCsv({
  orderType,
  rows,
  boxInstances,
  discountPercent,
  transportCostEnabled,
  transportCostAmount,
}: {
  orderType: OrderType;
  rows: SelectedRow[];
  boxInstances?: HamperBoxInstance[];
  discountPercent: number;
  transportCostEnabled: boolean;
  transportCostAmount: number;
}): string {
  const out: (string | number)[][] = [];

  if (orderType === "hamper" && boxInstances) {
    out.push(["Box", "Qty", "Product Name", "Grammage (g)", "MRP (INR)", "Item Qty", "Item Total"]);
    for (const box of boxInstances) {
      for (const li of box.lineItems) {
        out.push([box.boxName, box.quantity, li.name, li.grammage ?? "", li.mrp, li.quantity, li.mrp * li.quantity]);
      }
      out.push([box.boxName, box.quantity, "(box cost)", "", "", "", box.boxCost]);
      out.push([box.boxName, box.quantity, "(transport cost)", "", "", "", box.transportCost]);
      for (const addOn of box.addOnSelections) {
        out.push([box.boxName, box.quantity, `(${addOn.name})`, "", "", addOn.quantity, addOn.total]);
      }
    }
  } else {
    out.push(["Category", "Product Name", "Grammage (g)", "MRP (INR)", "Shelf Life", "Qty", "Total"]);
    for (const row of rows) {
      out.push([row.category, row.name, row.grammage ?? "", row.mrp, row.shelfLifeDays ?? "", row.quantity, row.mrp * row.quantity]);
    }
  }

  const itemsSubtotal = orderType === "hamper" && boxInstances
    ? boxInstances.reduce((sum, box) => sum + box.lineItems.reduce((s, li) => s + li.mrp * li.quantity, 0), 0)
    : rows.reduce((sum, row) => sum + row.mrp * row.quantity, 0);
  const boxCostTotal = orderType === "hamper" && boxInstances ? boxInstances.reduce((s, b) => s + b.boxCost, 0) : 0;
  const discountAmount = itemsSubtotal - applyDiscount(itemsSubtotal, discountPercent);
  const transportAmount = transportCostEnabled ? transportCostAmount : 0;
  const addOnsTotal =
    orderType === "hamper" && boxInstances
      ? boxInstances.reduce((sum, box) => sum + box.addOnSelections.reduce((s, a) => s + a.total, 0), 0)
      : 0;
  const payable = itemsSubtotal - discountAmount + boxCostTotal + transportAmount + addOnsTotal;

  out.push([]);
  out.push(["Subtotal", "", "", "", "", "", itemsSubtotal]);
  out.push([
    `Discount${discountPercent > 0 ? ` (${discountPercent}%)` : ""}`,
    "",
    "",
    "",
    "",
    "",
    discountAmount > 0 ? -discountAmount : 0,
  ]);
  if (orderType === "hamper") {
    out.push(["Box cost", "", "", "", "", "", boxCostTotal]);
    out.push(["Add-ons", "", "", "", "", "", addOnsTotal]);
  }
  if (transportCostEnabled) {
    out.push(["Transport cost", "", "", "", "", "", transportAmount]);
  }
  out.push(["Payable Amount", "", "", "", "", "", payable]);

  return toCsv(out);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
