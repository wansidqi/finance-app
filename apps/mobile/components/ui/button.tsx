import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

export type ButtonVariant = "primary" | "ghost" | "outline" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-violet active:bg-violet/90",
  ghost: "bg-luminous-fill border border-glass-edge active:bg-white/10",
  outline: "bg-transparent border border-glass-edge active:bg-white/5",
  destructive: "bg-steel border border-glass-edge active:bg-steel/80",
};

const VARIANT_TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: "text-white",
  ghost: "text-white",
  outline: "text-frost",
  destructive: "text-white",
};

interface ButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  fullWidth,
  className = "",
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-button py-3 ${label ? "px-6" : "px-3"} ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${disabled ? "opacity-40" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={16}
              color={variant === "outline" ? "#d1e4fa" : "#ffffff"}
            />
          )}
          {label && (
            <Text
              className={`font-sans font-medium text-[14px] ${VARIANT_TEXT_CLASSES[variant]}`}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
