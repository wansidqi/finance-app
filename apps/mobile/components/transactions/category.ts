import { TransactionType } from "@/interface/transaction";

export const TRANSACTION_TYPES: TransactionType[] = [
  "income",
  "expense",
  "transfer",
  "investment_purchase",
  "investment_sale",
  "dividend",
  "interest",
  "debt_payment",
  "zakat_payment",
];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  investment_purchase: "Investment Buy",
  investment_sale: "Investment Sell",
  dividend: "Dividend",
  interest: "Interest",
  debt_payment: "Debt Payment",
  zakat_payment: "Zakat Payment",
};
