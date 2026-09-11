import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TimeField } from "@/components/time-field";
import { ReminderNotificationMode } from "@/interface/reminder";
import {
  useReminderNotificationSettings,
  useSetReminderNotificationSettings,
} from "@/services/reminder";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { DaysBeforeDueField, withDueDayIncluded } from "./days-before-due-picker";

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
    offsets: number[];
    hour: number;
    minute: number;
  } | null>(null);

  const startEditing = () => {
    if (!settings) return;
    setDraft({
      mode: settings.mode,
      offsets: withDueDayIncluded(settings.offsets_days),
      hour: settings.hour,
      minute: settings.minute,
    });
  };

  const handleSave = async () => {
    if (!draft) return;

    if (draft.mode === "default") {
      await save({ mode: "default", offsetsDays: [], hour: 0, minute: 0 });
      setDraft(null);
      return;
    }

    await save({ mode: "custom", offsetsDays: draft.offsets, hour: draft.hour, minute: draft.minute });
    setDraft(null);
  };

  if (!settings) return null;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-display text-[15px] text-white">Notification Timing</Text>
        {!draft && (
          <TouchableOpacity onPress={startEditing}>
            <Text className="font-sans text-frost text-[13px] font-semibold">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {!draft ? (
        <Text className="font-sans text-[13px] text-mist leading-5">
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
                className={`flex-1 rounded-button py-2 items-center border ${
                  draft.mode === mode
                    ? "border-glass-edge bg-luminous-fill"
                    : "border-white/[0.06] bg-transparent"
                }`}
              >
                <Text
                  className={`font-sans text-[11px] font-bold ${
                    draft.mode === mode ? "text-white" : "text-mist"
                  }`}
                >
                  {mode === "default" ? "Default (7/3/1/0 @ 9:00 AM)" : "Custom"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {draft.mode === "custom" && (
            <>
              <Text className="font-mono text-[10px] text-fog mb-1.5 uppercase tracking-wider">
                Notify this many days before due
              </Text>
              <View className="mb-3">
                <DaysBeforeDueField
                  value={draft.offsets}
                  onChange={(offsets) => setDraft({ ...draft, offsets })}
                />
              </View>

              <Text className="font-mono text-[10px] text-fog mb-1 uppercase tracking-wider">
                Time
              </Text>
              <View className="mb-3">
                <TimeField
                  hour={draft.hour}
                  minute={draft.minute}
                  onChange={(h, m) => setDraft({ ...draft, hour: h, minute: m })}
                />
              </View>
            </>
          )}

          <View className="flex-row gap-3">
            <Button
              label="Cancel"
              variant="outline"
              disabled={isPending}
              onPress={() => setDraft(null)}
              className="flex-1"
            />
            <Button
              label={isPending ? "Saving..." : "Save"}
              variant="primary"
              disabled={isPending}
              onPress={handleSave}
              className="flex-1"
            />
          </View>
        </View>
      )}
    </Card>
  );
}
