import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";

import { Dialog } from "@/components/ui/dialog";

interface ErrorModalProps {
  visible: boolean;
  error: unknown;
  onClose: () => void;
}

export const ErrorModal = ({ visible, error, onClose }: ErrorModalProps) => {
  const errorString = JSON.stringify(error, null, 2);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) setCopied(false);
  }, [visible]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(errorString);
    setCopied(true);
  };

  return (
    <Dialog
      visible={visible}
      onRequestClose={onClose}
      icon="alert-circle-outline"
      title="Something went wrong"
      description="An unexpected error occurred"
      actions={[
        { label: copied ? "Copied" : "Copy", onPress: handleCopy, variant: "outline" },
        { label: "Close", onPress: onClose, variant: "primary" },
      ]}
    >
      <ScrollView
        className="max-h-40 rounded-input bg-black/40 border border-glass-edge p-3"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-mono text-[11px] text-mist">{errorString}</Text>
      </ScrollView>
    </Dialog>
  );
};
