export interface PlatformShare {
  platform: string;
  value: number;
  zakat_due: number;
}

export interface ZakatTrackerDto {
  id: number | null;
  user_id: number | null;
  category: string;
  value: number;
  status: "ACTIVE" | "INACTIVE" | null;
  created_at: string | null;
  updated_at: string | null;

  is_tracked: boolean;
  haul_status: "PENDING" | "DUE" | "OVERDUE";
  nisab: number;
  nisab_reached: boolean;
  last_paid_date: string | null;
  last_paid_date_hijri: string | null;
  haul_start_date: string | null;
  next_due_date: string | null;
  next_due_date_hijri: string | null;
  zakat_due: number;
  platform_breakdown: PlatformShare[];
}

export interface UpdateZakatTrackerRequest {
  category: string;
  last_paid_date?: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export interface ZakatSettingsDto {
  combine_categories: boolean;
}
