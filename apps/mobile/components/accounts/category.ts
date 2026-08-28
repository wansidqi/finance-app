import { AccountType } from "@/interface/account";
import { Ionicons } from "@expo/vector-icons";

export const ACCOUNT_TYPES: AccountType[] = [
  "bank",
  "cash",
  "savings",
  "ewallet",
  "asb",
  "brokerage",
  "crypto",
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  savings: "Savings",
  ewallet: "E-Wallet",
  asb: "ASB",
  brokerage: "Brokerage",
  crypto: "Crypto",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, keyof typeof Ionicons.glyphMap> = {
  bank: "business-outline",
  cash: "cash-outline",
  savings: "shield-checkmark-outline",
  ewallet: "phone-portrait-outline",
  asb: "trending-up-outline",
  brokerage: "bar-chart-outline",
  crypto: "logo-bitcoin",
};
