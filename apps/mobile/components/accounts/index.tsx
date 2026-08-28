import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { AccountInterface } from "@/interface/account";
import { useGetAccounts } from "@/services/account";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AddAccountModal } from "./add-account-modal";
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from "./category";

export function Accounts() {
  const { data = [], isLoading } = useGetAccounts();
  const [modalVisible, setModalVisible] = useState(false);
  const { error, isVisible, hideError } = useErrorModal();
  const router = useRouter();

  const active = useMemo(() => data.filter((a) => a.status === "ACTIVE"), [data]);
  const archived = useMemo(() => data.filter((a) => a.status === "ARCHIVED"), [data]);
  const totalBalance = useMemo(() => active.reduce((sum, a) => sum + a.balance, 0), [active]);

  const goToDetail = (accountId: number) =>
    router.push({
      pathname: "/account/[id]",
      params: { id: String(accountId) },
    });

  return (
    <View className="flex-1 bg-slate-950">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">Overview</Text>
          <Text className="text-[32px] font-bold text-white mt-1">Accounts</Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="rounded-full bg-sky-500 px-5 py-3 active:opacity-80"
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold text-[14px]">Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-6">
        {!isLoading && active.length > 0 && (
          <View className="mb-4 rounded-2xl bg-white/[0.035] border border-white/10 px-4 py-3.5 flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Balance
              </Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">
                Across {active.length} {active.length === 1 ? "account" : "accounts"}
              </Text>
            </View>
            <Text className="text-[20px] font-extrabold text-sky-400">
              RM{totalBalance.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        className="px-6 flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && active.length > 0 ? (
          <View className="gap-3">
            {active.map((account) => (
              <AccountListItem key={account.id} account={account} onPress={() => goToDetail(account.id)} />
            ))}
          </View>
        ) : (
          !isLoading && (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="wallet-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">No accounts yet</Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Add a bank, cash, or e-wallet account to start tracking transactions
              </Text>
            </View>
          )
        )}

        {archived.length > 0 && (
          <View className="mt-6">
            <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Archived
            </Text>
            <View className="gap-3">
              {archived.map((account) => (
                <AccountListItem
                  key={account.id}
                  account={account}
                  onPress={() => goToDetail(account.id)}
                  archived
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <AddAccountModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

function AccountListItem({
  account,
  onPress,
  archived,
}: {
  account: AccountInterface;
  onPress: () => void;
  archived?: boolean;
}) {
  const { name, type, institution, balance } = account;

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-white/[0.035] border border-white/10 rounded-xl px-4 py-4 flex-row items-center justify-between active:opacity-70 ${
        archived ? "opacity-60" : ""
      }`}
    >
      <View className="flex-row items-center flex-1">
        <View className="p-2.5 rounded-full bg-sky-500/15 mr-3">
          <Ionicons name={ACCOUNT_TYPE_ICONS[type]} size={18} color="#38bdf8" />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-white mb-0.5">{name}</Text>
          <Text className="text-[12px] text-slate-400">
            {ACCOUNT_TYPE_LABELS[type]}
            {institution ? ` · ${institution}` : ""}
          </Text>
        </View>
      </View>
      <Text className={`text-[16px] font-bold ml-4 ${balance < 0 ? "text-red-400" : "text-sky-400"}`}>
        RM{balance.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
}
