import { CATEGORIES } from "@/components/asset/add-asset";
import { BooleanRenderer } from "@/components/BooleanRenderer";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";

import { AssetInterface, BaseAsset } from "@/interface/asset";
import {
  useDeleteAsset,
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
  const { category, goal, id, name, quantity, price, unit, status } = asset;

  const { mutateAsync } = useUpdateAssetById(id);
  const { mutateAsync: deleteAsset } = useDeleteAsset(id);

  const [isEdit, setIsEdit] = useState(false);
  const [editValueMode, setEditValueMode] = useState<"quantity" | "price">(
    quantity !== null ? "quantity" : "price",
  );
  const editAnimRef = useRef(new Animated.Value(0)).current;

  const [editAsset, setEditAsset] = useState<BaseAsset>({
    id,
    category,
    name,
    unit,
    quantity,
    price,
    goal,
  });

  const { error, isVisible, hideError, showError } = useErrorModal();

  // DELETE confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine which value to display
  const displayValue = quantity !== null ? quantity : price;
  const displayMode = quantity !== null ? "quantity" : "price";
  const displayLabel = quantity !== null ? "Quantity" : "Price";
  const displayUnit = quantity !== null ? unit : unit || "RM";

  // Calculate goal progress if applicable
  const progress =
    goal && displayMode === "quantity" ? (displayValue! / goal) * 100 : 0;

  useEffect(() => {
    Animated.timing(editAnimRef, {
      toValue: isEdit ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isEdit]);

  const updateAsset = async () => {
    const data: BaseAsset = {
      ...editAsset,
      quantity: editValueMode === "quantity" ? editAsset.quantity : null,
      price: editValueMode === "price" ? editAsset.price : null,
    };

    try {
      await mutateAsync(data);
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
              <View className="flex-row items-center gap-2">
                <View className="bg-emerald-500/20 rounded-full px-3 py-1">
                  <Text className="text-[11px] font-bold text-emerald-400">
                    {category}
                  </Text>
                </View>
                {status && (
                  <View className="bg-slate-500/20 rounded-full px-3 py-1">
                    <Text className="text-[10px] font-semibold text-slate-300">
                      {status}
                    </Text>
                  </View>
                )}
              </View>
            }
          />

          <View className="flex-row">
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

        {/* Value Mode Selector (Edit Mode Only) */}
        {isEdit && (
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
              What are you measuring?
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setEditValueMode("quantity")}
                className={`flex-1 rounded-lg py-2 px-3 border-2 ${
                  editValueMode === "quantity"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-600 bg-slate-700/30"
                }`}
              >
                <Text
                  className={`text-center text-[12px] font-semibold ${
                    editValueMode === "quantity"
                      ? "text-emerald-400"
                      : "text-slate-300"
                  }`}
                >
                  Quantity
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEditValueMode("price")}
                className={`flex-1 rounded-lg py-2 px-3 border-2 ${
                  editValueMode === "price"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-600 bg-slate-700/30"
                }`}
              >
                <Text
                  className={`text-center text-[12px] font-semibold ${
                    editValueMode === "price"
                      ? "text-emerald-400"
                      : "text-slate-300"
                  }`}
                >
                  Price
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Display Value & Unit (Non-Edit Mode) */}
        {!isEdit && displayValue !== null && (
          <View className="mb-4">
            <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              {displayLabel}
            </Text>
            <Text className="text-[20px] font-bold text-emerald-400">
              {displayValue.toLocaleString()}{" "}
              <Text className="text-slate-300 text-[14px]">{displayUnit}</Text>
            </Text>
          </View>
        )}

        {/* Edit Mode - Value & Unit Inputs */}
        {isEdit && (
          <View className="mb-4">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  {editValueMode === "quantity" ? "Quantity" : "Price"}
                </Text>
                <TextInput
                  value={
                    editValueMode === "quantity"
                      ? editAsset.quantity?.toString() || ""
                      : editAsset.price?.toString() || ""
                  }
                  onChangeText={(text) => {
                    const num = Number(text) || null;
                    if (editValueMode === "quantity") {
                      setEditAsset({ ...editAsset, quantity: num });
                    } else {
                      setEditAsset({ ...editAsset, price: num });
                    }
                  }}
                  placeholder={editValueMode === "quantity" ? "Qty" : "Price"}
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
                  placeholder={
                    editValueMode === "quantity" ? "e.g., gram" : "e.g., RM"
                  }
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
                />
              </View>
            </View>
          </View>
        )}

        {/* Goal Progress (if applicable) */}
        {!isEdit &&
          goal &&
          goal > 0 &&
          displayMode === "quantity" &&
          displayValue !== null && (
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
                {displayValue.toLocaleString()} / {goal.toLocaleString()} {unit}
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
                setEditAsset({ ...editAsset, goal: Number(text) || 0 })
              }
              placeholder="Target amount"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              className="border border-slate-500 rounded-lg py-2 px-2.5 text-white bg-slate-600/40 text-[12px]"
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
                  unit,
                  quantity,
                  price,
                  goal,
                });
                setEditValueMode(quantity !== null ? "quantity" : "price");
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
