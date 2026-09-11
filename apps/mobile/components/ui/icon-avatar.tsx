import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View } from "react-native";

interface IconAvatarProps {
  name: ComponentProps<typeof Ionicons>["name"];
  size?: number;
  className?: string;
}

export function IconAvatar({ name, size = 40, className = "" }: IconAvatarProps) {
  return (
    <View
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-icon bg-luminous-fill ${className}`}
    >
      <Ionicons name={name} size={size * 0.45} color="#d1e4fa" />
    </View>
  );
}
