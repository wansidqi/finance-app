import { TextField } from "@/components/ui/text-field";
import { TAX_RELIEF_CATEGORIES, TAX_RELIEF_CATEGORY_LABELS, TaxReliefCategoryKey } from "@/interface/tax-relief";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  categoryKey: TaxReliefCategoryKey | null;
  assessmentYear: string;
  onChangeCategory: (key: TaxReliefCategoryKey | null) => void;
  onChangeAssessmentYear: (year: string) => void;
};

// Number of categories shown before the "More" pill collapses the rest.
const COLLAPSED_COUNT = 4;

/** Optional LHDN relief tagging for an expense transaction — shown only when the parent form's type is "expense". */
export function TaxReliefPicker({
  categoryKey,
  assessmentYear,
  onChangeCategory,
  onChangeAssessmentYear,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when editing a transaction already tagged with a category
  // that's hidden behind "More", so the active selection is never invisible.
  useEffect(() => {
    if (categoryKey && TAX_RELIEF_CATEGORIES.indexOf(categoryKey) >= COLLAPSED_COUNT) {
      setExpanded(true);
    }
  }, [categoryKey]);

  const visibleCategories = expanded ? TAX_RELIEF_CATEGORIES : TAX_RELIEF_CATEGORIES.slice(0, COLLAPSED_COUNT);

  return (
    <View className="mb-4">
      <Text className="font-mono text-[12px] text-fog mb-2 uppercase tracking-wider">
        Tax Relief (optional)
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <TouchableOpacity
          onPress={() => onChangeCategory(null)}
          className={`rounded-button px-3 py-2 border ${
            categoryKey === null ? "border-glass-edge bg-luminous-fill" : "border-white/[0.06] bg-transparent"
          }`}
        >
          <Text className={`font-sans font-medium text-[12px] ${categoryKey === null ? "text-white" : "text-mist"}`}>
            None
          </Text>
        </TouchableOpacity>
        {visibleCategories.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => onChangeCategory(key)}
            className={`rounded-button px-3 py-2 border ${
              categoryKey === key ? "border-glass-edge bg-luminous-fill" : "border-white/[0.06] bg-transparent"
            }`}
          >
            <Text className={`font-sans font-medium text-[12px] ${categoryKey === key ? "text-white" : "text-mist"}`}>
              {TAX_RELIEF_CATEGORY_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
        {!expanded && (
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            className="rounded-button px-3 py-2 border border-dashed border-white/[0.1] bg-transparent"
          >
            <Text className="font-sans font-medium text-[12px] text-fog">
              More ({TAX_RELIEF_CATEGORIES.length - COLLAPSED_COUNT})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {categoryKey !== null && (
        <View className="mt-3">
          <Text className="font-sans text-[11px] text-mist mb-1.5">Assessment Year (YA)</Text>
          <TextField
            placeholder={String(new Date().getFullYear())}
            keyboardType="number-pad"
            maxLength={4}
            value={assessmentYear}
            onChangeText={onChangeAssessmentYear}
          />
        </View>
      )}
    </View>
  );
}
