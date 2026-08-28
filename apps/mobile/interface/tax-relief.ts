export type TaxReliefCategoryKey =
  | "lifestyle"
  | "lifestyle_sports"
  | "medical_self_spouse_child"
  | "medical_parents"
  | "education_fees"
  | "life_insurance_epf"
  | "prs"
  | "sspn"
  | "disabled_equipment"
  | "breastfeeding_equipment"
  | "childcare"
  | "ev_charging";

export const TAX_RELIEF_CATEGORY_LABELS: Record<TaxReliefCategoryKey, string> = {
  lifestyle: "Lifestyle (books, devices, internet, courses)",
  lifestyle_sports: "Lifestyle — Sports Equipment & Activities",
  medical_self_spouse_child: "Medical (Self/Spouse/Child)",
  medical_parents: "Parents' Medical & Care",
  education_fees: "Education Fees (Self)",
  life_insurance_epf: "Life Insurance & EPF",
  prs: "PRS & Deferred Annuity",
  sspn: "SSPN Net Deposit",
  disabled_equipment: "Disabled Individual — Equipment",
  breastfeeding_equipment: "Breastfeeding Equipment",
  childcare: "Child Care Fees",
  ev_charging: "EV Charging Facility",
};

export const TAX_RELIEF_CATEGORIES: TaxReliefCategoryKey[] = [
  "lifestyle",
  "lifestyle_sports",
  "medical_self_spouse_child",
  "medical_parents",
  "education_fees",
  "life_insurance_epf",
  "prs",
  "sspn",
  "disabled_equipment",
  "breastfeeding_equipment",
  "childcare",
  "ev_charging",
];

/**
 * Starting-point caps based on recent LHDN individual relief amounts.
 * LHDN revises the relief list and caps with each annual Budget, so these
 * are only seeded into `tax_relief_caps` the first time a given assessment
 * year is opened — after that, the DB row (editable in the Tax Relief
 * screen) is the source of truth, not this constant.
 */
export const DEFAULT_TAX_RELIEF_CAPS: Record<TaxReliefCategoryKey, number> = {
  lifestyle: 2500,
  lifestyle_sports: 1000,
  medical_self_spouse_child: 10000,
  medical_parents: 8000,
  education_fees: 7000,
  life_insurance_epf: 7000,
  prs: 3000,
  sspn: 8000,
  disabled_equipment: 6000,
  breastfeeding_equipment: 1000,
  childcare: 3000,
  ev_charging: 2500,
};

export interface TaxReliefCapInterface {
  assessment_year: number;
  category_key: TaxReliefCategoryKey;
  cap_amount: number;
}

export interface TaxReliefCategorySummary {
  category_key: TaxReliefCategoryKey;
  label: string;
  claimed: number;
  cap: number;
  remaining: number;
  over_cap: boolean;
}
