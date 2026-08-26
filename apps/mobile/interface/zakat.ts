export interface ZakatCategory {
  id: string;
  name: "CASH" | "GOLD" | "CRYPTO" | "STOCK";
  isTracked: boolean;
  totalValue: number;
  nisabAmount: number;
  isNisabReached: boolean;
  lastPaidDate: string | null;
  nextDueDate: string;
  haulStatus: "PENDING" | "DUE" | "OVERDUE" | "PAID";
  yearlyCycleStart: string;
  yearlyCycleEnd: string;
}

export interface ZakatTrackerState {
  categories: ZakatCategory[];
  totalZakatDue: number;
  lastUpdated: string;
}
