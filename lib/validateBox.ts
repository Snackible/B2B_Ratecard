import type { NewBoxInput } from "./types";

export function parseNewBoxInput(body: Partial<NewBoxInput>): NewBoxInput | string {
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return "Box name is required";
  }
  if (body.boxTypeId !== null && typeof body.boxTypeId !== "string") {
    return "Invalid box type";
  }
  if (typeof body.cost !== "number" || body.cost < 0) {
    return "Box cost must be a non-negative number";
  }
  if (typeof body.transportCost !== "number" || body.transportCost < 0) {
    return "Transport cost must be a non-negative number";
  }
  if (body.minItems !== null && body.minItems !== undefined && (typeof body.minItems !== "number" || body.minItems < 0)) {
    return "Min items must be a non-negative number";
  }
  if (body.maxItems !== null && body.maxItems !== undefined && (typeof body.maxItems !== "number" || body.maxItems < 0)) {
    return "Max items must be a non-negative number";
  }
  const minItems = typeof body.minItems === "number" ? body.minItems : null;
  const maxItems = typeof body.maxItems === "number" ? body.maxItems : null;
  if (minItems !== null && maxItems !== null && minItems > maxItems) {
    return "Min items can't be greater than max items";
  }

  return {
    name: body.name.trim(),
    boxTypeId: body.boxTypeId || null,
    cost: body.cost,
    transportCost: body.transportCost,
    minItems,
    maxItems,
  };
}
