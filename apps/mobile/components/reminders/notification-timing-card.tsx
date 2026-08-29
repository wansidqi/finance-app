import { ReminderNotificationMode } from "@/interface/reminder";
import {
  useReminderNotificationSettings,
  useSetReminderNotificationSettings,
} from "@/services/reminder";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${pad(minute)} ${period}`;
}

function describeOffsets(offsets: number[]): string {
  return offsets
    .map((d) => (d === 0 ? "due day" : `${d}d before`))
    .join(", ");
}

/** Settings card controlling the app-wide default for when reminder notifications fire (7/3/1/0 days at 9:00 AM, or a custom offsets/time schedule) — individual reminders can still override this with their own timing. */
export function NotificationTimingCard() {
  const { data: settings } = useReminderNotificationSettings();
  const { mutateAsync: save, isPending } = useSetReminderNotificationSettings();

  const [draft, setDraft] = useState<{
    mode: ReminderNotificationMode;
    offsetsText: string;
    hourText: string;
    minuteText: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    if (!settings) return;
    setDraft({
      mode: settings.mode,
      offsetsText: settings.offsets_days.join(", "),
      hourText: String(settings.hour),
      minuteText: pad(settings.minute),
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!draft) return;

    if (draft.mode === "default") {
      await save({ mode: "default", offsetsDays: [], hour: 0, minute: 0 });
      setDraft(null);
      return;
    }

    const offsets = draft.offsetsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number);
    const hour = Number(draft.hourText);
    const minute = Number(draft.minuteText);

    if (offsets.length === 0 || offsets.some((n) => Number.isNaN(n) || n < 0)) {
      setError("Enter one or more non-negative day counts, separated by commas");
      return;
    }
    if (Number.isNaN(hour) || hour < 0 || hour > 23) {
      setError("Hour must be between 0 and 23");
      return;
    }
    if (Number.isNaN(minute) || minute < 0 || minute > 59) {
      setError("Minute must be between 0 and 59");
      return;
    }

    await save({ mode: "custom", offsetsDays: offsets, hour, minute });
    setDraft(null);
  };

  if (!settings) return null;

  return (
    <View className="mb-4 rounded-2xl bg-white/[0.035] border border-white/10 px-4 py-3.5">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[12px] font-bold text-slate-200">Notification Timing</Text>
        {!draft && (
          <TouchableOpacity onPress={startEditing}>
            <Text className="text-amber-400 text-[12px] font-semibold">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {!draft ? (
        <Text className="text-[11px] text-slate-400">
          {settings.mode === "default" ? "Default — " : "Custom — "}
          {describeOffsets(settings.offsets_days)} at {formatTime(settings.hour, settings.minute)}
        </Text>
      ) : (
        <View className="mt-2">
          <View className="flex-row gap-2 mb-3">
            {(["default", "custom"] as ReminderNotificationMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setDraft({ ...draft, mode })}
                className={`flex-1 rounded-lg py-2 items-center border-2 ${
                  draft.mode === mode
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-600 bg-slate-700/30"
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    draft.mode === mode ? "text-amber-400" : "text-slate-300"
                  }`}
                >
                  {mode === "default" ? "Default (7/3/1/0 @ 9:00 AM)" : "Custom"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {draft.mode === "custom" && (
            <>
              <Text className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                Days before due (comma-separated, 0 = due day)
              </Text>
              <TextInput
                value={draft.offsetsText}
                onChangeText={(v) => setDraft({ ...draft, offsetsText: v })}
                placeholder="7, 3, 1, 0"
                placeholderTextColor="#64748b"
                keyboardType="numbers-and-punctuation"
                className="rounded-lg border border-slate-600 px-3 py-2.5 text-white bg-slate-700/30 text-[13px] mb-3"
              />

              <Text className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                Time (24-hour, seconds always :00)
              </Text>
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  value={draft.hourText}
                  onChangeText={(v) => setDraft({ ...draft, hourText: v })}
                  placeholder="HH"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  maxLength={2}
                  className="flex-1 rounded-lg border border-slate-600 px-3 py-2.5 text-white bg-slate-700/30 text-[13px] text-center"
                />
                <Text className="text-slate-400 font-bold">:</Text>
                <TextInput
                  value={draft.minuteText}
                  onChangeText={(v) => setDraft({ ...draft, minuteText: v })}
                  placeholder="MM"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  maxLength={2}
                  className="flex-1 rounded-lg border border-slate-600 px-3 py-2.5 text-white bg-slate-700/30 text-[13px] text-center"
                />
              </View>
            </>
          )}

          {error && <Text className="text-red-400 text-[11px] mb-2">{error}</Text>}

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setDraft(null)}
              disabled={isPending}
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg py-2.5"
            >
              <Text className="text-center text-slate-200 font-semibold text-[12px]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isPending}
              className="flex-1 bg-amber-500 rounded-lg py-2.5"
            >
              <Text className="text-center text-white font-semibold text-[12px]">
                {isPending ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
