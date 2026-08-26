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
  // When set, this asset is its platform's catch-all balance: the
  // backend derives `price` as platform_total minus the sum of the
  // other entries sharing the same category+platform.
  platform_total: number | null;
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
  platform_total?: number | null;
  clear_platform_total?: boolean;
}

export type AssetCategory = "CASH" | "GOLD" | "STOCK" | "CRYPTO";
