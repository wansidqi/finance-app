import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";

interface ErrorModalProps {
  visible: boolean;
  error: unknown;
  onClose: () => void;
}

export const ErrorModal = ({ visible, error, onClose }: ErrorModalProps) => {
  const errorString = JSON.stringify(error, null, 2);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(errorString);
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      {/* overlay */}
      <View className="flex-1 bg-black/60 justify-center px-4">
        {/* glass container */}
        <View className="rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-xl p-4 shadow-2xl">
          {/* header */}
          <View className="mb-3">
            <Text className="text-white text-lg font-semibold">
              Something went wrong 🚨
            </Text>
            <Text className="text-zinc-400 text-xs mt-1">
              An unexpected error occurred
            </Text>
          </View>

          {/* error body */}
          <ScrollView
            className="max-h-60 rounded-lg bg-black/40 border border-white/5 p-3"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-red-300 text-xs font-mono">
              {errorString}
            </Text>
          </ScrollView>

          {/* actions */}
          <View className="flex-row justify-end gap-2 mt-4">
            <TouchableOpacity
              onPress={handleCopy}
              className="px-4 py-2 rounded-lg bg-red-500/90 active:bg-red-600"
            >
              <Text className="text-white font-medium text-sm">Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-700/80 active:bg-zinc-600"
            >
              <Text className="text-white font-medium text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
