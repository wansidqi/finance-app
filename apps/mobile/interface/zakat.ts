import { NisabSource } from "./nisab-state";

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
  /** UNKNOWN when nisab itself couldn't be resolved — distinct from PENDING, which means nisab IS known but hasn't been held for a full haul year yet. */
  haul_status: "PENDING" | "DUE" | "OVERDUE" | "UNKNOWN";
  nisab: number | null;
  nisab_source: NisabSource;
  /** Null when nisab is currently unavailable — deliberately distinct from false, so the UI/haul logic never treats "unknown" as "confirmed not reached." */
  nisab_reached: boolean | null;
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
