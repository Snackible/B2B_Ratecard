export type Segment = "Standard Grammage" | "One Serving Pack";

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

export type RateCardMeta = {
  id: string;
  clientName: string | null;
  showClientName: boolean;
  discountPercent: number;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  imageUrl: string;
};

export type RateCardSnapshot = RateCardMeta & {
  lineItems: RateCardLineItem[];
};

export const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30] as const;
