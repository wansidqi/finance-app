export interface AssetInterface {
  id: number;
  user_id: number;
  category: AssetCategory;
  name: string;
  quantity: number | null;
  price: number | null;
  unit: string;
  goal: number;
  status: "ACTIVE" | "INACTIVE" | string;
  created_at: string;
  updated_at: string | null;
}

export interface BaseAsset {
  id: number;
  category: AssetCategory;
  name: string;
  quantity: number | null;
  price: number | null;
  unit: string;
  goal: number;
}

export type AssetCategory = "CASH" | "GOLD" | "STOCK" | "CRYPTO";

// Helper type to determine which mode is being used
export type AssetValueMode = 'quantity' | 'price';
