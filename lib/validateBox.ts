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

  return {
    name: body.name.trim(),
    boxTypeId: body.boxTypeId || null,
    cost: body.cost,
    transportCost: body.transportCost,
  };
}
