import { CATEGORIES } from "@/components/asset/add-asset";
import { BooleanRenderer } from "@/components/BooleanRenderer";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";

import { AssetInterface, BaseAsset } from "@/interface/asset";
import {
  useDeleteAsset,
  useGetAssets,
  useGetAssetsById,
  useUpdateAssetById,
} from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AssetDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: asset, isLoading } = useGetAssetsById(id as string);

  if (!id) return null;

  if (isLoading)
    return (
      <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center">
        <Text className="text-slate-300">Loading...</Text>
      </View>
    );

  if (!asset)
    return (
      <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center">
        <Text className="text-slate-300">Asset not found</Text>
      </View>
    );

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-row items-center justify-between px-3 py-12">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/asset")}
          className="p-2"
        >
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-white flex-1 ml-2">
          Asset Details
        </Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="px-6"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <AssetCard {...asset} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AssetCard(asset: AssetInterface) {
  const {
    category,
    goal,
    id,
    name,
    platform,
    quantity,
    price,
    unit,
    cost_basis,
    note,
    is_calculate,
    platform_total,
    status,
  } = asset;

  const { mutateAsync } = useUpdateAssetById(id);
  const { mutateAsync: deleteAsset } = useDeleteAsset(id);
  const { data: allAssets } = useGetAssets();

  const [isEdit, setIsEdit] = useState(false);
  const editAnimRef = useRef(new Animated.Value(0)).current;

  const [editAsset, setEditAsset] = useState<BaseAsset>({
    id,
    category,
    name,
    platform,
    unit,
    quantity,
    price,
    goal,
    cost_basis,
    note,
    is_calculate,
    platform_total,
  });

  const { error, isVisible, hideError, showError } = useErrorModal();

  // True when this asset shares its category+platform with another entry
  // (a multi-entry group), where profit % is aggregated on the platform
  // card in the list instead of shown per entry.
  const trimmedEditPlatform = editAsset.platform?.trim().toLowerCase() ?? "";
  const isGrouped =
    !!trimmedEditPlatform &&
    (allAssets ?? []).some(
      (a) =>
        a.id !== id &&
        a.category === editAsset.category &&
        a.platform?.trim().toLowerCase() === trimmedEditPlatform,
    );

  // DELETE confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate goal progress if applicable
  const progress = goal && price !== null ? (price / goal) * 100 : 0;

  const profitPercent =
    !isGrouped && cost_basis && cost_basis > 0 && price !== null
      ? ((price - cost_basis) / cost_basis) * 100
      : null;

  useEffect(() => {
    Animated.timing(editAnimRef, {
      toValue: isEdit ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isEdit]);

  const updateAsset = async () => {
    try {
      const payload: BaseAsset = { ...editAsset };
      if (platform_total !== null && editAsset.platform_total === null) {
        payload.clear_platform_total = true;
      }
      await mutateAsync(payload);
      setIsEdit(false);
    } catch (error: any) {
      const apiError = error?.response?.data ?? {
        message: error?.message ?? "Unknown error",
      };
      showError(apiError);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteAsset();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      showError(
        error?.response?.data ?? { message: error?.message ?? "Delete failed" },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Animated.View
      className="rounded-3xl overflow-hidden shadow-lg"
      style={{
        opacity: editAnimRef.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1],
        }),
      }}
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <ConfirmDeleteModal
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
        visible={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <View
        className={`${
          isEdit
            ? "bg-slate-700"
            : "bg-linear-to-br from-slate-700 to-slate-800"
        } px-6 py-6 border border-slate-600`}
      >
        {/* Category & Edit/Delete Buttons */}
        <View className="flex-row items-center justify-between mb-4">
          <BooleanRenderer
            condition={isEdit}
            editOn={
              <View className="flex-1 flex-row gap-2">
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() =>
                      setEditAsset({ ...editAsset, category: item as any })
                    }
                    className={`flex-1 rounded-lg py-2 ${
                      editAsset.category === item
                        ? "bg-emerald-500"
                        : "bg-slate-600"
                    }`}
                  >
                    <Text
                      className={`text-center text-[11px] font-bold ${
                        editAsset.category === item
                          ? "text-white"
                          : "text-slate-300"
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
            editOff={
              <View className="flex-1 flex-row items-center gap-2 flex-wrap pr-2">
                <View className="bg-emerald-500/20 rounded-full px-3 py-1">
                  <Text className="text-[11px] font-bold text-emerald-400">
                    {category}
                  </Text>
                </View>
                {platform && (
                  <View className="bg-slate-500/20 rounded-full px-3 py-1">
                    <Text className="text-[10px] font-semibold text-slate-300">
                      {platform}
                    </Text>
                  </View>
                )}
                {status && (
                  <View className="bg-slate-500/20 rounded-full px-3 py-1">
                    <Text className="text-[10px] font-semibold text-slate-300">
                      {status}
                    </Text>
                  </View>
                )}
                {!is_calculate && (
                  <View className="bg-amber-500/20 rounded-full px-3 py-1">
                    <Text className="text-[10px] font-semibold text-amber-400">
                      Excluded from Zakat
                    </Text>
                  </View>
                )}
                {platform_total !== null && (
                  <View className="bg-sky-500/20 rounded-full px-3 py-1">
                    <Text className="text-[10px] font-semibold text-sky-400">
                      Auto-tracked balance
                    </Text>
                  </View>
                )}
              </View>
            }
          />

          <View className="flex-row flex-shrink-0">
            <TouchableOpacity
              onPress={() => setIsEdit(!isEdit)}
              className={`ml-3 p-2.5 rounded-full ${
                isEdit ? "bg-red-500/20" : "bg-slate-600/50"
              }`}
            >
              <Ionicons
                name={isEdit ? "close" : "pencil"}
                size={18}
                color={isEdit ? "#ef4444" : "#cbd5e1"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              className={`ml-3 p-2.5 rounded-full ${
                isEdit ? "bg-red-500/20" : "bg-slate-600/50"
              }`}
            >
              <Ionicons name="trash-bin" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name */}
        <View className="mb-3">
          <BooleanRenderer
            condition={isEdit}
            editOff={
              <Text className="text-[18px] font-bold text-white">{name}</Text>
            }
            editOn={
              <TextInput
                value={editAsset.name}
                onChangeText={(text) =>
                  setEditAsset({ ...editAsset, name: text })
                }
                placeholder="Asset Name"
                placeholderTextColor="#94a3b8"
                className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
              />
            }
          />
        </View>

        {/* Platform */}
        <View className="mb-3">
          <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Platform / Account
          </Text>
          <BooleanRenderer
            condition={isEdit}
            editOff={
              <Text className="text-[13px] text-slate-200">
                {platform || "Not set"}
              </Text>
            }
            editOn={
              <TextInput
                value={editAsset.platform ?? ""}
                onChangeText={(text) =>
                  setEditAsset({ ...editAsset, platform: text || null })
                }
                placeholder="e.g., Maybank, Touch 'n Go, Luno"
                placeholderTextColor="#94a3b8"
                className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
              />
            }
          />
        </View>

        {/* Display Value (Non-Edit Mode) */}
        {!isEdit && price !== null && (
          <View className="mb-4">
            <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Current Value
            </Text>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-[20px] font-bold text-emerald-400">
                RM{price.toLocaleString()}
              </Text>
              {profitPercent !== null && (
                <Text
                  className={`text-[13px] font-semibold ${
                    profitPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {profitPercent >= 0 ? "+" : ""}
                  {profitPercent.toFixed(1)}%
                </Text>
              )}
            </View>
            {quantity !== null && (
              <Text className="text-[12px] text-slate-400 mt-1">
                {quantity} {unit}
              </Text>
            )}
            {platform_total !== null && (
              <Text className="text-[11px] text-sky-400 mt-1">
                = RM{platform_total.toLocaleString()} platform total − other
                entries on {platform}
              </Text>
            )}
            {isGrouped && cost_basis && cost_basis > 0 && (
              <Text className="text-[11px] text-slate-400 mt-1">
                Profit % is shown combined on the platform card in the list
              </Text>
            )}
            {note && (
              <Text className="text-[12px] text-slate-400 mt-2 italic">
                {note}
              </Text>
            )}
          </View>
        )}

        {/* Edit Mode - Value, Quantity, Unit, Cost Basis */}
        {isEdit && (
          <View className="mb-4 gap-3">
            <View>
              <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Current Value (RM)
              </Text>
              {editAsset.platform_total !== null &&
              editAsset.platform_total !== undefined ? (
                <View className="border border-slate-600 rounded-lg py-2 px-2.5 bg-slate-700/40">
                  <Text className="text-[12px] text-slate-400">
                    Auto-computed from platform total below
                  </Text>
                </View>
              ) : (
                <TextInput
                  value={editAsset.price?.toString() || ""}
                  onChangeText={(text) =>
                    setEditAsset({ ...editAsset, price: Number(text) || null })
                  }
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
                />
              )}
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Quantity (Optional)
                </Text>
                <TextInput
                  value={editAsset.quantity?.toString() || ""}
                  onChangeText={(text) =>
                    setEditAsset({
                      ...editAsset,
                      quantity: text ? Number(text) : null,
                    })
                  }
                  placeholder="e.g., 15"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Unit
                </Text>
                <TextInput
                  value={editAsset.unit}
                  onChangeText={(text) =>
                    setEditAsset({ ...editAsset, unit: text })
                  }
                  placeholder="e.g., gram, BTC, shares"
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
                />
              </View>
            </View>
            <View>
              <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Cost Basis (Optional)
              </Text>
              <TextInput
                value={editAsset.cost_basis?.toString() || ""}
                onChangeText={(text) =>
                  setEditAsset({
                    ...editAsset,
                    cost_basis: text ? Number(text) : null,
                  })
                }
                placeholder="How much you paid in total (RM)"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
              />
              <Text className="text-[10px] text-slate-400 mt-1.5">
                {isGrouped
                  ? "This platform has other entries — profit % will show combined on the platform card instead of here."
                  : "Used to calculate your profit % — leave empty to skip"}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Platform Total (Optional)
              </Text>
              <TextInput
                value={editAsset.platform_total?.toString() || ""}
                onChangeText={(text) =>
                  setEditAsset({
                    ...editAsset,
                    platform_total: text ? Number(text) : null,
                  })
                }
                placeholder="e.g., 433 — this platform's real balance"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                editable={!!editAsset.platform}
                className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
              />
              <Text className="text-[10px] text-slate-400 mt-1.5">
                {editAsset.platform
                  ? "Marks this as the platform's real total — value becomes this total minus your other entries on the same platform."
                  : "Set a Platform above first"}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Note (Optional)
              </Text>
              <TextInput
                value={editAsset.note ?? ""}
                onChangeText={(text) =>
                  setEditAsset({ ...editAsset, note: text || null })
                }
                placeholder="e.g., Holding for Ali, repay by Sept"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
                style={{ minHeight: 56, textAlignVertical: "top" }}
              />
            </View>
          </View>
        )}

        {/* Goal Progress (if applicable) */}
        {!isEdit && goal && goal > 0 && price !== null && (
          <View className="mt-2 mb-4">
            <View className="mb-2 flex-row justify-between">
              <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                GOAL PROGRESS
              </Text>
              <Text className="text-[11px] font-bold text-emerald-400">
                {Math.round(progress)}%
              </Text>
            </View>
            <View className="h-2.5 w-full rounded-full bg-slate-600 overflow-hidden">
              <Animated.View
                className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </View>
            <Text className="mt-2 text-[10px] text-slate-400">
              RM{price.toLocaleString()} / RM{goal.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Goal Edit Mode */}
        {isEdit && (
          <View className="mb-4">
            <Text className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              GOAL AMOUNT (Optional)
            </Text>
            <TextInput
              value={editAsset.goal?.toString() || ""}
              onChangeText={(text) =>
                setEditAsset({
                  ...editAsset,
                  goal: text ? Number(text) : null,
                })
              }
              placeholder="Target amount"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
            />
          </View>
        )}

        {/* Include in Zakat Calculation (Edit Mode) */}
        {isEdit && (
          <View className="mb-5 flex-row items-center justify-between rounded-lg border border-slate-500 bg-slate-600/40 px-3 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-[12px] font-bold text-slate-200">
                Include in Zakat Calculation
              </Text>
              <Text className="text-[10px] text-slate-400 mt-0.5">
                Turn off if this is money you're holding for someone else
              </Text>
            </View>
            <Switch
              value={editAsset.is_calculate}
              onValueChange={(value) =>
                setEditAsset({ ...editAsset, is_calculate: value })
              }
              trackColor={{ false: "#475569", true: "#10b981" }}
              thumbColor="#ffffff"
            />
          </View>
        )}

        {/* Timestamps */}
        {!isEdit && (
          <View className="mt-4 pt-4 border-t border-slate-600/50">
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] text-slate-400">
                Created: {new Date(asset.created_at).toLocaleDateString()}
              </Text>
              {asset.updated_at && (
                <Text className="text-[10px] text-slate-400">
                  Updated: {new Date(asset.updated_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Edit Buttons */}
        {isEdit && (
          <View className="mt-5 flex-row gap-2.5">
            <TouchableOpacity
              onPress={() => {
                setIsEdit(false);
                setEditAsset({
                  id,
                  category,
                  name,
                  platform,
                  unit,
                  quantity,
                  price,
                  goal,
                  cost_basis,
                  note,
                  is_calculate,
                  platform_total,
                });
              }}
              className="flex-1 bg-slate-600/40 rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-slate-200 text-[13px]">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={updateAsset}
              className="flex-1 bg-linear-to-r from-emerald-500 to-emerald-600 rounded-lg py-3 shadow-lg"
            >
              <Text className="text-center font-semibold text-white text-[13px]">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
