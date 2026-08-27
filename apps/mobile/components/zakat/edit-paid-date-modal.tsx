import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

interface EditPaidDateModalProps {
  visible: boolean;
  category: string;
  initialDate: string | null;
  onCancel: () => void;
  onConfirm: (isoDate: string) => void;
  isLoading?: boolean;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function EditPaidDateModal({
  visible,
  category,
  initialDate,
  onCancel,
  onConfirm,
  isLoading = false,
}: EditPaidDateModalProps) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const base = initialDate ? new Date(initialDate) : new Date();
    setDay(pad(base.getDate()));
    setMonth(pad(base.getMonth() + 1));
    setYear(base.getFullYear().toString());
    setError(null);
  }, [visible, initialDate]);

  const handleConfirm = () => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!d || !m || !y || y < 1900) {
      setError("Enter a valid date");
      return;
    }

    // Build as a UTC midnight timestamp for the chosen calendar day, so the
    // date doesn't shift depending on the device's timezone offset.
    const check = new Date(Date.UTC(y, m - 1, d));
    if (
      check.getUTCFullYear() !== y ||
      check.getUTCMonth() !== m - 1 ||
      check.getUTCDate() !== d
    ) {
      setError("That date doesn't exist");
      return;
    }

    const today = new Date();
    const todayUTC = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    if (check.getTime() > todayUTC) {
      setError("Date can't be in the future");
      return;
    }

    onConfirm(check.toISOString());
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

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 mb-1">DAY</Text>
              <TextInput
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
                placeholderTextColor="#64748b"
                className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 mb-1">MONTH</Text>
              <TextInput
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor="#64748b"
                className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
              />
            </View>
            <View className="flex-[1.4]">
              <Text className="text-[10px] text-slate-400 mb-1">YEAR</Text>
              <TextInput
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor="#64748b"
                className="bg-slate-700/40 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
              />
            </View>
          </View>

          {error && (
            <Text className="text-red-400 text-[11px] mt-2 text-center">
              {error}
            </Text>
          )}

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
