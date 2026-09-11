import { Button } from "@/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${pad(minute)} ${period}`;
}

function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

type Props = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
};

/** Tappable field that opens the platform's native time picker — mirrors DateField's Android-dialog/iOS-modal split. */
export function TimeField({ hour, minute, onChange }: Props) {
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [draftTime, setDraftTime] = useState<Date>(timeToDate(hour, minute));

  const openPicker = () => {
    const base = timeToDate(hour, minute);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base,
        mode: "time",
        is24Hour: false,
        onChange: (event, selected) => {
          if (event.type === "set" && selected) {
            onChange(selected.getHours(), selected.getMinutes());
          }
        },
      });
    } else {
      setDraftTime(base);
      setIosPickerVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.7}
        className="flex-row items-center justify-between rounded-input border border-glass-edge bg-white/5 px-3 py-3"
      >
        <View className="flex-row items-center gap-2.5">
          <Ionicons name="time-outline" size={17} color="#d1e4fa" />
          <Text className="font-sans text-[13px] text-white font-medium">{formatTime(hour, minute)}</Text>
        </View>
        <Ionicons name="chevron-down" size={15} color="#9da7ba" />
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <Modal
          visible={iosPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIosPickerVisible(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center px-6">
            <View className="w-full rounded-card bg-modal-surface border border-glass-edge shadow-modal p-4">
              <DateTimePicker
                value={draftTime}
                mode="time"
                display="spinner"
                themeVariant="dark"
                onChange={(_event, selected) => {
                  if (selected) setDraftTime(selected);
                }}
              />
              <View className="flex-row gap-3 mt-3">
                <Button
                  label="Cancel"
                  variant="outline"
                  className="flex-1"
                  onPress={() => setIosPickerVisible(false)}
                />
                <Button
                  label="Done"
                  variant="primary"
                  className="flex-1"
                  onPress={() => {
                    onChange(draftTime.getHours(), draftTime.getMinutes());
                    setIosPickerVisible(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
