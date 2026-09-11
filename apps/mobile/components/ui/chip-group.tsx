import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
}

interface ChipGroupProps<T extends string = string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
  className?: string;
}

export function ChipGroup<T extends string = string>({
  options,
  value,
  onChange,
  scrollable,
  className = "",
}: ChipGroupProps<T>) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <TouchableOpacity
        key={option.value}
        onPress={() => onChange(option.value)}
        className={`flex-row items-center gap-1.5 rounded-button border px-4 py-2 ${
          selected
            ? "bg-luminous-fill border-glass-edge"
            : "bg-transparent border-white/[0.06]"
        }`}
      >
        {option.icon && (
          <Ionicons
            name={option.icon}
            size={14}
            color={selected ? "#d1e4fa" : "#9da7ba"}
          />
        )}
        <Text
          className={`font-sans text-[13px] ${selected ? "text-white font-medium" : "text-mist"}`}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={`flex-row gap-2 ${className}`}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View className={`flex-row flex-wrap gap-2 ${className}`}>{chips}</View>;
}
