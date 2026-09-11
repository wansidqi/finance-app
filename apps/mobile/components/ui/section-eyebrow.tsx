import type { ReactNode } from "react";
import { Text, View } from "react-native";

interface SectionEyebrowProps {
  label: string;
  // Trailing control (e.g. "Collapse all") — swaps the label onto the left
  // and drops the trailing divider line so the action has room to sit flush right.
  action?: ReactNode;
  className?: string;
}

export function SectionEyebrow({ label, action, className = "" }: SectionEyebrowProps) {
  if (action) {
    return (
      <View className={`flex-row items-center justify-between gap-3 ${className}`}>
        <View className="flex-row items-center gap-3 flex-1">
          <Text className="font-mono text-[12px] uppercase tracking-[2px] text-mist">
            {label}
          </Text>
          <View className="flex-1 h-px bg-glass-edge" />
        </View>
        {action}
      </View>
    );
  }

  return (
    <View className={`flex-row items-center gap-3 ${className}`}>
      <View className="flex-1 h-px bg-glass-edge" />
      <Text className="font-mono text-[12px] uppercase tracking-[2px] text-mist">
        {label}
      </Text>
      <View className="flex-1 h-px bg-glass-edge" />
    </View>
  );
}
