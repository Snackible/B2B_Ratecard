export type Segment = "Standard Grammage" | "One Serving Pack" | "Large Grammage";

export type OrderType = "bulk" | "hamper";

export type Item = {
  id: string;
  segment: Segment;
  section: string | null;
  category: string;
  name: string;
  grammage: number | null;
  mrp: number;
  largerPackGrammage: number | null;
  largerPackMrp: number | null;
  shelfLifeDays: number | null;
};

export type NewItemInput = Omit<Item, "id">;

export type RateCardLineItem = {
  itemId: string;
  name: string;
  category: string;
  packLabel: string;
  grammage: number | null;
  shelfLifeDays: number | null;
  mrp: number;
  quantity: number;
};

export type BoxType = {
  id: string;
  name: string;
};

export type Box = {
  id: string;
  boxTypeId: string | null;
  name: string;
  cost: number;
  transportCost: number;
  itemIds: string[];
};

export type HamperConfig = {
  boxTypes: BoxType[];
  boxes: Box[];
};

export type NewBoxTypeInput = Omit<BoxType, "id">;
export type NewBoxInput = Omit<Box, "id">;

export type HamperBoxInstance = {
  key: string;
  boxId: string;
  boxTypeName: string;
  boxName: string;
  boxCost: number;
  transportCost: number;
  lineItems: RateCardLineItem[];
};

export type AppSettings = {
  transportCost: number;
  diyaPackCost: number;
};

export type RateCardMeta = {
  id: string;
  orderType: OrderType;
  clientName: string | null;
  showClientName: boolean;
  discountPercent: number;
  transportCostEnabled: boolean;
  transportCostAmount: number;
  boxCostTotal: number;
  diyaEnabled: boolean;
  diyaQuantity: number;
  diyaCostTotal: number;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  imageUrl: string;
};

export type RateCardSnapshot = RateCardMeta & {
  lineItems: RateCardLineItem[];
  boxInstances?: HamperBoxInstance[];
};

export const DISCOUNT_OPTIONS = [10, 12, 15, 18, 20, 22] as const;
