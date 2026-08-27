import { Text, TextInput, View } from "react-native";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function dateToFields(date: Date) {
  return {
    day: pad(date.getUTCDate()),
    month: pad(date.getUTCMonth() + 1),
    year: date.getUTCFullYear().toString(),
  };
}

/** Parses D/M/Y text fields into a UTC-midnight ISO date, or null if invalid. */
export function fieldsToIsoDate(day: string, month: string, year: string): string | null {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!d || !m || !y || y < 1900) return null;

  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return check.toISOString();
}

type Props = {
  day: string;
  month: string;
  year: string;
  onChangeDay: (v: string) => void;
  onChangeMonth: (v: string) => void;
  onChangeYear: (v: string) => void;
};

/** Manual DD/MM/YYYY entry — mirrors components/zakat/edit-paid-date-modal.tsx. */
export function DateFields({ day, month, year, onChangeDay, onChangeMonth, onChangeYear }: Props) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <Text className="text-[10px] text-slate-400 mb-1">DAY</Text>
        <TextInput
          value={day}
          onChangeText={onChangeDay}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="DD"
          placeholderTextColor="#64748b"
          className="bg-slate-700/30 border border-slate-600 rounded-lg px-3 py-3 text-white text-center text-[13px]"
        />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] text-slate-400 mb-1">MONTH</Text>
        <TextInput
          value={month}
          onChangeText={onChangeMonth}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
          placeholderTextColor="#64748b"
          className="bg-slate-700/30 border border-slate-600 rounded-lg px-3 py-3 text-white text-center text-[13px]"
        />
      </View>
      <View className="flex-[1.4]">
        <Text className="text-[10px] text-slate-400 mb-1">YEAR</Text>
        <TextInput
          value={year}
          onChangeText={onChangeYear}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="YYYY"
          placeholderTextColor="#64748b"
          className="bg-slate-700/30 border border-slate-600 rounded-lg px-3 py-3 text-white text-center text-[13px]"
        />
      </View>
    </View>
  );
}
