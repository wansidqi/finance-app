import { Dialog } from "@/components/ui/dialog";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
            className={`rounded-button px-3.5 py-2 border ${
              selected ? "bg-luminous-fill border-glass-edge" : "bg-transparent border-white/[0.06]"
            }`}
          >
            <Text className={`font-sans text-[12px] font-bold ${selected ? "text-white" : "text-mist"}`}>
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
        className="flex-row items-center justify-between rounded-input border border-glass-edge bg-white/5 px-3 py-2.5"
      >
        <Text className="font-sans text-white text-[13px] flex-1 mr-2" numberOfLines={1}>
          {describeDaysBeforeDue(value)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9da7ba" />
      </TouchableOpacity>

      <Dialog
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        icon="notifications-outline"
        title="Notify Before Due"
        actions={[{ label: "Done", onPress: () => setModalVisible(false), variant: "primary" }]}
      >
        <DaysBeforeDuePicker value={value} onChange={onChange} />
      </Dialog>
    </>
  );
}
