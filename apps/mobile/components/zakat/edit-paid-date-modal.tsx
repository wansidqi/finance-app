import { calendarDateToIso, DateField, isoToCalendarDate, today } from "@/components/date-field";
import { Dialog } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { View } from "react-native";

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
    <Dialog
      visible={visible}
      onRequestClose={onCancel}
      icon="calendar-outline"
      title={`${category} — Last Paid Date`}
      description="Record when zakat was actually paid, even if it was a while ago. This resets the haul cycle from this date."
      actions={[
        { label: "Cancel", onPress: onCancel, variant: "outline", disabled: isLoading },
        {
          label: isLoading ? "Saving..." : "Save",
          onPress: handleConfirm,
          variant: "primary",
          loading: isLoading,
        },
      ]}
    >
      <View>
        <DateField value={date} onChange={setDate} maximumDate={today()} />
      </View>
    </Dialog>
  );
}
