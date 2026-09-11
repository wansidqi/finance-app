import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Modal, Text, View } from "react-native";

import { Button, ButtonVariant } from "@/components/ui/button";

interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

interface DialogProps {
  visible: boolean;
  onRequestClose?: () => void;
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
  actions: DialogAction[];
  children?: ReactNode;
}

export function Dialog({
  visible,
  onRequestClose,
  icon,
  title,
  description,
  actions,
  children,
}: DialogProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-sm rounded-card bg-modal-surface border border-glass-edge shadow-modal p-6">
          <View className="items-center justify-center self-center mb-4 h-14 w-14 rounded-icon bg-luminous-fill">
            <Ionicons name={icon} size={26} color="#d1e4fa" />
          </View>

          <Text className="font-display text-[18px] text-ice text-center">
            {title}
          </Text>

          {description && (
            <Text className="font-sans text-[14px] text-mist text-center mt-2">
              {description}
            </Text>
          )}

          {children && <View className="mt-4">{children}</View>}

          <View className="flex-row gap-3 mt-6">
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                onPress={action.onPress}
                variant={action.variant ?? "outline"}
                disabled={action.disabled}
                loading={action.loading}
                className="flex-1"
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
