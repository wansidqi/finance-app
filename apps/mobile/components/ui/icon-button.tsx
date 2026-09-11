import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { TouchableOpacity } from "react-native";

interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  // Required, not optional — this is the one thing a bare icon can't convey
  // to a screen reader on its own.
  label: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 20,
  color = "#d1e4fa",
  disabled,
  className = "",
}: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className={`p-2 rounded-icon bg-luminous-fill active:opacity-70 ${disabled ? "opacity-40" : ""} ${className}`}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}
