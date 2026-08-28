import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { AccountInterface, AccountType } from "@/interface/account";
import { useCreateAccount, useUpdateAccount } from "@/services/account";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "./category";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

type Props = {
  visible: boolean;
  onClose: () => void;
  account?: AccountInterface | null;
};

export function AddAccountModal({ visible, onClose, account }: Props) {
  const isEditing = !!account;

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [institution, setInstitution] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [note, setNote] = useState("");

  const { mutateAsync: createAccount, isPending: isCreating } = useCreateAccount();
  const { mutateAsync: updateAccount, isPending: isUpdating } = useUpdateAccount();
  const { error, isVisible, hideError, showError } = useErrorModal();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    setName(account?.name ?? "");
    setType(account?.type ?? "bank");
    setInstitution(account?.institution ?? "");
    setOpeningBalance(account ? String(account.balance) : "");
    setNote(account?.note ?? "");
  }, [visible, account]);

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      if (isEditing) {
        await updateAccount({
          id: account.id,
          data: {
            name: name.trim(),
            type,
            institution: institution.trim() || null,
            note: note.trim() || null,
          },
        });
      } else {
        await createAccount({
          name: name.trim(),
          type,
          institution: institution.trim() || null,
          balance: Number(openingBalance) || 0,
          note: note.trim() || null,
        });
      }
      onClose();
    } catch (err: any) {
      showError(err?.response?.data ?? { message: err?.message ?? "Unknown error" });
    }
  };

  const isSaving = isCreating || isUpdating;
  const isComplete = !!name.trim();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  {isEditing ? "Edit Account" : "Add Account"}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Where your money physically sits
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-700/50">
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              className="px-6"
            >
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Name
                </Text>
                <TextInput
                  placeholder="e.g., Maybank Savings, TNG eWallet"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t)}
                      className={`rounded-lg px-3 py-2 border-2 ${
                        type === t ? "border-sky-500 bg-sky-500/10" : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <Text
                        className={`font-bold text-[12px] ${
                          type === t ? "text-sky-400" : "text-slate-300"
                        }`}
                      >
                        {ACCOUNT_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Institution (optional)
                </Text>
                <TextInput
                  placeholder="e.g., Maybank, Touch 'n Go"
                  value={institution}
                  onChangeText={setInstitution}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  {isEditing ? "Current Balance" : "Opening Balance (RM)"}
                </Text>
                {isEditing ? (
                  <View className="rounded-lg border border-slate-700 px-3 py-3 bg-slate-800/50">
                    <Text className="text-[13px] text-slate-400">
                      RM{account.balance.toLocaleString()} · edit via transactions, not directly
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center border border-slate-600 rounded-lg bg-slate-700/30 px-3 py-3">
                    <Text className="text-slate-400 mr-2">RM</Text>
                    <TextInput
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={openingBalance}
                      onChangeText={setOpeningBalance}
                      placeholderTextColor="#64748b"
                      className="flex-1 text-[13px] text-white"
                    />
                  </View>
                )}
              </View>

              <View className="mb-6">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Note (optional)
                </Text>
                <TextInput
                  placeholder="Any extra detail"
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 rounded-lg bg-slate-700/50 py-3 border border-slate-600"
                >
                  <Text className="text-center font-semibold text-slate-200 text-[14px]">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!isComplete || isSaving}
                  onPress={handleSave}
                  className={`flex-1 rounded-lg py-3 ${
                    isComplete && !isSaving
                      ? "bg-linear-to-r from-sky-500 to-sky-600"
                      : "bg-slate-600/30 opacity-50"
                  }`}
                >
                  <Text className="text-center font-semibold text-white text-[14px]">
                    {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Account"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
