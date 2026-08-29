import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface EditPaidDateModalProps {
  visible: boolean;
  category: string;
  initialDate: string | null;
  onCancel: () => void;
  onConfirm: (isoDate: string) => void;
  isLoading?: boolean;
}

export function EditPaidDateModal({
  visible,
  category,
  initialDate,
  onCancel,
  onConfirm,
  isLoading = false,
}: EditPaidDateModalProps) {
  const [date, setDate] = useState<Date>(today());

  useEffect(() => {
    if (!visible) return;
    setDate(initialDate ? isoToCalendarDate(initialDate) : today());
  }, [visible, initialDate]);

  const handleConfirm = () => {
    onConfirm(calendarDateToIso(date));
  };

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
            <View className="bg-emerald-500/20 rounded-full p-3 mb-3">
              <Ionicons name="calendar" size={26} color="#10b981" />
            </View>
            <Text className="text-white text-[16px] font-bold mb-1">
              {category} — Last Paid Date
            </Text>
            <Text className="text-slate-300 text-[12px] text-center">
              Record when zakat was actually paid, even if it was a while
              ago. This resets the haul cycle from this date.
            </Text>
          </View>

          <View className="mt-2">
            <DateField value={date} onChange={setDate} accentColor="#10b981" maximumDate={today()} />
          </View>

          <View className="flex-row gap-3 mt-5">
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
              onPress={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-emerald-500 rounded-lg py-3"
            >
              <Text className="text-center text-white font-semibold text-[13px]">
                {isLoading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
