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
  const isHamper = orderType === "hamper" && Boolean(boxInstances);
  const columnCount = isHamper ? 9 : 8;

  function footerRow(label: string, value: number): (string | number)[] {
    return [label, ...new Array(columnCount - 2).fill(""), value];
  }

  if (isHamper && boxInstances) {
    out.push(["S.No", "Box", "Qty", "Category", "Product Name", "Grammage (g)", "MRP (INR)", "Item Qty", "Item Total"]);
    for (const box of boxInstances) {
      box.lineItems.forEach((li, i) => {
        out.push([
          i + 1,
          box.boxName,
          box.quantity,
          li.category,
          li.name,
          li.grammage ?? "",
          li.mrp,
          li.quantity,
          li.mrp * li.quantity,
        ]);
      });
      if (box.addOnSelections.length > 0) {
        for (const addOn of box.addOnSelections) {
          out.push(["", box.boxName, box.quantity, "", `Add-on: ${addOn.name}`, "", "", addOn.quantity, addOn.total]);
        }
      } else {
        out.push(["", box.boxName, box.quantity, "", "No add-ons", "", "", "", ""]);
      }
    }
  } else {
    out.push(["S.No", "Category", "Product Name", "Grammage (g)", "MRP (INR)", "Shelf Life", "Qty", "Total"]);
    rows.forEach((row, i) => {
      out.push([
        i + 1,
        row.category,
        row.name,
        row.grammage ?? "",
        row.mrp,
        row.shelfLifeDays ?? "",
        row.quantity,
        row.mrp * row.quantity,
      ]);
    });
  }

  const itemsSubtotal = isHamper && boxInstances
    ? boxInstances.reduce((sum, box) => sum + box.lineItems.reduce((s, li) => s + li.mrp * li.quantity, 0), 0)
    : rows.reduce((sum, row) => sum + row.mrp * row.quantity, 0);
  const boxCostTotal = isHamper && boxInstances ? boxInstances.reduce((s, b) => s + b.boxCost, 0) : 0;
  const discountAmount = itemsSubtotal - applyDiscount(itemsSubtotal, discountPercent);
  const transportAmount = transportCostEnabled ? transportCostAmount : 0;
  const addOnTotalsByName = new Map<string, { quantity: number; total: number }>();
  if (isHamper && boxInstances) {
    for (const box of boxInstances) {
      for (const addOn of box.addOnSelections) {
        const existing = addOnTotalsByName.get(addOn.name) ?? { quantity: 0, total: 0 };
        addOnTotalsByName.set(addOn.name, {
          quantity: existing.quantity + addOn.quantity,
          total: existing.total + addOn.total,
        });
      }
    }
  }
  const addOnsTotal = [...addOnTotalsByName.values()].reduce((sum, a) => sum + a.total, 0);
  const payable = itemsSubtotal - discountAmount + boxCostTotal + transportAmount + addOnsTotal;

  out.push([]);
  out.push(footerRow("Subtotal", itemsSubtotal));
  out.push(
    footerRow(
      `Discount${discountPercent > 0 ? ` (${discountPercent}%)` : ""}`,
      discountAmount > 0 ? -discountAmount : 0
    )
  );
  if (isHamper) {
    out.push(footerRow("Box cost", boxCostTotal));
  }
  if (transportCostEnabled) {
    out.push(footerRow("Transport cost", transportAmount));
  }
  for (const [name, a] of addOnTotalsByName) {
    out.push(footerRow(`${name} (${a.quantity})`, a.total));
  }
  out.push(footerRow("Payable Amount", payable));

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
