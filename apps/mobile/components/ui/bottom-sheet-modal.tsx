import type { ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/icon-button";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/60">
          <View
            className="rounded-t-card bg-modal-surface border-t border-glass-edge shadow-modal pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="font-display text-[20px] text-white">{title}</Text>
                {subtitle && (
                  <Text className="font-sans text-[12px] text-fog mt-0.5">
                    {subtitle}
                  </Text>
                )}
              </View>
              <IconButton onPress={onClose} icon="close" label="Close" />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
              className="px-6"
            >
              {children}
            </ScrollView>

            {footer && <View className="px-6 mt-4">{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
