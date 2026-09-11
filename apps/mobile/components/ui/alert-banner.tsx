import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, TouchableOpacity } from "react-native";

interface AlertBannerProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  message: string;
  onPress?: () => void;
  disabled?: boolean;
  showChevron?: boolean;
  className?: string;
}

export function AlertBanner({
  icon,
  message,
  onPress,
  disabled,
  showChevron,
  className = "",
}: AlertBannerProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-2 rounded-card border border-glass-edge bg-luminous-fill px-4 py-3 mb-3 active:opacity-70 ${className}`}
    >
      <Ionicons name={icon} size={18} color="#d1e4fa" />
      <Text className="flex-1 font-sans text-[12px] font-semibold text-frost">{message}</Text>
      {showChevron && <Ionicons name="chevron-forward" size={16} color="#d1e4fa" />}
    </TouchableOpacity>
  );
}
