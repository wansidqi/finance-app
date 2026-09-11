import type { ReactNode } from "react";
import { View } from "react-native";

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className = "", padded = true }: CardProps) {
  return (
    <View
      className={`rounded-card bg-glass-surface border border-glass-edge shadow-card overflow-hidden ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </View>
  );
}
