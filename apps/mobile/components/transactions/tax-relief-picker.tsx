import { TAX_RELIEF_CATEGORIES, TAX_RELIEF_CATEGORY_LABELS, TaxReliefCategoryKey } from "@/interface/tax-relief";
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

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
      <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
        Tax Relief (optional)
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <TouchableOpacity
          onPress={() => onChangeCategory(null)}
          className={`rounded-lg px-3 py-2 border-2 ${
            categoryKey === null ? "border-sky-500 bg-sky-500/10" : "border-slate-600 bg-slate-700/30"
          }`}
        >
          <Text className={`font-bold text-[12px] ${categoryKey === null ? "text-sky-400" : "text-slate-300"}`}>
            None
          </Text>
        </TouchableOpacity>
        {visibleCategories.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => onChangeCategory(key)}
            className={`rounded-lg px-3 py-2 border-2 ${
              categoryKey === key ? "border-sky-500 bg-sky-500/10" : "border-slate-600 bg-slate-700/30"
            }`}
          >
            <Text className={`font-bold text-[12px] ${categoryKey === key ? "text-sky-400" : "text-slate-300"}`}>
              {TAX_RELIEF_CATEGORY_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
        {!expanded && (
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            className="rounded-lg px-3 py-2 border-2 border-dashed border-slate-500 bg-slate-700/10"
          >
            <Text className="font-bold text-[12px] text-slate-400">
              More ({TAX_RELIEF_CATEGORIES.length - COLLAPSED_COUNT})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {categoryKey !== null && (
        <View className="mt-3">
          <Text className="text-[11px] text-slate-400 mb-1.5">Assessment Year (YA)</Text>
          <TextInput
            placeholder={String(new Date().getFullYear())}
            keyboardType="number-pad"
            maxLength={4}
            value={assessmentYear}
            onChangeText={onChangeAssessmentYear}
            placeholderTextColor="#64748b"
            className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
          />
        </View>
      )}
    </View>
  );
}
