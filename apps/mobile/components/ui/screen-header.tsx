import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface LargeTitleHeaderProps {
  variant?: "large";
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}

interface BackNavHeaderProps {
  variant: "back";
  title: string;
  onBack: () => void;
  right?: ReactNode;
}

type ScreenHeaderProps = LargeTitleHeaderProps | BackNavHeaderProps;

export function ScreenHeader(props: ScreenHeaderProps) {
  if (props.variant === "back") {
    return (
      <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
        <View className="flex-row items-center gap-1 flex-1">
          <TouchableOpacity
            onPress={props.onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            className="p-2 -ml-2 rounded-icon active:bg-white/5"
          >
            <Ionicons name="chevron-back" size={22} color="#d1e4fa" />
          </TouchableOpacity>
          <Text className="font-display text-[18px] text-white" numberOfLines={1}>
            {props.title}
          </Text>
        </View>
        {props.right}
      </View>
    );
  }

  return (
    <View className="flex-row items-end justify-between px-6 pt-20 pb-6">
      <View className="flex-1 pr-3">
        {props.eyebrow && (
          <Text className="font-mono text-[12px] uppercase tracking-[1.5px] text-fog">
            {props.eyebrow}
          </Text>
        )}
        <Text className="font-display text-[30px] text-white mt-1" numberOfLines={1}>
          {props.title}
        </Text>
      </View>
      {props.right}
    </View>
  );
}
