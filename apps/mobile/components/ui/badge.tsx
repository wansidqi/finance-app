import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

interface BadgeProps {
  label: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  emphasis?: boolean;
  className?: string;
}

export function Badge({ label, icon, emphasis, className = "" }: BadgeProps) {
  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-badge bg-luminous-fill px-2 py-1 ${className}`}
    >
      {icon && <Ionicons name={icon} size={11} color="#d1e4fa" />}
      <Text
        className={`font-sans text-[12px] text-frost ${emphasis ? "font-semibold" : "font-medium"}`}
      >
        {label}
      </Text>
    </View>
  );
}
