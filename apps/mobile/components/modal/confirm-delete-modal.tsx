import { Dialog } from "@/components/ui/dialog";

interface ConfirmDeleteModalProps {
  visible: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({
  visible,
  title,
  description,
  onCancel,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog
      visible={visible}
      onRequestClose={onCancel}
      icon="trash-outline"
      title={title}
      description={description}
      actions={[
        { label: "Cancel", onPress: onCancel, variant: "outline", disabled: isLoading },
        {
          label: isLoading ? "Deleting..." : "Delete",
          onPress: onConfirm,
          variant: "destructive",
          loading: isLoading,
        },
      ]}
    />
  );
}
