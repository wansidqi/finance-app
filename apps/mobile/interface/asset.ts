export interface AssetInterface {
  id: number;
  user_id: number;
  platform: string | null;
  category: AssetCategory;
  name: string;
  quantity: number | null;
  price: number | null;
  unit: string;
  goal: number | null;
  cost_basis: number | null;
  note: string | null;
  is_calculate: boolean;
  status: "ACTIVE" | "INACTIVE" | string;
  created_at: string;
  updated_at: string | null;
}

export interface BaseAsset {
  id: number;
  platform: string | null;
  category: AssetCategory;
  name: string;
  quantity: number | null;
  price: number | null;
  unit: string;
  goal: number | null;
  cost_basis: number | null;
  note: string | null;
  is_calculate: boolean;
}

export type AssetCategory = "CASH" | "GOLD" | "STOCK" | "CRYPTO";
