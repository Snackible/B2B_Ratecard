import type { NewItemInput } from "./types";

export function parseNewItemInput(body: Partial<NewItemInput>): NewItemInput | string {
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return "Item name is required";
  }
  if (!body.category || typeof body.category !== "string" || !body.category.trim()) {
    return "Category is required";
  }
  if (typeof body.mrp !== "number" || body.mrp <= 0) {
    return "MRP must be a positive number";
  }
  if (
    body.segment !== "Standard Grammage" &&
    body.segment !== "One Serving Pack" &&
    body.segment !== "Large Grammage"
  ) {
    return "Invalid segment";
  }

  return {
    name: body.name.trim(),
    category: body.category.trim(),
    section: body.section?.trim() || null,
    segment: body.segment,
    grammage: typeof body.grammage === "number" ? body.grammage : null,
    mrp: body.mrp,
    largerPackGrammage: typeof body.largerPackGrammage === "number" ? body.largerPackGrammage : null,
    largerPackMrp: typeof body.largerPackMrp === "number" ? body.largerPackMrp : null,
    shelfLifeDays: typeof body.shelfLifeDays === "number" ? body.shelfLifeDays : null,
  };
}
