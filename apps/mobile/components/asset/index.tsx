import { AddAssetModal } from "@/components/asset/add-asset";
import { useGetAssets } from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AssetSkeletonLoader } from "./skeleton-loader";

export function Asset() {
  const { data: assets, isLoading } = useGetAssets();
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">
            Overview
          </Text>
          <Text className="text-[32px] font-bold text-white mt-1">
            My Assets
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="rounded-full bg-linear-to-br from-emerald-500 to-emerald-600 px-6 py-3 shadow-lg active:scale-95"
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
            <AssetSkeletonLoader />
          ) : assets && assets.length > 0 ? (
            <View className="gap-3">
              {assets.map((asset) => {
                const { category, name, quantity, price, unit, goal } = asset;

                // Display value is either quantity or price, whichever is available
                const displayValue = quantity !== null ? quantity : price;
                const valueLabel = quantity !== null ? "Quantity" : "Price";
                const displayMode = quantity !== null ? "quantity" : "price";

                // Calculate goal progress if applicable
                const progress =
                  goal && displayValue !== null
                    ? Math.min((displayValue / goal) * 100, 100)
                    : 0;
                const hasGoal = goal && goal > 0;

                return (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/asset/[id]",
                        params: { id: String(asset.id) },
                      })
                    }
                    className="bg-slate-700/50 border border-slate-600/50 rounded-xl overflow-hidden active:bg-slate-700"
                  >
                    <View className="px-4 py-3">
                      {/* Header: Category and Name */}
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-1">
                          <View className="bg-emerald-500/20 rounded-full px-2.5 py-1 w-fit mb-2">
                            <Text className="text-[10px] font-bold text-emerald-400">
                              {category}
                            </Text>
                          </View>
                          <Text className="text-[16px] font-bold text-white">
                            {name}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[11px] font-semibold text-slate-400 mb-1">
                            {valueLabel}
                          </Text>
                          <Text className="text-[18px] font-bold text-emerald-400">
                            {displayValue !== null
                              ? displayValue.toLocaleString()
                              : "N/A"}
                          </Text>
                        </View>
                      </View>

                      {/* Quantity/Price with Unit */}
                      {displayValue !== null && displayValue > 0 && (
                        <Text className="text-[12px] text-slate-400 mb-3">
                          {displayValue} {unit}
                          {displayValue > 1 ? "s" : ""}
                        </Text>
                      )}

                      {/* Goal Progress Bar */}
                      {hasGoal && (
                        <View className="mt-2">
                          <View className="flex-row justify-between items-center mb-1.5">
                            <Text className="text-[10px] font-semibold text-slate-400">
                              Goal Progress
                            </Text>
                            <Text className="text-[10px] font-bold text-emerald-400">
                              {Math.round(progress)}%
                            </Text>
                          </View>
                          <View className="h-2 w-full rounded-full bg-slate-600/60 overflow-hidden">
                            <View
                              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400"
                              style={{ width: `${progress}%` }}
                            />
                          </View>
                          <Text className="text-[9px] text-slate-500 mt-1">
                            {displayValue?.toLocaleString()} /{" "}
                            {goal?.toLocaleString()} {unit}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="wallet-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">
                No assets yet
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Add your first asset to get started
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <AddAssetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
