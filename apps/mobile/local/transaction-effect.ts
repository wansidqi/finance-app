import { TransactionType } from "@/interface/transaction";

/**
 * Signed delta applied to the *primary* account (transactions.account_id)
 * for one unit of `amount`. Transfers additionally credit `amount` to
 * transfer_account_id — handled separately in transaction-service since it
 * touches a second account row.
 */
const OUTFLOW_TYPES: ReadonlySet<TransactionType> = new Set([
  "expense",
  "transfer",
  "investment_purchase",
  "debt_payment",
  "zakat_payment",
]);

export function primaryAccountDelta(type: TransactionType, amount: number): number {
  return OUTFLOW_TYPES.has(type) ? -amount : amount;
}

/** Whether `type` reduces the balance of the account it's recorded against (transactions.account_id). */
export function isOutflowType(type: TransactionType): boolean {
  return OUTFLOW_TYPES.has(type);
}
