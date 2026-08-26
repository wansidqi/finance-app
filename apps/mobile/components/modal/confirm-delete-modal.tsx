import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface ConfirmDeleteModalProps {
  visible: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({
  visible,
  title,
  description,
  onCancel,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-6">
          <View className="items-center mb-4">
            <View className="bg-red-500/20 rounded-full p-3 mb-3">
              <Ionicons name="trash-bin" size={26} color="#ef4444" />
            </View>
            <Text className="text-white text-[16px] font-bold mb-1">
              {title}
            </Text>
            <Text className="text-slate-300 text-[12px] text-center">
              {description}
            </Text>
          </View>

          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1 bg-slate-600/40 rounded-lg py-3"
            >
              <Text className="text-center text-slate-200 font-semibold text-[13px]">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-500 rounded-lg py-3"
            >
              <Text className="text-center text-white font-semibold text-[13px]">
                {isLoading ? "Deleting..." : "Delete"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
