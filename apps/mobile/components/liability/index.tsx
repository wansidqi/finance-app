import { useGetLiabilities } from "@/services/liability";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AddDebtModal } from "./add-liability";
import { LiabilitySkeletonLoader } from "./skeleton-loader";

export function Liability() {
  const { data = [], isLoading } = useGetLiabilities();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);

  const handleAddDebt = (newItem: any) => {
    setModalVisible(false);
  };

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">
            Overview
          </Text>
          <Text className="text-[32px] font-bold text-white mt-1">
            My Liabilities
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="rounded-full bg-linear-to-br from-rose-500 to-rose-600 px-6 py-3 shadow-lg active:scale-95"
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold text-[14px]">Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 py-10 my-5">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <LiabilitySkeletonLoader />
          ) : data && data.length > 0 ? (
            <View className="gap-3">
              {data.map((liability) => {
                const {
                  category,
                  name,
                  total_balance,
                  monthly_payment,
                  remaining_month,
                } = liability;
                const remainingMonths = remaining_month ?? 0;
                return (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/liability/[id]",
                        params: { id: String(liability.id) },
                      })
                    }
                    className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-4 flex-row items-center justify-between active:bg-slate-700"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className="bg-rose-500/20 rounded-full px-2.5 py-0.5">
                          <Text className="text-[10px] font-bold text-rose-400">
                            {category}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[16px] font-semibold text-white mb-1">
                        {name}
                      </Text>
                      <Text className="text-[12px] text-slate-400">
                        RM{monthly_payment?.toLocaleString() || "0"}/month •{" "}
                        {remainingMonths}{" "}
                        {remainingMonths === 1 ? "month" : "months"}
                      </Text>
                    </View>
                    <View className="items-end gap-2 ml-4">
                      <Text className="text-[16px] font-bold text-rose-400">
                        RM{total_balance?.toLocaleString() || "0"}
                      </Text>
                      <View className="bg-rose-500/20 rounded-lg px-2 py-1">
                        <Text className="text-[11px] font-bold text-rose-300">
                          {remainingMonths > 0 ? `${remainingMonths}m` : "Due"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="document-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">
                No liabilities yet
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Add your first liability to get started
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <AddDebtModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddDebt}
      />
    </View>
  );
}
