import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";

/** Reads an ISO timestamp's UTC calendar day into a local noon Date, so the
 * native picker displays the same day regardless of device timezone. */
export function isoToCalendarDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
}

/** Inverse of isoToCalendarDate — a UTC-midnight ISO timestamp for the picked calendar day. */
export function calendarDateToIso(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

/** Today's date as a local-noon calendar Date, for default field values. */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

function formatDisplay(date: Date | null): string {
  if (!date) return "Select date";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  accentColor?: string;
};

/** Tappable field that opens the platform's native calendar picker. */
export function DateField({ value, onChange, minimumDate, maximumDate, accentColor = "#f59e0b" }: Props) {
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(value ?? today());

  const openPicker = () => {
    const base = value ?? today();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: (event, selected) => {
          if (event.type === "set" && selected) onChange(selected);
        },
      });
    } else {
      setDraftDate(base);
      setIosPickerVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.7}
        className="flex-row items-center justify-between rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-3"
      >
        <View className="flex-row items-center gap-2.5">
          <Ionicons name="calendar-outline" size={17} color={accentColor} />
          <Text className={value ? "text-white text-[13px] font-medium" : "text-slate-500 text-[13px]"}>
            {formatDisplay(value)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={15} color="#64748b" />
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <Modal
          visible={iosPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIosPickerVisible(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center px-6">
            <View className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4">
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_event, selected) => {
                  if (selected) setDraftDate(selected);
                }}
              />
              <View className="flex-row gap-3 mt-3">
                <TouchableOpacity
                  onPress={() => setIosPickerVisible(false)}
                  className="flex-1 bg-slate-600/40 rounded-lg py-3"
                >
                  <Text className="text-center text-slate-200 font-semibold text-[13px]">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChange(draftDate);
                    setIosPickerVisible(false);
                  }}
                  style={{ backgroundColor: accentColor }}
                  className="flex-1 rounded-lg py-3"
                >
                  <Text className="text-center text-white font-semibold text-[13px]">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
