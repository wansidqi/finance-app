import { Text } from "react-native";

// Three label styles were hand-copied across the app for the same "small
// uppercase caption above a field" role — kept as distinct variants here
// (rather than unified into one look) so consolidating them doesn't also
// silently change any screen's visual weight.
type FieldLabelVariant = "field" | "form" | "form-bold";

const VARIANT_CLASSES: Record<FieldLabelVariant, string> = {
  field: "font-mono text-[10px] font-semibold text-fog mb-1.5 uppercase tracking-wider",
  form: "font-mono text-[12px] text-fog mb-2 uppercase tracking-wider",
  "form-bold": "font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider",
};

interface FieldLabelProps {
  children: string;
  variant?: FieldLabelVariant;
  className?: string;
}

export function FieldLabel({ children, variant = "field", className = "" }: FieldLabelProps) {
  return <Text className={`${VARIANT_CLASSES[variant]} ${className}`}>{children}</Text>;
}
