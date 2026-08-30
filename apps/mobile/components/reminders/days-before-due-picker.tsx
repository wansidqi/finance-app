import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

const PRESET_OFFSETS = [30, 14, 7, 5, 3, 2, 1, 0];

/** Due day (0) is a fixed anchor for every reminder schedule — always included, never toggleable off. */
export function withDueDayIncluded(offsets: number[]): number[] {
  return offsets.includes(0) ? offsets : [...offsets, 0];
}

function describeDaysBeforeDue(offsets: number[]): string {
  return withDueDayIncluded(offsets)
    .slice()
    .sort((a, b) => b - a)
    .map((d) => (d === 0 ? "Due day" : `${d}d before`))
    .join(", ");
}

type PickerProps = {
  value: number[];
  onChange: (offsets: number[]) => void;
};

function DaysBeforeDuePicker({ value, onChange }: PickerProps) {
  const toggle = (day: number) => {
    if (day === 0) return;
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.sort((a, b) => b - a));
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {PRESET_OFFSETS.map((day) => {
        const selected = day === 0 || value.includes(day);
        const locked = day === 0;
        return (
          <TouchableOpacity
            key={day}
            onPress={() => toggle(day)}
            disabled={locked}
            className={`rounded-lg px-3.5 py-2 border ${
              selected ? "bg-indigo-500/15 border-indigo-500/50" : "bg-white/[0.035] border-white/10"
            }`}
          >
            <Text className={`text-[12px] font-bold ${selected ? "text-indigo-300" : "text-slate-400"}`}>
              {day === 0 ? "Due day" : `${day}d`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Compact field that opens a modal containing {@link DaysBeforeDuePicker} —
 * used by both the global Notification Timing card and the per-reminder
 * Add/Edit modal so neither form has to spend a full row of chips inline.
 */
export function DaysBeforeDueField({ value, onChange }: PickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-between rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-2.5"
      >
        <Text className="text-white text-[13px] flex-1 mr-2" numberOfLines={1}>
          {describeDaysBeforeDue(value)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-[16px] font-bold">Notify Before Due</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2 rounded-full bg-slate-700/50"
              >
                <Ionicons name="close" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <DaysBeforeDuePicker value={value} onChange={onChange} />

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="mt-5 bg-indigo-500 rounded-lg py-3"
            >
              <Text className="text-center text-white font-semibold text-[13px]">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
